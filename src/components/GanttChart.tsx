import React, { useState } from 'react';
import { 
  AlertCircle, 
  Calendar, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  Filter, 
  Info, 
  Layers, 
  Search, 
  Tag, 
  Zap,
  CheckCircle2
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { Activity, DisciplineType } from '../types';

export const GanttChart: React.FC = () => {
  const { 
    activities, 
    projectInfo, 
    selectedDisciplineFilter, 
    setSelectedDisciplineFilter,
    setSelectedActivityId 
  } = useProject();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);

  // Timeline window: 2026-08-25 to 2026-09-25 (31 days)
  const timelineStart = new Date('2026-08-25').getTime();
  const timelineEnd = new Date('2026-09-25').getTime();

  const dateToPercent = (dateStr: string) => {
    const time = new Date(dateStr).getTime();
    const pct = ((time - timelineStart) / (timelineEnd - timelineStart)) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  const dataDatePercent = dateToPercent(projectInfo.dataDate);

  // Filter activities
  const filteredActivities = activities.filter(act => {
    if (selectedDisciplineFilter !== 'ALL' && act.discipline !== selectedDisciplineFilter) {
      return false;
    }
    if (filterCriticalOnly && !act.isCritical) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return act.id.toLowerCase().includes(q) || act.name.toLowerCase().includes(q) || act.area.toLowerCase().includes(q);
    }
    return true;
  });

  const disciplines: { label: string; value: string }[] = [
    { label: 'All Disciplines', value: 'ALL' },
    { label: 'Piping', value: 'PIPING' },
    { label: 'Civil', value: 'CIVIL' },
    { label: 'Electrical', value: 'ELECTRICAL' },
    { label: 'Instrumentation', value: 'INSTRUMENTATION' },
    { label: 'Mechanical', value: 'MECHANICAL' },
  ];

  // Generate timeline day labels
  const daysHeader: { day: string; date: string; isCutoff: boolean }[] = [];
  for (let i = 0; i <= 30; i += 3) {
    const d = new Date(timelineStart + i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    daysHeader.push({
      day: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
      date: dateStr,
      isCutoff: dateStr === projectInfo.dataDate,
    });
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Primavera Baseline vs. Actual Schedule
              </span>
              <span className="text-xs text-slate-500">Real-Time Sync</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Interactive Schedule Gantt & Variance Visualizer
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl mt-1">
              Compare planned Primavera P6 baseline bars against updated field actuals. Identify execution variance, critical path shifts, and downstream successor impacts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs">
              <span className="text-slate-500 block text-[11px]">Current Cut-off Date:</span>
              <span className="text-rose-600 font-bold font-mono flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                {projectInfo.dataDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Filter & Legend Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Discipline Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {disciplines.map(d => (
              <button
                key={d.value}
                onClick={() => setSelectedDisciplineFilter(d.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedDisciplineFilter === d.value
                    ? 'bg-blue-700 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Search & Critical Path Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search activity ID or name..."
                className="bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-48 sm:w-60"
              />
            </div>

            <button
              onClick={() => setFilterCriticalOnly(!filterCriticalOnly)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                filterCriticalOnly
                  ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Critical Path Only
            </button>
          </div>
        </div>

        {/* Clean Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-3 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-2 rounded-xs bg-slate-500"></span>
            <span>Planned Baseline</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-2 rounded-xs bg-emerald-500"></span>
            <span>Completed Actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-2 rounded-xs bg-amber-500"></span>
            <span>In-Progress Actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-2 rounded-xs bg-rose-500"></span>
            <span>Delayed Critical Path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span className="text-rose-600 font-medium">Data Date Cut-off</span>
          </div>
        </div>
      </div>

      {/* Main Gantt Grid Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <div className="min-w-[960px]">
            {/* Header Row */}
            <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              {/* Left 4 cols: Info */}
              <div className="col-span-4 p-3.5 border-r border-slate-200 flex items-center justify-between">
                <span>Activity & WBS Node</span>
                <span className="text-slate-400 font-normal">Plan Dates</span>
              </div>

              {/* Right 8 cols: Timeline Header */}
              <div className="col-span-8 p-3.5 relative flex items-center justify-between text-[11px] font-mono">
                {daysHeader.map((dh, idx) => (
                  <div key={idx} className="text-center">
                    <span className={`block ${dh.isCutoff ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                      {dh.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Rows */}
            <div className="divide-y divide-slate-100 relative">
              {/* Vertical Cut-off Data Date Line */}
              <div 
                className="absolute top-0 bottom-0 z-20 pointer-events-none"
                style={{ left: `calc(33.333% + (66.666% * ${dataDatePercent / 100}))` }}
              >
                <div className="w-[1.5px] h-full bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.5)]" />
                <div className="bg-rose-50 text-rose-700 border border-rose-300 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold absolute -top-5 -translate-x-1/2 whitespace-nowrap shadow-xs">
                  05-SEP CUT-OFF
                </div>
              </div>

              {filteredActivities.map((act) => {
                const startPct = dateToPercent(act.plannedStart);
                const finishPct = dateToPercent(act.plannedFinish);
                const baselineWidth = Math.max(3, finishPct - startPct);

                // Actual coordinates
                const actualStart = act.actualStart || act.plannedStart;
                const actualFinish = act.actualFinish || act.plannedFinish;
                const actStartPct = dateToPercent(actualStart);
                const actFinishPct = dateToPercent(actualFinish);
                const actualWidth = Math.max(3, actFinishPct - actStartPct);

                const isDelayed = act.varianceDays > 0;
                const isCompleted = act.status === 'COMPLETED';

                return (
                  <div
                    key={act.id}
                    onClick={() => setSelectedActivityId(act.id)}
                    className="grid grid-cols-12 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Left Column (4 cols) */}
                    <div className="col-span-4 p-3.5 border-r border-slate-200 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-blue-700 group-hover:underline">
                          {act.id}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {act.discipline}
                        </span>
                        {act.isCritical && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                            CP
                          </span>
                        )}
                        {act.linkedEvidenceCount > 0 && (
                          <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {act.linkedEvidenceCount} linked
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {act.name}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span>{act.plannedStart} → {act.plannedFinish}</span>
                        <span className={`font-semibold ${
                          isCompleted ? 'text-emerald-700' :
                          isDelayed ? 'text-rose-600' : 'text-amber-700'
                        }`}>
                          {act.percentComplete}% {isDelayed ? `(+${act.varianceDays}d)` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Right Timeline Column (8 cols) */}
                    <div className="col-span-8 p-3.5 relative flex flex-col justify-center gap-1.5 overflow-hidden">
                      {/* Subtle grid lines */}
                      <div className="absolute inset-0 grid grid-cols-10 divide-x divide-slate-100 pointer-events-none" />

                      {/* Top Bar: Baseline Plan */}
                      <div className="relative h-2.5 w-full">
                        <div
                          className="absolute h-2.5 rounded bg-slate-400 hover:bg-slate-500 transition-colors shadow-2xs"
                          style={{
                            left: `${startPct}%`,
                            width: `${baselineWidth}%`,
                          }}
                          title={`Planned Baseline: ${act.plannedStart} to ${act.plannedFinish}`}
                        />
                      </div>

                      {/* Bottom Bar: Actual Execution */}
                      <div className="relative h-3 w-full">
                        <div
                          className={`absolute h-3 rounded shadow-2xs flex items-center justify-end px-1.5 transition-all ${
                            isCompleted
                              ? 'bg-emerald-500 text-white'
                              : isDelayed
                              ? 'bg-rose-500 text-white'
                              : 'bg-amber-500 text-slate-900'
                          }`}
                          style={{
                            left: `${actStartPct}%`,
                            width: `${actualWidth}%`,
                          }}
                        >
                          {act.percentComplete > 20 && (
                            <span className="text-[9px] font-bold leading-none font-mono">
                              {act.percentComplete}%
                            </span>
                          )}
                        </div>

                        {/* Delayed Variance Tag */}
                        {isDelayed && (
                          <div 
                            className="absolute -top-4 text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 whitespace-nowrap shadow-2xs"
                            style={{ left: `calc(${actFinishPct}% + 4px)` }}
                          >
                            +{act.varianceDays}d Variance
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
