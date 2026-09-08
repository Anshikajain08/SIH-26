import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Activity, 
  AuditLogEntry, 
  DelayRecord, 
  InstitutionalMemoryItem, 
  MatchRecord, 
  ProgressEvent, 
  ProjectInfo, 
  SourceDocument, 
  WBSNode 
} from '../types';
import { initialActivities, mockProjectInfo, mockWBSNodes } from '../data/mockSchedule';
import { mockInitialEvents, mockSourceDocuments } from '../data/syntheticDPRs';
import { initialAuditLogs, initialDelayRecords, initialInstitutionalMemory } from '../data/analyticsAndMemory';
import { matchEventToActivities } from '../services/scheduleMatchingEngine';
import { api } from '../services/api';

interface ProjectContextType {
  projectInfo: ProjectInfo;
  activities: Activity[];
  wbsNodes: WBSNode[];
  documents: SourceDocument[];
  events: ProgressEvent[];
  matches: MatchRecord[];
  auditLogs: AuditLogEntry[];
  delays: DelayRecord[];
  institutionalMemory: InstitutionalMemoryItem[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedActivityId: string | null;
  setSelectedActivityId: (id: string | null) => void;
  selectedMatchId: string | null;
  setSelectedMatchId: (id: string | null) => void;
  selectedDisciplineFilter: string;
  setSelectedDisciplineFilter: (d: string) => void;
  demoTourActive: boolean;
  setDemoTourActive: (active: boolean) => void;
  
  // Actions
  approveMatch: (matchId: string, overrideCandidateId?: string, reviewNote?: string) => void;
  overrideMatch: (matchId: string, newActivityId: string, reason: string) => void;
  rejectMatch: (matchId: string, reason: string) => void;
  flagUnmatched: (matchId: string, note: string) => void;
  ingestNewDocument: (doc: SourceDocument, extractedEvents: ProgressEvent[]) => void;
  uploadDocument: (file: File) => Promise<{ document: SourceDocument; events: ProgressEvent[]; matches: MatchRecord[] }>;
  importSchedule: (file: File) => Promise<{ importedCount: number; skippedCount: number; errors: string[] }>;
  processTimeAgentInput: (text: string) => { event: ProgressEvent; match: MatchRecord };
  resetToBenchmark: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(mockProjectInfo);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [wbsNodes] = useState<WBSNode[]>(mockWBSNodes);
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [delays, setDelays] = useState<DelayRecord[]>(initialDelayRecords);
  const [institutionalMemory] = useState<InstitutionalMemoryItem[]>(initialInstitutionalMemory);
  
  const [activeTab, setActiveTab] = useState<string>('import');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedDisciplineFilter, setSelectedDisciplineFilter] = useState<string>('ALL');
  const [demoTourActive, setDemoTourActive] = useState<boolean>(false);

  const reloadBackend = async () => {
    const [nextActivities, nextDocuments, nextEvents, nextMatches, nextAuditLogs] = await Promise.all([
      api.activities(),
      api.documents(),
      api.events(),
      api.matches(),
      api.auditLogs(),
    ]);
    setActivities(nextActivities);
    setDocuments(nextDocuments);
    setEvents(nextEvents);
    setMatches(nextMatches);
    setAuditLogs(nextAuditLogs);
  };

  // Load persistent state. Seeded mock data remains available for the demo/reset path.
  useEffect(() => {
    reloadBackend().catch(error => console.error('Persistent backend unavailable:', error));
  }, []);

