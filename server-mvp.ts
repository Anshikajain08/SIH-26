import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import { createHash } from 'node:crypto';
import XLSX from 'xlsx';
import { DatabaseSync } from 'node:sqlite';
import { GoogleGenAI } from '@google/genai';
import { initialActivities, mockProjectInfo } from './src/data/mockSchedule';
import { matchEventToActivities } from './src/services/scheduleMatchingEngine';
import { Activity, DisciplineType, ProgressEvent } from './src/types';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const port = Number(process.env.API_PORT || 3001);
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const database = new DatabaseSync(process.env.SQLITE_PATH || './oildex.sqlite');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
app.use(express.json({ limit: '1mb' }));

database.exec(`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, code TEXT NOT NULL, name TEXT NOT NULL, client TEXT, location TEXT, contractor TEXT, data_date TEXT NOT NULL, planned_progress REAL NOT NULL, actual_progress REAL NOT NULL, spi REAL NOT NULL);
CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, activity_id TEXT UNIQUE NOT NULL, name TEXT NOT NULL, discipline TEXT NOT NULL, area TEXT, planned_start TEXT NOT NULL, planned_finish TEXT NOT NULL, actual_start TEXT, actual_finish TEXT, percent_complete REAL NOT NULL DEFAULT 0, status TEXT NOT NULL, variance_days INTEGER NOT NULL DEFAULT 0, is_critical INTEGER NOT NULL DEFAULT 0, total_float_days INTEGER NOT NULL DEFAULT 0, linked_evidence_count INTEGER NOT NULL DEFAULT 0, wbs_code TEXT, FOREIGN KEY(project_id) REFERENCES projects(id));
CREATE TABLE IF NOT EXISTS source_documents (id TEXT PRIMARY KEY, filename TEXT NOT NULL, source_type TEXT NOT NULL, raw_text TEXT NOT NULL, uploaded_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS progress_events (id TEXT PRIMARY KEY, source_document_id TEXT NOT NULL, raw_text TEXT NOT NULL, normalized_activity_text TEXT NOT NULL, discipline TEXT NOT NULL, action TEXT NOT NULL, object_or_tag TEXT NOT NULL, event_date TEXT NOT NULL, status TEXT NOT NULL, quantity REAL, unit TEXT, extraction_confidence REAL NOT NULL, extraction_provider TEXT, difficulty TEXT NOT NULL DEFAULT 'EASY', FOREIGN KEY(source_document_id) REFERENCES source_documents(id));
CREATE TABLE IF NOT EXISTS match_records (id TEXT PRIMARY KEY, progress_event_id TEXT UNIQUE NOT NULL, selected_activity_id TEXT, final_confidence REAL NOT NULL, extraction_confidence REAL NOT NULL, combined_confidence REAL NOT NULL, decision TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(progress_event_id) REFERENCES progress_events(id));
CREATE TABLE IF NOT EXISTS match_candidates (id INTEGER PRIMARY KEY AUTOINCREMENT, match_record_id TEXT NOT NULL, activity_id TEXT NOT NULL, semantic_score REAL NOT NULL, metadata_score REAL NOT NULL, keyword_score REAL NOT NULL, final_confidence REAL NOT NULL, rank INTEGER NOT NULL, explanation TEXT NOT NULL, discipline_match INTEGER NOT NULL, area_match INTEGER NOT NULL, date_window_valid INTEGER NOT NULL, status_transition_valid INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, match_record_id TEXT NOT NULL, decision TEXT NOT NULL, reviewer TEXT NOT NULL, reason TEXT, reviewed_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, action TEXT NOT NULL, activity_id TEXT, source_document_id TEXT, old_value TEXT, new_value TEXT, confidence REAL, evidence_text TEXT, actor TEXT NOT NULL, timestamp TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS activity_vectors (activity_id TEXT PRIMARY KEY, vector TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS processing_cache (doc_hash TEXT PRIMARY KEY, source_type TEXT NOT NULL, events_json TEXT NOT NULL, matches_json TEXT NOT NULL, created_at TEXT NOT NULL);
`);
try { database.exec('ALTER TABLE progress_events ADD COLUMN difficulty TEXT NOT NULL DEFAULT \'EASY\''); } catch { /* column already exists */ }

