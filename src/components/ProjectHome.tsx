import React from 'react';
import { 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet, 
  FileText, 
  Layers, 
  Mic, 
  ShieldAlert, 
  TrendingDown, 
  TrendingUp, 
  Zap,
  Play,
  Calendar,
  Building2
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';

export const ProjectHome: React.FC = () => {
  const { 
    projectInfo, 
    activities, 
    matches, 
    setActiveTab, 
    setSelectedMatchId,
    setDemoTourActive 
  } = useProject();

  const pendingReviewMatches = matches.filter(m => m.decision === 'PLANNER_REVIEW');
  const delayedActivities = activities.filter(a => a.varianceDays > 0);
  const criticalPathDelayed = activities.filter(a => a.isCritical && a.varianceDays > 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner: Project Title & Context */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-mono px-2.5 py-0.5 rounded-md font-semibold">
                CONTRACT #{projectInfo.code}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">Location: {projectInfo.location}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {projectInfo.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
              Real-time planning-to-execution synchronization. Ingests messy daily progress reports (DPRs), site diaries, and contractor spreadsheets, maps them to L5/L6 Primavera baseline activities using BGE-M3 semantic matching, and updates actual progress with planner governance.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center">
            <button
              onClick={() => setDemoTourActive(true)}
              className="px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch 3-Min Pitch Flow</span>
            </button>
            <button
              onClick={() => setActiveTab('workflow')}
              className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Interactive Pipeline
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Planned vs Actual */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Cumulative Progress</span>
            <span className="font-mono text-blue-700 font-semibold">Stage 10</span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold text-slate-900">
              {projectInfo.actualProgress}%
            </span>
            <span className="text-xs text-slate-500 font-medium">
              vs {projectInfo.plannedProgress}% Plan
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-3">
            <div
              className="bg-emerald-600 h-2 rounded-full"
              style={{ width: `${projectInfo.actualProgress}%` }}
            />
          </div>
          <span className="text-[11px] text-amber-700 font-medium mt-2 block">
            Lag: -5.6% variance at 05-Sep cut-off
          </span>
        </div>

        {/* Schedule Performance Index */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Schedule SPI</span>
            <TrendingDown className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold text-slate-900">0.92</span>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              Mild Drift
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Critical Path activity ACT-PIP-024 (Line 24A) is lagging by 1 day.
          </p>
        </div>

        {/* Pending Review Queue */}
        <div 
          onClick={() => setActiveTab('review')}
          className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-5 shadow-xs transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Planner Review Queue</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold text-slate-900">
              {pendingReviewMatches.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">Items Pending</span>
          </div>
          <p className="text-xs text-blue-700 font-medium mt-2 flex items-center gap-1">
            Review ambiguous cases <ArrowRight className="w-3 h-3" />
          </p>
        </div>

        {/* Ingested DPR Documents */}
        <div 
          onClick={() => setActiveTab('import')}
          className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-5 shadow-xs transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Ingested Field Sources</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold text-slate-900">4 Sources</span>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
              Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            DPR PDFs, Spool spreadsheets, and site audio diaries.
          </p>
        </div>
      </div>

      {/* Quick Action Station */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Direct Pipeline Navigation
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveTab('workflow')}
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 text-left transition-all cursor-pointer group"
          >
            <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 mb-1">
              1. Interactive Pipeline Workflow
            </div>
            <p className="text-xs text-slate-600">
              Step through Ingestion → AI Extraction → Semantic Matching → Baseline Gantt Sync.
            </p>
          </button>

          <button
            onClick={() => setActiveTab('gantt')}
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 text-left transition-all cursor-pointer group"
          >
            <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 mb-1">
              2. Interactive Gantt Schedule
            </div>
            <p className="text-xs text-slate-600">
              View Primavera baseline bars vs updated actual bars with variance and critical path indicators.
            </p>
          </button>

          <button
            onClick={() => setActiveTab('timeagent')}
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 text-left transition-all cursor-pointer group"
          >
            <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 mb-1">
              3. Supervisor Time Agent
            </div>
            <p className="text-xs text-slate-600">
              Voice and conversational reporting tool for site supervisors to log updates with 1-tap confirmation.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
