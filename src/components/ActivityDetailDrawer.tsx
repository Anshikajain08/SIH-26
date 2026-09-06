import React from 'react';
import { 
  AlertCircle, 
  ArrowRight, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  FileText, 
  GitFork, 
  Layers, 
  ShieldCheck, 
  Sliders, 
  Tag, 
  X 
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';

export const ActivityDetailDrawer: React.FC = () => {
  const { 
    selectedActivityId, 
    setSelectedActivityId, 
    activities, 
    auditLogs, 
    events, 
    setActiveTab,
    setSelectedMatchId
  } = useProject();

  if (!selectedActivityId) return null;

  const activity = activities.find(a => a.id === selectedActivityId);
  if (!activity) return null;

  const relevantAuditLogs = auditLogs.filter(log => log.activityId === activity.id);
  const relevantEvents = events.filter(evt => 
    evt.groundTruthActivityId === activity.id || 
    evt.rawTextExcerpt.toLowerCase().includes(activity.name.toLowerCase().slice(0, 8)) ||
    evt.rawTextExcerpt.toLowerCase().includes(activity.id.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div 
        className="w-full max-w-xl bg-white border-l border-slate-200 h-full flex flex-col justify-between shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-700 text-white">
                {activity.id}
              </span>
              <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium">
                {activity.discipline}
              </span>
              {activity.isCritical && (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  Critical Path (0d Float)
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {activity.name}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              WBS: {activity.wbsCode} • Area: {activity.area}
            </p>
          </div>

          <button
            onClick={() => setSelectedActivityId(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-5 space-y-6 flex-1">
          {/* Baseline vs Actual Comparison Matrix */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Schedule Execution Matrix
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Planned Baseline</span>
                <span className="text-slate-900 font-bold block mt-1">
                  {activity.plannedStart} → {activity.plannedFinish}
                </span>
                <span className="text-slate-500 text-[11px] block mt-0.5 font-mono">
                  Duration: {activity.plannedDurationDays} Days
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Actual / Current</span>
                <span className="text-emerald-700 font-bold block mt-1">
                  {activity.actualStart || 'Not Started'} → {activity.actualFinish || 'In Progress'}
                </span>
                <span className="text-rose-600 text-[11px] font-bold block mt-0.5 font-mono">
                  Variance: {activity.varianceDays > 0 ? `+${activity.varianceDays}d (Delay)` : `${activity.varianceDays}d (On Track)`}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Status Bar */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Current Progress:</span>
              <span className={`font-bold font-mono ${
                activity.status === 'COMPLETED' ? 'text-emerald-700' :
                activity.varianceDays > 0 ? 'text-rose-600' : 'text-amber-700'
              }`}>
                {activity.status} ({activity.percentComplete}%)
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  activity.status === 'COMPLETED' ? 'bg-emerald-600' :
                  activity.varianceDays > 0 ? 'bg-rose-500' : 'bg-amber-500'
                }`}
                style={{ width: `${activity.percentComplete}%` }}
              />
            </div>
          </div>

          {/* Primavera Logic & Dependencies */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <GitFork className="w-4 h-4 text-blue-700" />
              <span>Primavera Logic & Dependencies</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Predecessors:</span>
                {activity.predecessors.length > 0 ? (
                  activity.predecessors.map(p => (
                    <div key={p} className="text-slate-800 font-medium font-mono mt-1">
                      • {p} (FS)
                    </div>
                  ))
                ) : (
                  <span className="text-slate-400 mt-1 block">None (Start milestone)</span>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Successors Impacted:</span>
                {activity.successors.length > 0 ? (
                  activity.successors.map(s => (
                    <div key={s} className="text-amber-800 font-medium font-mono mt-1">
                      • {s} {activity.varianceDays > 0 ? '⚠️ Impacted' : '✓ Ready'}
                    </div>
                  ))
                ) : (
                  <span className="text-slate-400 mt-1 block">None (Project Finish)</span>
                )}
              </div>
            </div>
          </div>

          {/* Linked Field Evidence */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <FileText className="w-4 h-4 text-blue-700" />
              <span>Linked Field Evidence ({relevantEvents.length})</span>
            </div>

            <div className="space-y-2">
              {relevantEvents.length > 0 ? (
                relevantEvents.map(evt => (
                  <div key={evt.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="font-semibold text-blue-700">{evt.sourceType}</span>
                      <span className="font-mono">{evt.eventDate}</span>
                    </div>
                    <p className="text-slate-700 italic">
                      "{evt.rawTextExcerpt}"
                    </p>
                    <div className="mt-2 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified Progress Citation</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-400 italic">
                  No direct report citations linked yet.
                </div>
              )}
            </div>
          </div>

          {/* Activity Audit History */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Clock className="w-4 h-4 text-slate-600" />
              <span>Audit Trail History</span>
            </div>

            <div className="space-y-2">
              {relevantAuditLogs.length > 0 ? (
                relevantAuditLogs.map(log => (
                  <div key={log.id} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span className="font-semibold text-slate-800">{log.actor}</span>
                      <span>{log.timestamp}</span>
                    </div>
                    <div className="text-slate-700 text-xs">
                      {log.action}: <span className="font-bold text-emerald-700">{log.newValue}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-400 italic">
                  No manual overrides recorded.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => setSelectedActivityId(null)}
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={() => {
              setSelectedActivityId(null);
              setActiveTab('review');
            }}
            className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-xs font-semibold text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span>Open Match Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