database.prepare('INSERT OR IGNORE INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(mockProjectInfo.id, mockProjectInfo.code, mockProjectInfo.name, mockProjectInfo.client, mockProjectInfo.location, mockProjectInfo.contractor, mockProjectInfo.dataDate, mockProjectInfo.overallPlannedProgress, mockProjectInfo.overallActualProgress, mockProjectInfo.spi);
const seed = database.prepare('INSERT OR IGNORE INTO activities (id, project_id, activity_id, name, discipline, area, planned_start, planned_finish, actual_start, actual_finish, percent_complete, status, variance_days, is_critical, total_float_days, linked_evidence_count, wbs_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
for (const item of initialActivities) seed.run(item.id, mockProjectInfo.id, item.id, item.name, item.discipline, item.area, item.plannedStart, item.plannedFinish, item.actualStart || null, item.actualFinish || null, item.percentComplete, item.status, item.varianceDays, item.isCritical ? 1 : 0, item.totalFloatDays, item.linkedEvidenceCount, item.wbsCode);

// ---- Semantic retrieval: Gemini text embeddings (vector cache in SQLite) ----
const embedModel = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
const vectorCache: Record<string, number[]> = {};
const textVecCache = new Map<string, number[]>();
function embedKey(e: { normalizedActivityText: string; rawTextExcerpt: string }): string {
  return `${e.normalizedActivityText} ${e.rawTextExcerpt}`;
}
{
  const rows = database.prepare('SELECT activity_id, vector FROM activity_vectors').all() as any[];
  for (const row of rows) {
    try { const parsed = JSON.parse(row.vector); if (Array.isArray(parsed) && parsed.length) vectorCache[row.activity_id] = parsed; } catch { /* ignore corrupt row */ }
  }
}
async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured on the server.');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.embedContent({ model: embedModel, contents: texts });
  return (response.embeddings || []).map((entry) => entry.values || []);
}
function cosine(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (!denom) return 0;
  const c = dot / denom;
  return Number(Math.max(0, Math.min(1, (c + 1) / 2)).toFixed(3)); // map [-1,1] -> [0,1]
}
async function ensureActivityVectors(actList: Activity[]): Promise<void> {
  const missing = actList.filter((a) => !vectorCache[a.id] || !vectorCache[a.id].length);
  if (!missing.length) return;
  try {
    const vectors = await embedTexts(missing.map((a) => `${a.discipline} ${a.name} ${a.area}`));
    const upsert = database.prepare('INSERT OR REPLACE INTO activity_vectors (activity_id, vector, updated_at) VALUES (?, ?, ?)');
    vectors.forEach((vec, i) => {
      if (!vec || !vec.length) return;
      const id = missing[i].id;
      vectorCache[id] = vec;
      upsert.run(id, JSON.stringify(vec), new Date().toISOString());
    });
  } catch (error) {
    console.warn('Embedding service unavailable; falling back to deterministic text matching.', error instanceof Error ? error.message : error);
  }
}
async function matchEventEmbedded(event: ProgressEvent, actList: Activity[]): Promise<ReturnType<typeof matchEventToActivities>> {
  // Deterministic pre-filter: narrow to same-discipline candidates first so the
  // semantic step never compares against the whole schedule. Fall back to the
  // full set if the discipline subset is too small (protects against mis-tagged events).
  const disciplinePool = actList.filter((a) => a.discipline === event.discipline);
  const candidatePool = disciplinePool.length >= 2 ? disciplinePool : actList;
  await ensureActivityVectors(candidatePool);
  const key = embedKey(event);
  let eventVec: number[] | undefined = textVecCache.get(key);
  if (!eventVec || !eventVec.length) {
    try {
      const res = await embedTexts([key]);
      eventVec = res[0];
      if (eventVec && eventVec.length) textVecCache.set(key, eventVec);
    } catch { eventVec = undefined; }
  }
  const hasEventVec = !!eventVec && eventVec.length > 0;
  return matchEventToActivities(event, candidatePool, (ev, act) => {
    const av = vectorCache[act.id];
    return hasEventVec && av && av.length ? cosine(eventVec as number[], av) : undefined;
  });
}

async function preloadEventEmbeddings(events: Array<{ discipline: string; normalizedActivityText: string; rawTextExcerpt: string }>, actList: Activity[]): Promise<void> {
  // Warm activity vectors once and embed ALL events of a report in a SINGLE batched
  // Gemini call, so a multi-event DPR no longer incurs one round-trip per event.
  const needed = new Set<string>();
  for (const e of events) {
    const pool = actList.filter((a) => a.discipline === e.discipline);
    (pool.length >= 2 ? pool : actList).forEach((a) => needed.add(a.id));
  }
  const poolActivities = actList.filter((a) => needed.has(a.id));
  if (poolActivities.length) await ensureActivityVectors(poolActivities);
  const targets = events.filter((e) => !textVecCache.has(embedKey(e)));
  if (!targets.length) return;
  try {
    const vectors = await embedTexts(targets.map(embedKey));
    targets.forEach((e, i) => { if (vectors[i] && vectors[i].length) textVecCache.set(embedKey(e), vectors[i]); });
  } catch (error) {
    console.warn('Event embedding unavailable; matching will fall back to deterministic text similarity.', error instanceof Error ? error.message : error);
  }
}

// Warm the activity-vector cache in the background after boot so the first report
// in a live demo never pays the cold-embedding cost (cache also persists in SQLite).
setTimeout(() => { void ensureActivityVectors(initialActivities).catch(() => undefined); }, 250);

app.post('/api/system/reset-seed', (_req, res) => {
  try {
    database.exec('BEGIN');
    database.exec('DELETE FROM audit_logs; DELETE FROM reviews; DELETE FROM match_candidates; DELETE FROM match_records; DELETE FROM progress_events; DELETE FROM source_documents; DELETE FROM activities; DELETE FROM projects;');
    database.prepare('INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(mockProjectInfo.id, mockProjectInfo.code, mockProjectInfo.name, mockProjectInfo.client, mockProjectInfo.location, mockProjectInfo.contractor, mockProjectInfo.dataDate, mockProjectInfo.overallPlannedProgress, mockProjectInfo.overallActualProgress, mockProjectInfo.spi);
    for (const item of initialActivities) database.prepare('INSERT INTO activities (id, project_id, activity_id, name, discipline, area, planned_start, planned_finish, actual_start, actual_finish, percent_complete, status, variance_days, is_critical, total_float_days, linked_evidence_count, wbs_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(item.id, mockProjectInfo.id, item.id, item.name, item.discipline, item.area, item.plannedStart, item.plannedFinish, item.actualStart || null, item.actualFinish || null, item.percentComplete, item.status, item.varianceDays, item.isCritical ? 1 : 0, item.totalFloatDays, item.linkedEvidenceCount, item.wbsCode);
    database.exec('COMMIT');
    return res.json({ reset: true, activities: activities().length });
  } catch (error) { database.exec('ROLLBACK'); return res.status(500).json({ error: error instanceof Error ? error.message : 'Reset failed.' }); }
});

const extractionSchema = {
  type: 'OBJECT',
  properties: {
    events: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          rawTextExcerpt: { type: 'STRING' },
          normalizedActivityText: { type: 'STRING' },
          discipline: { type: 'STRING', enum: ['PIPING', 'CIVIL', 'ELECTRICAL', 'INSTRUMENTATION', 'MECHANICAL', 'HSE'] },
          action: { type: 'STRING' },
          objectOrTag: { type: 'STRING' },
          eventDate: { type: 'STRING' },
          status: { type: 'STRING', enum: ['STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'HOLD'] },
          quantity: { type: 'NUMBER', nullable: true },
          unit: { type: 'STRING', nullable: true },
          difficulty: { type: 'STRING', enum: ['EASY', 'PARAPHRASED', 'NOISY', 'AMBIGUOUS', 'UNMATCHED'] },
          extractionConfidence: { type: 'NUMBER' },
          extractionWarnings: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['rawTextExcerpt', 'normalizedActivityText', 'discipline', 'action', 'objectOrTag', 'eventDate', 'status', 'difficulty', 'extractionConfidence', 'extractionWarnings'],
      },
    },
  },
  required: ['events'],
};
interface GeminiEvent {
  rawTextExcerpt: string;
  normalizedActivityText: string;
  discipline: DisciplineType;
  action: string;
  objectOrTag: string;
  eventDate: string;
  status: ProgressEvent['status'];
  quantity?: number | null;
  unit?: string | null;
  difficulty: ProgressEvent['difficulty'];
  extractionConfidence: number;
  extractionWarnings: string[];
}
const clamp = (value: unknown) => Number(Math.max(0, Math.min(1, typeof value === 'number' && Number.isFinite(value) ? value : 0)).toFixed(3));
const rowActivity = (row: any): Activity => ({ id: row.id, wbsId: '', wbsCode: row.wbs_code || '', name: row.name, discipline: row.discipline, area: row.area || '', plannedStart: row.planned_start, plannedFinish: row.planned_finish, plannedDurationDays: Math.max(1, Math.round((Date.parse(row.planned_finish) - Date.parse(row.planned_start)) / 86400000)), actualStart: row.actual_start || undefined, actualFinish: row.actual_finish || undefined, varianceDays: row.variance_days, percentComplete: row.percent_complete, status: row.status, isCritical: Boolean(row.is_critical), totalFloatDays: row.total_float_days, predecessors: [], successors: [], linkedEvidenceCount: row.linked_evidence_count });
const activities = () => (database.prepare('SELECT * FROM activities ORDER BY planned_start, id').all() as any[]).map(rowActivity);
const eventFromRow = (row: any): ProgressEvent => { const doc = database.prepare('SELECT filename, source_type FROM source_documents WHERE id = ?').get(row.source_document_id) as any; const rawType = String(doc?.source_type || 'TXT').toUpperCase(); const typeLabel = ['TXT', 'PDF', 'XLS', 'XLSX'].includes(rawType) ? rawType : 'TXT'; return { id: row.id, sourceDocId: row.source_document_id, sourceType: doc ? `${typeLabel} — ${doc.filename}` : 'TXT — uploaded report', rawTextExcerpt: row.raw_text, normalizedActivityText: row.normalized_activity_text, discipline: row.discipline, action: row.action, objectOrTag: row.object_or_tag, eventDate: row.event_date, status: row.status, quantity: row.quantity ?? undefined, unit: row.unit ?? undefined, difficulty: row.difficulty || 'EASY', extractionConfidence: row.extraction_confidence, extractionProvider: row.extraction_provider === 'GEMINI' ? 'GEMINI' : 'DETERMINISTIC_FALLBACK' }; };
const matchFromRow = (row: any) => { const event = eventFromRow(database.prepare('SELECT * FROM progress_events WHERE id = ?').get(row.progress_event_id)); const candidates = database.prepare('SELECT * FROM match_candidates WHERE match_record_id = ? ORDER BY rank').all(row.id) as any[]; return { id: row.id, eventId: row.progress_event_id, event, candidates: candidates.map(candidate => ({ activityId: candidate.activity_id, activityName: (database.prepare('SELECT name FROM activities WHERE id = ?').get(candidate.activity_id) as any)?.name || candidate.activity_id, discipline: event.discipline, wbsCode: '', area: '', semanticSimilarity: candidate.semantic_score, metadataScore: candidate.metadata_score, keywordScore: candidate.keyword_score, finalConfidence: candidate.final_confidence, ruleChecks: { disciplineMatch: Boolean(candidate.discipline_match), areaMatch: Boolean(candidate.area_match), dateWindowValid: Boolean(candidate.date_window_valid), statusTransitionValid: Boolean(candidate.status_transition_valid) }, explanation: candidate.explanation })), selectedCandidateId: row.selected_activity_id || undefined, finalConfidence: row.final_confidence, extractionConfidence: row.extraction_confidence, combinedConfidence: row.combined_confidence, decision: row.decision, isAutoLinked: row.decision === 'AUTO_ACCEPTED' }; };

async function extract(rawText: string, eventDate: string) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured on the server.');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({ model, contents: `Extract every distinct field-progress event from this report. Return only JSON matching the schema. Never invent activity IDs. Use ${eventDate} if a date is missing.\n\n${rawText}`, config: { responseMimeType: 'application/json', responseSchema: extractionSchema, temperature: 0.1 } });
  const parsed = JSON.parse(response.text || '{"events":[]}');
  const allowedDisciplines = ['PIPING', 'CIVIL', 'ELECTRICAL', 'INSTRUMENTATION', 'MECHANICAL', 'HSE'];
  const allowedStatuses = ['STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'HOLD'];
  const events = (Array.isArray(parsed.events) ? parsed.events as GeminiEvent[] : []).map((item: GeminiEvent) => ({ ...item, eventDate: /^\d{4}-\d{2}-\d{2}$/.test(item.eventDate) ? item.eventDate : eventDate, extractionConfidence: clamp(item.extractionConfidence), extractionProvider: 'GEMINI' })).filter((item: GeminiEvent) => typeof item.rawTextExcerpt === 'string' && typeof item.normalizedActivityText === 'string' && allowedDisciplines.includes(item.discipline) && allowedStatuses.includes(item.status));
  if (!events.length) throw new Error('Gemini returned no valid progress events.');
  return events as Omit<ProgressEvent, 'id' | 'sourceDocId' | 'sourceType'>[];
}
function parseSchedule(file: Express.Multer.File) { if (file.originalname.toLowerCase().endsWith('.csv')) { const lines = file.buffer.toString('utf8').split(/\r?\n/).filter(Boolean); const headers = lines.shift()!.split(',').map(value => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')); return lines.map(line => Object.fromEntries(headers.map((header, index) => [header, line.split(',')[index]?.trim() || '']))); } const workbook = XLSX.read(file.buffer, { type: 'buffer' }); return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' }) as any[]; }
function normalizeRow(row: any) { const get = (...names: string[]) => { const key = Object.keys(row).find(item => names.includes(item.toLowerCase().replace(/[^a-z0-9]+/g, '_'))); return key ? String(row[key]).trim() : ''; }; const id = get('id', 'activity_id', 'activityid', 'task_id'); const name = get('name', 'activity_name', 'activity', 'task_name'); const start = get('planned_start', 'plannedstart', 'start', 'start_date', 'baseline_start'); const finish = get('planned_finish', 'plannedfinish', 'finish', 'finish_date', 'baseline_finish'); if (!id || !name || !start || !finish) throw new Error('Required activity columns are missing.'); const parseDate = (value: string) => { const time = Date.parse(value); if (Number.isNaN(time)) throw new Error(`Invalid date: ${value}`); return new Date(time).toISOString().slice(0, 10); }; const discipline = (get('discipline') || 'PIPING').toUpperCase(); if (!['PIPING', 'CIVIL', 'ELECTRICAL', 'INSTRUMENTATION', 'MECHANICAL', 'HSE'].includes(discipline)) throw new Error(`Invalid discipline: ${discipline}`); return { id, name, discipline, area: get('area', 'location') || 'Unspecified', start: parseDate(start), finish: parseDate(finish), progress: Number(get('percent_complete', 'progress') || 0), status: (get('status') || 'NOT_STARTED').toUpperCase(), critical: Number(get('is_critical', 'critical') || 0) ? 1 : 0, float: Number(get('total_float_days', 'float') || 0), wbs: get('wbs_code', 'wbs') }; }

app.get('/api/health', (_req, res) => res.json({ ok: true, provider: 'GEMINI', configured: Boolean(process.env.GEMINI_API_KEY), model, database: 'sqlite' }));
app.get('/api/activities', (_req, res) => res.json(activities()));
app.get('/api/documents', (_req, res) => res.json((database.prepare('SELECT * FROM source_documents ORDER BY uploaded_at DESC').all() as any[]).map(row => ({ id: row.id, fileName: row.filename, type: row.source_type, discipline: 'MULTI', uploadedAt: row.uploaded_at, uploadedBy: 'Uploaded File', rawText: row.raw_text, extractedEventCount: Number(database.prepare('SELECT COUNT(*) AS count FROM progress_events WHERE source_document_id = ?').get(row.id).count), parsingStatus: 'PARSED' }))));
app.get('/api/events', (_req, res) => res.json((database.prepare('SELECT * FROM progress_events ORDER BY rowid DESC').all() as any[]).map(eventFromRow)));
app.get('/api/matches', (_req, res) => res.json((database.prepare('SELECT * FROM match_records ORDER BY created_at DESC').all() as any[]).map(matchFromRow)));
app.get('/api/audit-logs', (_req, res) => res.json((database.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC').all() as any[]).map(row => ({ id: row.id, timestamp: row.timestamp, actor: row.actor, action: row.action, activityId: row.activity_id || undefined, oldValue: row.old_value || '', newValue: row.new_value || '', sourceDocId: row.source_document_id || undefined, evidenceText: row.evidence_text || undefined, confidence: row.confidence ?? undefined }))));

app.post('/api/import/schedule', upload.single('file'), (req, res) => { try { if (!req.file) return res.status(400).json({ error: 'Schedule file is required.' }); const rows = parseSchedule(req.file); const insert = database.prepare('INSERT INTO activities (id, project_id, activity_id, name, discipline, area, planned_start, planned_finish, percent_complete, status, is_critical, total_float_days, wbs_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'); let importedCount = 0; const errors: string[] = []; database.exec('BEGIN'); try { for (const row of rows) { try { const item = normalizeRow(row); insert.run(item.id, mockProjectInfo.id, item.id, item.name, item.discipline, item.area, item.start, item.finish, item.progress, item.status, item.critical, item.float, item.wbs); importedCount++; } catch (error) { errors.push(error instanceof Error ? error.message : 'Invalid row.'); } } database.exec('COMMIT'); } catch (error) { database.exec('ROLLBACK'); throw error; } return res.json({ importedCount, skippedCount: rows.length - importedCount, errors }); } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Schedule import failed.' }); } });

app.post('/api/documents', upload.single('file'), async (req, res) => { try { if (!req.file) return res.status(400).json({ error: 'TXT or PDF file is required.' }); const extension = req.file.originalname.toLowerCase().split('.').pop(); if (!['txt', 'pdf'].includes(extension || '')) return res.status(400).json({ error: 'Only TXT and PDF files are supported.' }); const rawText = extension === 'pdf' ? (await new PDFParse({ data: req.file.buffer }).getText()).text : req.file.buffer.toString('utf8'); if (!rawText.trim()) return res.status(422).json({ error: extension === 'pdf' ? 'Scanned PDF requires OCR and is not supported in MVP.' : 'The uploaded report is empty.' }); if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  const docHash = createHash('sha256').update(req.file.buffer).digest('hex');
  const cachedRun = database.prepare('SELECT * FROM processing_cache WHERE doc_hash = ?').get(docHash) as any;
  if (cachedRun && cachedRun.events_json && cachedRun.matches_json) {
    // Replay an identical, previously verified run — instant, zero AI calls.
    const documentId = `DOC-${Date.now()}`;
    database.prepare('INSERT INTO source_documents VALUES (?, ?, ?, ?, ?)').run(documentId, req.file.originalname, extension.toUpperCase(), rawText, new Date().toISOString());
    const rEvents: any[] = JSON.parse(cachedRun.events_json) || [];
    const rMatches: any[] = JSON.parse(cachedRun.matches_json) || [];
    const insEv = database.prepare('INSERT INTO progress_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insMa = database.prepare('INSERT INTO match_records VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const insCa = database.prepare('INSERT INTO match_candidates (match_record_id, activity_id, semantic_score, metadata_score, keyword_score, final_confidence, rank, explanation, discipline_match, area_match, date_window_valid, status_transition_valid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const replayEvents: any[] = [];
    const replayMatches: any[] = [];
    database.exec('BEGIN');
    try {
      for (let i = 0; i < rEvents.length; i++) {
        const eventId = `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const ev = { ...(rEvents[i] || {}), id: eventId, sourceDocId: documentId, sourceType: `Gemini ${model}` } as ProgressEvent;
        insEv.run(ev.id, documentId, ev.rawTextExcerpt, ev.normalizedActivityText, ev.discipline, ev.action, ev.objectOrTag, ev.eventDate, ev.status, ev.quantity ?? null, ev.unit ?? null, ev.extractionConfidence, 'GEMINI', ev.difficulty || 'EASY');
        const m = rMatches[i] || {};
        const matchId = `MAT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        insMa.run(matchId, eventId, m.selectedCandidateId || null, m.finalConfidence ?? 0, m.extractionConfidence ?? 0, m.combinedConfidence ?? 0, m.decision || 'PLANNER_REVIEW', new Date().toISOString());
        const cands: any[] = Array.isArray(m.candidates) ? m.candidates : [];
        cands.forEach((candidate, idx) => insCa.run(matchId, candidate.activityId, candidate.semanticSimilarity, candidate.metadataScore, candidate.keywordScore, candidate.finalConfidence, idx + 1, candidate.explanation, candidate.ruleChecks && candidate.ruleChecks.disciplineMatch ? 1 : 0, candidate.ruleChecks && candidate.ruleChecks.areaMatch ? 1 : 0, candidate.ruleChecks && candidate.ruleChecks.dateWindowValid ? 1 : 0, candidate.ruleChecks && candidate.ruleChecks.statusTransitionValid ? 1 : 0));
        replayEvents.push(ev);
        replayMatches.push({ ...m, id: matchId, event: { ...(m.event || {}), id: eventId, sourceDocId: documentId }, eventId });
      }
      database.exec('COMMIT');
    } catch (error) { database.exec('ROLLBACK'); throw error; }
    return res.status(201).json({ document: database.prepare('SELECT * FROM source_documents WHERE id = ?').get(documentId), events: replayEvents, matches: replayMatches });
  }
  const documentId = `DOC-${Date.now()}`; database.prepare('INSERT INTO source_documents VALUES (?, ?, ?, ?, ?)').run(documentId, req.file.originalname, extension.toUpperCase(), rawText, new Date().toISOString()); const extracted = await extract(rawText, String(req.body?.eventDate || mockProjectInfo.dataDate)); const insertEvent = database.prepare('INSERT INTO progress_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'); const insertMatch = database.prepare('INSERT INTO match_records VALUES (?, ?, ?, ?, ?, ?, ?, ?)'); const insertCandidate = database.prepare('INSERT INTO match_candidates (match_record_id, activity_id, semantic_score, metadata_score, keyword_score, final_confidence, rank, explanation, discipline_match, area_match, date_window_valid, status_transition_valid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'); const created: any[] = []; database.exec('BEGIN'); try { await preloadEventEmbeddings(extracted, activities()); for (const item of extracted) { const eventId = `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; const event = { ...item, id: eventId, sourceDocId: documentId, sourceType: `Gemini ${model}` } as ProgressEvent; insertEvent.run(event.id, documentId, event.rawTextExcerpt, event.normalizedActivityText, event.discipline, event.action, event.objectOrTag, event.eventDate, event.status, event.quantity ?? null, event.unit ?? null, event.extractionConfidence, 'GEMINI', event.difficulty || 'EASY'); const match = await matchEventEmbedded(event, activities()); insertMatch.run(match.id, event.id, match.selectedCandidateId || null, match.finalConfidence, match.extractionConfidence, match.combinedConfidence, match.decision, new Date().toISOString()); match.candidates.forEach((candidate, index) => insertCandidate.run(match.id, candidate.activityId, candidate.semanticSimilarity, candidate.metadataScore, candidate.keywordScore, candidate.finalConfidence, index + 1, candidate.explanation, candidate.ruleChecks.disciplineMatch ? 1 : 0, candidate.ruleChecks.areaMatch ? 1 : 0, candidate.ruleChecks.dateWindowValid ? 1 : 0, candidate.ruleChecks.statusTransitionValid ? 1 : 0)); created.push(match); } database.exec('COMMIT'); try { database.prepare('INSERT OR REPLACE INTO processing_cache (doc_hash, source_type, events_json, matches_json, created_at) VALUES (?, ?, ?, ?, ?)').run(docHash, extension.toUpperCase(), JSON.stringify(extracted), JSON.stringify(created), new Date().toISOString()); } catch (error) { console.warn('Processing cache write failed:', error instanceof Error ? error.message : error); } } catch (error) { database.exec('ROLLBACK'); throw error; } return res.status(201).json({ document: database.prepare('SELECT * FROM source_documents WHERE id = ?').get(documentId), events: extracted, matches: created }); } catch (error) { return res.status(502).json({ error: error instanceof Error ? error.message : 'Document processing failed.' }); } });
// ---- Structured progress-sheet ingestion (XLSX/CSV) — deterministic, no LLM wait ----
const DISC_ALIAS: Record<string, DisciplineType> = {
  piping: 'PIPING', pipe: 'PIPING', pip: 'PIPING',
  civil: 'CIVIL', civ: 'CIVIL', concrete: 'CIVIL', structural: 'CIVIL',
  electrical: 'ELECTRICAL', elec: 'ELECTRICAL', ele: 'ELECTRICAL',
  instrumentation: 'INSTRUMENTATION', inst: 'INSTRUMENTATION', instrument: 'INSTRUMENTATION',
  mechanical: 'MECHANICAL', mech: 'MECHANICAL', mec: 'MECHANICAL', rotating: 'MECHANICAL',
  hse: 'HSE', safety: 'HSE', esh: 'HSE',
};
function inferDiscipline(raw?: unknown): DisciplineType {
  const k = String(raw ?? '').trim().toLowerCase();
  return DISC_ALIAS[k] || (Object.keys(DISC_ALIAS).find((a) => k.includes(a)) ? DISC_ALIAS[Object.keys(DISC_ALIAS).find((a) => k.includes(a)) as string] : 'PIPING');
}
function inferEventStatus(raw?: unknown): ProgressEvent['status'] {
  const k = String(raw ?? '').toLowerCase();
  if (k.includes('complet') || k.includes('done') || k.includes('finish')) return 'COMPLETED';
  if (k.includes('hold') || k.includes('wait') || k.includes('pending') || k.includes('await')) return 'HOLD';
  if (k.includes('delay') || k.includes('behind') || k.includes('issue')) return 'DELAYED';
  if (k.includes('start')) return 'STARTED';
  return 'IN_PROGRESS';
}
function inferDifficulty(raw?: unknown): ProgressEvent['difficulty'] {
  const s = String(raw ?? '').trim().toUpperCase();
  return (['EASY', 'PARAPHRASED', 'NOISY', 'AMBIGUOUS', 'UNMATCHED'] as const).includes(s as ProgressEvent['difficulty']) ? s as ProgressEvent['difficulty'] : 'EASY';
}
function parseProgressSpreadsheet(buffer: Buffer, ext: string): Array<{ eventDate: string; discipline: DisciplineType; rawTextExcerpt: string; normalizedActivityText: string; action: string; objectOrTag: string; status: ProgressEvent['status']; quantity: number | null; unit: string | null; extractionConfidence: number; extractionProvider: string; difficulty: ProgressEvent['difficulty']; sourceType: string }> {
  let matrix: any[][] = [];
  if (ext === 'xlsx') {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    matrix = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as any[][];
  } else {
    matrix = buffer.toString('utf8').split(/\r?\n/).filter((l) => l.trim().length > 0)
      .map((l) => l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.trim().replace(/^"|"$/g, '')));
  }
  let headerIdx = -1;
  for (let i = 0; i < matrix.length; i++) {
    const joined = (matrix[i] || []).join(' ').toLowerCase();
    if (/\bdate\b/.test(joined) && /\b(progress|note|activity|work|description|remarks)\b/.test(joined)) { headerIdx = i; break; }
  }
  if (headerIdx < 0) return [];
  const header = (matrix[headerIdx] || []).map((c: unknown) => String(c ?? '').trim().toLowerCase());
  const findCol = (...names: string[]) => { for (const n of names) { const j = header.findIndex((x) => x === n || x.startsWith(n)); if (j >= 0) return j; } return -1; };
  const cDate = findCol('date'); const cDisc = findCol('discipline'); const cNote = findCol('progress note', 'progress', 'note', 'activity', 'description', 'work', 'remarks'); const cStatus = findCol('status'); const cDiff = findCol('difficulty');
  if (cNote < 0) return [];
  const rows: Array<{ eventDate: string; discipline: DisciplineType; rawTextExcerpt: string; normalizedActivityText: string; action: string; objectOrTag: string; status: ProgressEvent['status']; quantity: number | null; unit: string | null; extractionConfidence: number; extractionProvider: string; difficulty: ProgressEvent['difficulty']; sourceType: string }> = [];
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const row = matrix[i] || [];
    const note = String(row[cNote] === undefined || row[cNote] === null ? '' : row[cNote]).trim();
    if (!note) continue;
    rows.push({
      eventDate: (cDate >= 0 && row[cDate] != null) ? String(row[cDate]).trim() : '2026-09-05',
      discipline: inferDiscipline(cDisc >= 0 ? row[cDisc] : ''),
      rawTextExcerpt: note,
      normalizedActivityText: note,
      action: '', objectOrTag: '',
      status: inferEventStatus(cStatus >= 0 ? row[cStatus] : 'IN_PROGRESS'),
      quantity: null, unit: null,
      extractionConfidence: 1,
      extractionProvider: 'SHEET',
      difficulty: cDiff >= 0 ? inferDifficulty(row[cDiff]) : 'EASY',
      sourceType: ext === 'xlsx' ? 'XLSX progress sheet' : 'CSV progress sheet',
    });
  }
  return rows;
}

app.post('/api/import/progress', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Progress file is required.' });
    const ext = (req.file.originalname.toLowerCase().split('.').pop() || '');
    if (!['xlsx', 'csv'].includes(ext)) return res.status(400).json({ error: 'Progress sheet must be an XLSX or CSV file.' });
    const rows = parseProgressSpreadsheet(req.file.buffer, ext);
    if (!rows.length) return res.status(422).json({ error: 'No progress rows found. Expected a header row with Date, Discipline, Progress Note / Description, Status and optional Difficulty.' });
    const documentId = `DOC-${Date.now()}`;
    const rawText = rows.map((r) => `${r.eventDate} | ${r.discipline} | ${r.rawTextExcerpt} | ${r.status}`).join('\n');
    database.prepare('INSERT INTO source_documents VALUES (?, ?, ?, ?, ?)').run(documentId, req.file.originalname, ext.toUpperCase(), rawText, new Date().toISOString());
    const events: ProgressEvent[] = rows.map((r, idx) => ({ ...r, id: `EVT-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`, sourceDocId: documentId } as ProgressEvent));
    await preloadEventEmbeddings(events, activities());
    const insertEvent = database.prepare('INSERT INTO progress_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertMatch = database.prepare('INSERT INTO match_records VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const insertCandidate = database.prepare('INSERT INTO match_candidates (match_record_id, activity_id, semantic_score, metadata_score, keyword_score, final_confidence, rank, explanation, discipline_match, area_match, date_window_valid, status_transition_valid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const persisted: any[] = [];
    database.exec('BEGIN');
    try {
      for (const event of events) {
        insertEvent.run(event.id, documentId, event.rawTextExcerpt, event.normalizedActivityText, event.discipline, event.action, event.objectOrTag, event.eventDate, event.status, event.quantity ?? null, event.unit ?? null, event.extractionConfidence ?? 1, event.extractionProvider || 'SHEET', event.difficulty || 'EASY');
        const match = await matchEventEmbedded(event, activities());
        insertMatch.run(match.id, event.id, match.selectedCandidateId || null, match.finalConfidence, match.extractionConfidence, match.combinedConfidence, match.decision, new Date().toISOString());
        match.candidates.forEach((candidate, index) => insertCandidate.run(match.id, candidate.activityId, candidate.semanticSimilarity, candidate.metadataScore, candidate.keywordScore, candidate.finalConfidence, index + 1, candidate.explanation, candidate.ruleChecks.disciplineMatch ? 1 : 0, candidate.ruleChecks.areaMatch ? 1 : 0, candidate.ruleChecks.dateWindowValid ? 1 : 0, candidate.ruleChecks.statusTransitionValid ? 1 : 0));
        persisted.push(match);
      }
      database.exec('COMMIT');
    } catch (error) { database.exec('ROLLBACK'); throw error; }
    return res.status(201).json({ document: database.prepare('SELECT * FROM source_documents WHERE id = ?').get(documentId), events, matches: persisted });
  } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Progress sheet processing failed.' }); }
});

function applyReview(matchId: string, decision: string, body: any) { const match = database.prepare('SELECT * FROM match_records WHERE id = ?').get(matchId) as any; if (!match) throw new Error('Match not found.'); const event = database.prepare('SELECT * FROM progress_events WHERE id = ?').get(match.progress_event_id) as any; const activityId = body.activityId || match.selected_activity_id; const activity = activityId ? database.prepare('SELECT * FROM activities WHERE id = ?').get(activityId) as any : null; const now = new Date().toISOString(); database.exec('BEGIN'); try { if (decision === 'APPROVED' || decision === 'OVERRIDDEN') { if (!activity) throw new Error('No activity selected.'); const oldValue = JSON.stringify({ actual_start: activity.actual_start, actual_finish: activity.actual_finish, percent_complete: activity.percent_complete, status: activity.status }); let percent = activity.percent_complete; let status = activity.status; let actualStart = activity.actual_start; let actualFinish = activity.actual_finish; if (event.status === 'COMPLETED') { percent = 100; status = 'COMPLETED'; actualFinish = event.event_date; actualStart = actualStart || activity.planned_start; } else if (event.status === 'STARTED' || event.status === 'IN_PROGRESS') { percent = Math.max(percent, event.quantity || 70); status = 'IN_PROGRESS'; actualStart = actualStart || event.event_date; } else if (event.status === 'HOLD' || event.status === 'DELAYED') status = 'DELAYED'; const variance = actualFinish ? Math.round((Date.parse(actualFinish) - Date.parse(activity.planned_finish)) / 86400000) : activity.variance_days; database.prepare('UPDATE activities SET actual_start = ?, actual_finish = ?, percent_complete = ?, status = ?, variance_days = ?, linked_evidence_count = linked_evidence_count + 1 WHERE id = ?').run(actualStart, actualFinish, percent, status, variance, activity.id); database.prepare('INSERT INTO audit_logs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(`AUD-${Date.now()}`, decision === 'OVERRIDDEN' ? 'PLANNER_OVERRIDDEN' : 'PLANNER_APPROVED', activity.id, event.source_document_id, oldValue, JSON.stringify({ actual_start: actualStart, actual_finish: actualFinish, percent_complete: percent, status }), match.combined_confidence, event.raw_text, body.reviewer || 'Planner', now); database.prepare('UPDATE match_records SET selected_activity_id = ?, decision = ? WHERE id = ?').run(activity.id, decision, matchId); } else { database.prepare('UPDATE match_records SET decision = ? WHERE id = ?').run(decision, matchId); database.prepare('INSERT INTO audit_logs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(`AUD-${Date.now()}`, decision === 'REJECTED' ? 'PLANNER_REJECTED' : 'UNMATCHED_FLAGGED', activityId || null, event.source_document_id, `Decision: ${match.decision}`, `Decision: ${decision} (${body.reason || ''})`, match.combined_confidence, event.raw_text, body.reviewer || 'Planner', now); } database.prepare('INSERT INTO reviews VALUES (?, ?, ?, ?, ?, ?)').run(`REV-${Date.now()}`, matchId, decision, body.reviewer || 'Planner', body.reason || '', now); database.exec('COMMIT'); return matchFromRow(database.prepare('SELECT * FROM match_records WHERE id = ?').get(matchId)); } catch (error) { database.exec('ROLLBACK'); throw error; } }
app.post('/api/matches/:id/approve', (req, res) => { try { res.json(applyReview(req.params.id, 'APPROVED', req.body || {})); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Approval failed.' }); } });
app.post('/api/matches/:id/reject', (req, res) => { try { res.json(applyReview(req.params.id, 'REJECTED', req.body || {})); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Rejection failed.' }); } });
app.post('/api/matches/:id/override', (req, res) => { try { res.json(applyReview(req.params.id, 'OVERRIDDEN', req.body || {})); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Override failed.' }); } });
app.post('/api/matches/:id/unmatched', (req, res) => { try { res.json(applyReview(req.params.id, 'UNMATCHED', req.body || {})); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Flagging failed.' }); } });
app.listen(port, () => console.log(`Oildex persistent API listening on http://localhost:${port}`));