  /**
   * Deterministic schedule update upon Planner Approval or High-Confidence Auto-Link
   * Note: The LLM does NOT write to the schedule directly. Application logic executes this!
   */
  const approveMatch = (matchId: string, overrideCandidateId?: string, reviewNote?: string) => {
    void api.review(matchId, overrideCandidateId ? 'override' : 'approve', { activityId: overrideCandidateId, reason: reviewNote })
      .then(reloadBackend)
      .catch(error => console.error('Approval failed:', error));
    return;
    /* Demo-only legacy state path retained below for reset/demo compatibility. */
    /* eslint-disable no-unreachable */
    const targetMatch = matches.find(m => m.id === matchId);
    if (!targetMatch) return;

    const activityId = overrideCandidateId || targetMatch.selectedCandidateId || targetMatch.candidates[0]?.activityId;
    if (!activityId) return;

    const targetActivity = activities.find(a => a.id === activityId);
    if (!targetActivity) return;

    const event = targetMatch.event;
    const oldStatus = `Status: ${targetActivity.status} (${targetActivity.percentComplete}%)`;
    
    // Determine updated progress values deterministically
    let newPercent = targetActivity.percentComplete;
    let newStatus = targetActivity.status;
    let newActualStart = targetActivity.actualStart;
    let newActualFinish = targetActivity.actualFinish;

    if (event.status === 'COMPLETED') {
      newPercent = 100;
      newStatus = 'COMPLETED';
      newActualFinish = event.eventDate;
      if (!newActualStart) newActualStart = targetActivity.plannedStart;
    } else if (event.status === 'STARTED' || event.status === 'IN_PROGRESS') {
      newPercent = Math.max(targetActivity.percentComplete, event.quantity || 70);
      newStatus = 'IN_PROGRESS';
      if (!newActualStart) newActualStart = event.eventDate;
    } else if (event.status === 'HOLD' || event.status === 'DELAYED') {
      newStatus = 'DELAYED';
    }

    // Calculate variance
    let varianceDays = targetActivity.varianceDays;
    if (newActualFinish) {
      const plannedTime = new Date(targetActivity.plannedFinish).getTime();
      const actualTime = new Date(newActualFinish).getTime();
      varianceDays = Math.round((actualTime - plannedTime) / (1000 * 60 * 60 * 24));
    } else if (event.status === 'DELAYED' || event.reportedDelayReason) {
      varianceDays = Math.max(varianceDays, 1);
    }

    // Update activity state
    setActivities(prev => prev.map(act => {
      if (act.id === activityId) {
        return {
          ...act,
          status: newStatus,
          percentComplete: newPercent,
          actualStart: newActualStart,
          actualFinish: newActualFinish,
          varianceDays,
          linkedEvidenceCount: act.linkedEvidenceCount + 1,
          lastUpdatedDate: event.eventDate,
        };
      }
      return act;
    }));

    // Update match state
    setMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          decision: overrideCandidateId ? 'OVERRIDDEN' : 'APPROVED',
          selectedCandidateId: activityId,
          reviewedBy: 'Er. A. Sharma (Lead Project Controls)',
          reviewedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' IST',
          reviewNotes: reviewNote || 'Approved after reviewing source DPR sentence and technical constraints.',
        };
      }
      return m;
    }));

    // Append tamper-evident audit record
    const newAuditEntry: AuditLogEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' IST',
      actor: 'Planner (Er. Sharma - Project Controls)',
      action: overrideCandidateId ? 'PLANNER_OVERRIDDEN' : 'PLANNER_APPROVED',
      activityId,
      activityName: targetActivity.name,
      oldValue: oldStatus,
      newValue: `Status: ${newStatus} (${newPercent}%), Actual Finish: ${newActualFinish || 'In Progress'}, Variance: ${varianceDays > 0 ? `+${varianceDays}d` : `${varianceDays}d`}`,
      sourceDocId: event.sourceDocId,
      evidenceText: event.rawTextExcerpt,
      confidence: targetMatch.finalConfidence,
    };
    setAuditLogs(prev => [newAuditEntry, ...prev]);

    // Recalculate project summary stats
    setProjectInfo(prev => ({
      ...prev,
      overallActualProgress: Number((prev.overallActualProgress + 0.4).toFixed(1)),
      spi: Number((((prev.overallActualProgress + 0.4) / prev.overallPlannedProgress)).toFixed(2)),
    }));
    /* eslint-enable no-unreachable */
  };

  const overrideMatch = (matchId: string, newActivityId: string, reason: string) => {
    approveMatch(matchId, newActivityId, reason);
  };

  const rejectMatch = (matchId: string, reason: string) => {
    void api.review(matchId, 'reject', { reason }).then(reloadBackend).catch(error => console.error('Rejection failed:', error));
    return;
    /* Legacy demo-only state path. */
    setMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          decision: 'REJECTED',
          reviewedBy: 'Er. A. Sharma (Lead Project Controls)',
          reviewedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' IST',
          reviewNotes: reason || 'Rejected: Does not represent valid executable schedule progress.',
        };
      }
      return m;
    }));

    const targetMatch = matches.find(m => m.id === matchId);
    if (targetMatch) {
      setAuditLogs(prev => [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' IST',
          actor: 'Planner (Er. Sharma)',
          action: 'PLANNER_APPROVED',
          oldValue: 'Status: PENDING_REVIEW',
          newValue: `Decision: REJECTED (${reason})`,
          evidenceText: targetMatch.event.rawTextExcerpt,
        },
        ...prev
      ]);
    }
  };

  const flagUnmatched = (matchId: string, note: string) => {
    void api.review(matchId, 'unmatched', { reason: note }).then(reloadBackend).catch(error => console.error('Unmatched update failed:', error));
    return;
    /* Legacy demo-only state path. */
    setMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          decision: 'UNMATCHED',
          reviewedBy: 'Er. A. Sharma (Lead Project Controls)',
          reviewedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' IST',
          reviewNotes: note || 'Flagged as new site activity / out-of-scope variation. Sent to Change Management.',
        };
      }
      return m;
    }));

    const targetMatch = matches.find(m => m.id === matchId);
    if (targetMatch) {
      setAuditLogs(prev => [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' IST',
          actor: 'Planner (Er. Sharma)',
          action: 'UNMATCHED_FLAGGED',
          oldValue: 'Status: PROPOSED',
          newValue: `Sent to Scope Variation Register: ${note}`,
          evidenceText: targetMatch.event.rawTextExcerpt,
        },
        ...prev
      ]);
    }
  };

  const uploadDocument = async (file: File) => {
    const isSheet = /\.(xlsx|csv)$/i.test(file.name);
    const result = isSheet ? await api.uploadProgress(file) : await api.uploadDocument(file);
    await reloadBackend();
    return result;
  };

  const importSchedule = async (file: File) => {
    const result = await api.uploadSchedule(file);
    await reloadBackend();
    return result;
  };

  const ingestNewDocument = (doc: SourceDocument, extractedEvents: ProgressEvent[]) => {
    setDocuments(prev => [doc, ...prev]);
    setEvents(prev => [...extractedEvents, ...prev]);
    
    // Match each newly extracted event against current activities
    const newMatches = extractedEvents.map(evt => matchEventToActivities(evt, activities));
    setMatches(prev => [...newMatches, ...prev]);

    // Auto-update high-confidence events if ≥0.90 and EASY
    newMatches.forEach(m => {
      if (m.decision === 'AUTO_ACCEPTED' && m.selectedCandidateId) {
        approveMatch(m.id, m.selectedCandidateId, 'High-confidence automated link accepted by policy.');
      }
    });
  };

  const processTimeAgentInput = (text: string) => {
    const lower = text.toLowerCase();
    let discipline: any = 'PIPING';
    let action = 'ERECTION';
    let objectOrTag = 'Field Activity';
    let status: any = 'IN_PROGRESS';
    let difficulty: any = 'AMBIGUOUS';

    if (lower.includes('24a') || lower.includes('spool')) {
      discipline = 'PIPING';
      objectOrTag = 'Line 24A';
      action = lower.includes('spool') ? 'SPOOL ERECTION' : 'ERECTION';
      if (lower.includes('finish') || lower.includes('done') || lower.includes('complete')) {
        status = 'COMPLETED';
      }
    } else if (lower.includes('f11') || lower.includes('f-11') || lower.includes('concrete') || lower.includes('pour')) {
      discipline = 'CIVIL';
      objectOrTag = 'Foundation F-11';
      action = 'POUR CONCRETE';
      status = 'COMPLETED';
    } else if (lower.includes('cable') || lower.includes('substation') || lower.includes('feeder')) {
      discipline = 'ELECTRICAL';
      objectOrTag = 'Feeder-01 / Substation 02';
      action = 'CABLE PULL';
      status = 'IN_PROGRESS';
    } else if (lower.includes('hydrotest') || lower.includes('ht') || lower.includes('leak')) {
      discipline = 'PIPING';
      objectOrTag = 'Line 24A';
      action = 'HYDROTEST';
      status = lower.includes('delay') || lower.includes('hold') || lower.includes('wait') ? 'HOLD' : 'IN_PROGRESS';
    }

    const newEvent: ProgressEvent = {
      id: `EVT-VOICE-${Date.now()}`,
      sourceDocId: 'DOC-SITE-DIARY-01',
      sourceType: 'Supervisor Time Agent (Voice/Text)',
      rawTextExcerpt: text,
      normalizedActivityText: `${action} on ${objectOrTag}, status: ${status}`,
      discipline,
      action,
      objectOrTag,
      eventDate: projectInfo.dataDate,
      status,
      difficulty,
    };

    const newMatch = matchEventToActivities(newEvent, activities);

    setEvents(prev => [newEvent, ...prev]);
    setMatches(prev => [newMatch, ...prev]);

    return { event: newEvent, match: newMatch };
  };

  const resetToBenchmark = async () => {
    setSelectedActivityId(null);
    setSelectedMatchId(null);
    setSelectedDisciplineFilter('ALL');
    setActiveTab('import');
    try {
      // Reset the persistent SQLite store to the bundled 18-activity baseline.
      await api.resetSeed();
      await reloadBackend();
    } catch (error) {
      console.error('Backend reset failed; using in-memory seed fallback.', error);
      setActivities(initialActivities);
      setDocuments(mockSourceDocuments);
      setEvents(mockInitialEvents);
      const refreshedMatches = mockInitialEvents.map(evt => matchEventToActivities(evt, initialActivities));
      setMatches(refreshedMatches);
      setAuditLogs(initialAuditLogs);
      setDelays(initialDelayRecords);
      setProjectInfo(mockProjectInfo);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projectInfo,
        activities,
        wbsNodes,
        documents,
        events,
        matches,
        auditLogs,
        delays,
        institutionalMemory,
        activeTab,
        setActiveTab,
        selectedActivityId,
        setSelectedActivityId,
        selectedMatchId,
        setSelectedMatchId,
        selectedDisciplineFilter,
        setSelectedDisciplineFilter,
        demoTourActive,
        setDemoTourActive,
        approveMatch,
        overrideMatch,
        rejectMatch,
        flagUnmatched,
        ingestNewDocument,
        uploadDocument,
        importSchedule,
        processTimeAgentInput,
        resetToBenchmark,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
