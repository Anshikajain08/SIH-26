import React from 'react';
import { Database, FileText, ShieldCheck } from 'lucide-react';
import { useProject } from '../context/ProjectContext';

export const AuditLog: React.FC = () => {
  const { auditLogs } = useProject();

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Persistent Audit Log</h2>
            <p className="text-sm text-slate-600 mt-1">Every planner decision is linked to its source evidence, confidence, timestamp, and schedule change.</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {auditLogs.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No review decisions have been recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {auditLogs.map(log => (
              <article key={log.id} className="p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-700" />
                    <span className="font-mono text-xs font-bold text-slate-900">{log.action}</span>
                    {log.activityId && <span className="text-xs text-blue-700 font-mono">{log.activityId}</span>}
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{log.timestamp}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Original evidence</span>
                    <span className="text-slate-800 italic">{log.evidenceText || 'No evidence text recorded.'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Decision metadata</span>
                    <span className="text-slate-800">Actor: {log.actor}</span>
                    <span className="text-slate-800 block">Confidence: {log.confidence == null ? 'n/a' : `${(log.confidence * 100).toFixed(0)}%`}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
                  <div className="p-3 rounded-lg border border-rose-100 bg-rose-50/40 text-slate-700"><FileText className="w-3.5 h-3.5 text-rose-600 inline mr-1" />OLD: {log.oldValue}</div>
                  <div className="p-3 rounded-lg border border-emerald-100 bg-emerald-50/40 text-slate-700"><FileText className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />NEW: {log.newValue}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
