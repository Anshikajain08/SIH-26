import { SourceDocument, ProgressEvent } from '../types';

export const mockSourceDocuments: SourceDocument[] = [
  {
    id: 'DOC-DPR-2026-09-05',
    fileName: 'DPR_OIL_DNPL_ShiftA_2026-09-05.pdf',
    type: 'DPR_PDF',
    discipline: 'MULTI',
    uploadedAt: '2026-09-05 18:30 IST',
    uploadedBy: 'Rajiv Baruah (Resident Site Engineer)',
    extractedEventCount: 4,
    parsingStatus: 'PARSED',
    rawText: `OIL INDIA LIMITED - DULIAJAN-NUMALIGARH PIPELINE PROJECT
DAILY PROGRESS REPORT (DPR) - SHIFT A & B
Date: 05-SEP-2026 | Location: North Unit & Substation 02 | Weather: Clear (32°C)

1. PIPING SECTION:
Piping crew completed erection of spool 24A-S03 on 5 Sep. Line 24A erection ongoing with 4 welders; remaining 2 tie-in joints fit-up in progress. Hydrotest for Line 24A not started due to test pack document pending clearance from Third Party Inspection (TPI).

2. CIVIL SECTION:
F11 foundation concrete poured successfully today up to grade level. 42 cu.m M35 design mix placed with 2 transit mixers. Curing burlap wrap applied.

3. ELECTRICAL & INSTRUMENTATION:
Substation crew commenced pulling HT power cable Feeder-01 towards compressor motor terminal. Approximately 120m laid in tray.

4. SCOPE VARIATION / UNPLANNED SITE ACTION:
Heavy seepage noted near Valve Pit 03. Site team initiated emergency trench dewatering with 5HP pump and laid 80m temporary bypass hose.`
  },
  {
    id: 'DOC-XLS-PIPING-TRACKER',
    fileName: 'OIL_Piping_Spool_Erection_Log_05Sep.xlsx',
    type: 'EXCEL_SHEET',
    discipline: 'PIPING',
    uploadedAt: '2026-09-05 16:15 IST',
    uploadedBy: 'Devajit Saikia (Piping Supervisor)',
    extractedEventCount: 2,
    parsingStatus: 'PARSED',
    rawText: `[EXCEL_SHEET: SHT_PIPING_PROGRESS]
Line_Tag | Spool_ID | Dia_Inch | Status | Actual_Date | Welder_ID | NDT_Status
Line 24A | 24A-S01  | 16"      | ERECTED| 2026-09-04  | W-04      | RT ACCEPTED
Line 24A | 24A-S03  | 16"      | ERECTED| 2026-09-05  | W-09      | RT ACCEPTED
Line 28B | 28B-H01  | 12"      | FIT-UP | 2026-09-05  | W-12      | PENDING
Line 28B | 28B-H02  | 12"      | FIT-UP | 2026-09-05  | W-12      | PENDING`
  },
  {
    id: 'DOC-SITE-DIARY-01',
    fileName: 'Site_Superintendent_Audio_Log_05Sep.txt',
    type: 'SITE_DIARY',
    discipline: 'MULTI',
    uploadedAt: '2026-09-05 19:40 IST',
    uploadedBy: 'Mukesh Gogoi (Lead Superintendent)',
    extractedEventCount: 2,
    parsingStatus: 'PARSED',
    rawText: `VOICE LOG / DIARY TRANSCRIPTION (Demo transcript):
"Line 24A piping erection crew is still continuing alignment work at North rack. We finished spool 24A-S03 this afternoon. However, hydro test for 24A will slip by at least 1 day because TPI inspector rejected test pack weld book. Meanwhile foundation F11 pour is 100% complete and inspected."`
  }
];

