/**
 * SIH 2026 - PS 26122: Core Domain Data Models
 * Intelligent Data Capture & Schedule-Linking Layer for Oil India Limited
 */

export type DisciplineType = 'PIPING' | 'CIVIL' | 'ELECTRICAL' | 'INSTRUMENTATION' | 'MECHANICAL' | 'HSE';

export type ActivityStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'DELAYED';

export type EventStatus = 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'HOLD';

export type MatchDecision = 'AUTO_PROPOSED' | 'AUTO_ACCEPTED' | 'PLANNER_REVIEW' | 'APPROVED' | 'OVERRIDDEN' | 'UNMATCHED' | 'REJECTED';

export type DifficultyBucket = 'EASY' | 'PARAPHRASED' | 'NOISY' | 'AMBIGUOUS' | 'UNMATCHED';

export type DelayCategory = 
  | 'MATERIAL_HOLD' 
  | 'DRAWING_PENDING' 
  | 'MANPOWER_SHORTAGE' 
  | 'EQUIPMENT_BREAKDOWN' 
  | 'SITE_ACCESS' 
  | 'WEATHER_INCLEMENT' 
  | 'HSE_INSPECTION'
  | 'TEST_PACK_PENDING'
  | 'OTHER';

export interface ProjectInfo {
  id: string;
  code: string;
  name: string;
  client: string;
  location: string;
  contractor: string;
  baselineStartDate: string;
  baselineFinishDate: string;
  currentForecastFinish: string;
  dataDate: string; // schedule cut-off date (e.g., "2026-09-05")
  overallPlannedProgress: number; // e.g., 68.5%
  overallActualProgress: number; // e.g., 63.2%
  spi: number; // Schedule Performance Index e.g., 0.92
}

export interface WBSNode {
  id: string;
  code: string;
  name: string;
  level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  parentId?: string;
}

export interface Activity {
  id: string; // e.g., "PIP-L5-024"
  wbsId: string;
  wbsCode: string; // e.g. "02.03.04.05"
  name: string; // e.g., "Erect Line 24A"
  discipline: DisciplineType;
  area: string; // e.g., "North Unit", "Compressor Station"
  plannedStart: string; // "YYYY-MM-DD"
  plannedFinish: string; // "YYYY-MM-DD"
  plannedDurationDays: number;
  actualStart?: string;
  actualFinish?: string;
  actualDurationDays?: number;
  varianceDays: number; // positive = delay, negative = ahead
  percentComplete: number;
  status: ActivityStatus;
  isCritical: boolean;
  totalFloatDays: number;
  predecessors: string[]; // activity IDs
  successors: string[]; // activity IDs
  linkedEvidenceCount: number;
  lastUpdatedDate?: string;
}

export interface SourceDocument {
  id: string;
  fileName: string;
  type: 'DPR_TXT' | 'DPR_PDF' | 'EXCEL_SHEET' | 'VOICE_AGENT' | 'SITE_DIARY';
  discipline: DisciplineType | 'MULTI';
  uploadedAt: string;
  uploadedBy: string;
  rawText: string;
  extractedEventCount: number;
  parsingStatus: 'PARSED' | 'PENDING' | 'ERROR';
}

export interface ProgressEvent {
  id: string;
  sourceDocId: string;
  sourceType: string;
  rawTextExcerpt: string; // Exact sentence
  normalizedActivityText: string;
  discipline: DisciplineType;
  action: string; // e.g. "erection", "pouring", "hydrotest"
  objectOrTag: string; // e.g. "Line 24A", "Spool 24A-S03", "Foundation F-11"
  eventDate: string;
  status: EventStatus;
  quantity?: number;
  unit?: string;
  reportedDelayReason?: string;
  difficulty: DifficultyBucket;
  groundTruthActivityId?: string; // for benchmark accuracy validation
}

export interface CandidateActivityMatch {
  activityId: string;
  activityName: string;
  discipline: DisciplineType;
  wbsCode: string;
  area: string;
  semanticSimilarity: number; // 0 - 1
  metadataScore: number; // 0 - 1
  keywordScore: number; // 0 - 1
  finalConfidence: number; // calculated by formula
  ruleChecks: {
    disciplineMatch: boolean;
    areaMatch: boolean;
    dateWindowValid: boolean;
    statusTransitionValid: boolean;
  };
  explanation: string;
}

export interface MatchRecord {
  id: string;
  eventId: string;
  event: ProgressEvent;
  candidates: CandidateActivityMatch[];
  selectedCandidateId?: string;
  finalConfidence: number;
  decision: MatchDecision;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  isAutoLinked: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string; // e.g., "AI_MATCH_ENGINE", "Planner (Er. Sharma)", "Supervisor Field App"
  action: 'AUTO_LINK' | 'PLANNER_APPROVED' | 'PLANNER_OVERRIDDEN' | 'UNMATCHED_FLAGGED' | 'MANUAL_UPDATE' | 'IMPORT_SCHEDULE';
  activityId?: string;
  activityName?: string;
  oldValue: string;
  newValue: string;
  sourceDocId?: string;
  evidenceText?: string;
  confidence?: number;
}

export interface DelayRecord {
  id: string;
  activityId: string;
  activityName: string;
  discipline: DisciplineType;
  category: DelayCategory;
  varianceDays: number;
  rootCause: string;
  loggedDate: string;
  impactLevel: 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'MINOR';
}

export interface InstitutionalMemoryItem {
  id: string;
  workType: string;
  discipline: DisciplineType;
  plannedAvgDays: number;
  actualAvgDays: number;
  variancePercent: number;
  historicalSampleCount: number;
  topBottleneck: string;
  keyMitigation: string;
}

export interface BenchmarkMetrics {
  totalEvents: number;
  eventExtractionAccuracy: number; // %
  top1MatchAccuracy: number; // %
  top3Recall: number; // %
  autoLinkPrecision: number; // %
  unmatchedDetectionRate: number; // %
  avgLatencyMs: number;
  humanReviewRate: number; // %
}