export const mockInitialEvents: ProgressEvent[] = [
  // 1. Ambiguous Case (The Core SIH PS 26122 example - Page 5 & 11)
  {
    id: 'EVT-2026-001',
    sourceDocId: 'DOC-DPR-2026-09-05',
    sourceType: 'DPR (PDF)',
    rawTextExcerpt: 'Piping crew completed erection of spool 24A-S03 on 5 Sep. Line 24A erection ongoing with 4 welders; remaining 2 tie-in joints fit-up in progress.',
    normalizedActivityText: 'Erection of spool 24A-S03 for Line 24A piping, ongoing alignment and joint fit-up',
    discipline: 'PIPING',
    action: 'ERECTION & FIT-UP',
    objectOrTag: 'Line 24A / Spool 24A-S03',
    eventDate: '2026-09-05',
    status: 'IN_PROGRESS',
    quantity: 70,
    unit: '%',
    difficulty: 'AMBIGUOUS',
    groundTruthActivityId: 'PIP-L5-024',
  },

  // 2. Easy Case (Civil pour)
  {
    id: 'EVT-2026-002',
    sourceDocId: 'DOC-DPR-2026-09-05',
    sourceType: 'DPR (PDF)',
    rawTextExcerpt: 'F11 foundation concrete poured successfully today up to grade level. 42 cu.m M35 design mix placed with 2 transit mixers.',
    normalizedActivityText: 'Pour Foundation F-11 Concrete completed up to grade level',
    discipline: 'CIVIL',
    action: 'POUR CONCRETE',
    objectOrTag: 'Foundation F-11',
    eventDate: '2026-09-05',
    status: 'COMPLETED',
    quantity: 42,
    unit: 'm³',
    difficulty: 'EASY',
    groundTruthActivityId: 'CIV-L5-011',
  },

  // 3. Noisy / Delay Case (Hydrotest postponed)
  {
    id: 'EVT-2026-003',
    sourceDocId: 'DOC-DPR-2026-09-05',
    sourceType: 'DPR (PDF)',
    rawTextExcerpt: 'Hydrotest for Line 24A not started due to test pack document pending clearance from Third Party Inspection (TPI).',
    normalizedActivityText: 'Hydrotest Line 24A pressure test not started, hold on test pack clearance',
    discipline: 'PIPING',
    action: 'HYDROTEST',
    objectOrTag: 'Line 24A',
    eventDate: '2026-09-05',
    status: 'HOLD',
    reportedDelayReason: 'Test pack clearance pending with Third Party Inspector (TPI)',
    difficulty: 'NOISY',
    groundTruthActivityId: 'PIP-L5-025',
  },

  // 4. Paraphrased Case (Electrical cable pull)
  {
    id: 'EVT-2026-004',
    sourceDocId: 'DOC-DPR-2026-09-05',
    sourceType: 'DPR (PDF)',
    rawTextExcerpt: 'Substation crew commenced pulling HT power cable Feeder-01 towards compressor motor terminal. Approximately 120m laid in tray.',
    normalizedActivityText: 'Commenced pulling HT power cable Feeder-01 for K-101 motor',
    discipline: 'ELECTRICAL',
    action: 'CABLE PULLING',
    objectOrTag: 'Feeder-01 / Compressor K-101',
    eventDate: '2026-09-05',
    status: 'STARTED',
    quantity: 120,
    unit: 'm',
    difficulty: 'PARAPHRASED',
    groundTruthActivityId: 'ELE-L5-014',
  },

  // 5. Unmatched / Scope Variation Case (Page 3 & 11)
  {
    id: 'EVT-2026-005',
    sourceDocId: 'DOC-DPR-2026-09-05',
    sourceType: 'DPR (PDF)',
    rawTextExcerpt: 'Heavy seepage noted near Valve Pit 03. Site team initiated emergency trench dewatering with 5HP pump and laid 80m temporary bypass hose.',
    normalizedActivityText: 'Emergency dewatering and temporary seepage bypass hose at Valve Pit 03',
    discipline: 'CIVIL',
    action: 'DEWATERING & BYPASS',
    objectOrTag: 'Valve Pit 03 / Trench Seepage',
    eventDate: '2026-09-05',
    status: 'IN_PROGRESS',
    quantity: 80,
    unit: 'm',
    difficulty: 'UNMATCHED',
    groundTruthActivityId: undefined, // No planned activity in baseline! Must be flagged for scope change
  },

  // 6. Excel Spool Log (Piping 28B Header)
  {
    id: 'EVT-2026-006',
    sourceDocId: 'DOC-XLS-PIPING-TRACKER',
    sourceType: 'Excel Spool Log',
    rawTextExcerpt: 'Line 28B | 28B-H01 & H02 | 12" | FIT-UP | 2026-09-05 | Welder W-12 | PENDING',
    normalizedActivityText: 'Fit-up and joint tacking for Line 28B fuel gas header spools',
    discipline: 'PIPING',
    action: 'FIT-UP & TACKING',
    objectOrTag: 'Line 28B / Spool 28B-H01',
    eventDate: '2026-09-05',
    status: 'IN_PROGRESS',
    quantity: 50,
    unit: '%',
    difficulty: 'PARAPHRASED',
    groundTruthActivityId: 'PIP-L5-028',
  }
];

export const presetBenchmarkReports = [
  {
    title: 'SIH PS 26122 Core Demo Bundle (4 Difficulty Buckets)',
    description: 'Includes Line 24A ambiguous spool erection, Foundation F11 pour, Hydrotest delay hold, and Valve Pit dewatering scope variance.',
    sourceDocId: 'DOC-DPR-2026-09-05'
  },
  {
    title: 'Discipline Excel Spreadsheet (Piping Spool Log)',
    description: 'Tabular progress log from piping contractor with spool numbers and welder IDs.',
    sourceDocId: 'DOC-XLS-PIPING-TRACKER'
  },
  {
    title: 'Site Diary Audio Transcription (Voice Agent)',
    description: 'Spoken supervisor field notes transcribed via speech recognition.',
    sourceDocId: 'DOC-SITE-DIARY-01'
  }
];
