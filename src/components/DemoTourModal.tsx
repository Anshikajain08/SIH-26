import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  CheckCircle2, 
  ChevronRight, 
  FileText, 
  HelpCircle, 
  Play, 
  ShieldCheck, 
  Sparkles, 
  X, 
  Zap 
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';

export const DemoTourModal: React.FC = () => {
  const { 
    demoTourActive, 
    setDemoTourActive, 
    setActiveTab, 
    setSelectedMatchId,
    approveMatch,
    matches 
  } = useProject();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!demoTourActive) return null;

  const demoSteps = [
    {
      step: 'Step 1 of 8',
      time: '0:00 - 0:20',
      title: 'The Core Problem: Planning vs Reality',
      tab: 'gantt',
      action: () => setActiveTab('gantt'),
      pitch: 'Infrastructure baseline schedules live inside Primavera P6 with thousands of L5/L6 activities. But actual progress is scattered across daily PDF reports, Excel logs, and site diaries.',
      takeaway: 'Opening Line: "We are not replacing Primavera. We are fixing the missing bridge between Primavera and the people actually doing the work."'
    },
    {
      step: 'Step 2 of 8',
      time: '0:20 - 0:45',
      title: 'Multi-Format Field Ingestion',
      tab: 'import',
      action: () => setActiveTab('import'),
      pitch: 'Observe the Ingestion Center. We ingest heterogeneous inputs: shift DPR PDFs, discipline Excel spool welding trackers, and audio diaries without demanding change in site habits.',
      takeaway: 'The system ingests 2-3 realistic formats directly as requested by OIL PS 26122.'
    },
    {
      step: 'Step 3 of 8',
      time: '0:45 - 1:10',
      title: 'AI Extraction to Normalized ProgressEvent',
      tab: 'extraction',
      action: () => setActiveTab('extraction'),
      pitch: 'Raw messy sentences are parsed into strict JSON ProgressEvents with verified disciplines, actions, and tags, while preserving the raw text forever for explainability and legal audit.',
      takeaway: 'Deterministic JSON schema prevents hallucination and guarantees database integrity.'
    },
    {
      step: 'Step 4 of 8',
      time: '1:10 - 1:40',
      title: 'Semantic Matching & 3-Part Confidence Math',
      tab: 'review',
      action: () => {
        setActiveTab('review');
        const ambiguousMatch = matches.find(m => m.decision === 'PLANNER_REVIEW');
        if (ambiguousMatch) setSelectedMatchId(ambiguousMatch.id);
      },
      pitch: 'Here is the hero intelligence layer! The report said "spool 24A-S03 erected", while Primavera says "Erect Line 24A". BGE-M3 semantic vectors + metadata rules compute a 78% confidence score.',
      takeaway: 'Formula: 0.65×Semantic + 0.20×Metadata + 0.15×Keyword. Ambiguous cases (0.65-0.84) are routed safely to human review.'
    },
    {
      step: 'Step 5 of 8',
      time: '1:40 - 2:05',
      title: 'Human-in-the-Loop Planner Approval',
      tab: 'review',
      action: () => {
        setActiveTab('review');
        const ambiguousMatch = matches.find(m => m.decision === 'PLANNER_REVIEW');
        if (ambiguousMatch) {
          approveMatch(ambiguousMatch.id, undefined, 'Demo pitch: Approved Line 24A spool erection.');
        }
      },
      pitch: 'The planner reviews the exact source quote and constraint checks, and approves the match with one click. High confidence matches auto-link, but ambiguous ones never silently corrupt the schedule!',
      takeaway: 'Zero silent schedule corruption. Every decision is logged with an immutable audit trail.'
    },
    {
      step: 'Step 6 of 8',
      time: '2:05 - 2:30',
      title: 'Instant Gantt & Variance Sync',
      tab: 'gantt',
      action: () => setActiveTab('gantt'),
      pitch: 'Notice the immediate change on the Gantt! The actual green bar for Line 24A has updated, and the downstream hydrotest is flagged with +1 day critical variance.',
      takeaway: 'Instant visibility of execution drift against the approved Primavera baseline.'
    },
    {
      step: 'Step 7 of 8',
      time: '2:30 - 2:45',
      title: 'Delay Taxonomy & Root Cause Analytics',
      tab: 'analytics',
      action: () => setActiveTab('analytics'),
      pitch: 'Look at the Analytics tab. Field-extracted hold reasons are categorized into an executive delay taxonomy: Third-Party TPI test pack clearance is identified as the primary milestone bottleneck.',
      takeaway: 'Turns messy field excuses into structured, actionable delay taxonomy and contractor scorecards.'
    },
    {
      step: 'Step 8 of 8',
      time: '2:45 - 3:00',
      title: 'Conversational Time Agent & Institutional Memory',
      tab: 'timeagent',
      action: () => setActiveTab('timeagent'),
      pitch: 'Finally, explore the Time Agent where supervisors speak updates directly from the field, and Project Memory which preserves real durations to calibrate bids for future OIL pipeline projects.',
      takeaway: 'Complete closed-loop from supervisor voice in the field to long-term institutional memory!'
    }
  ];

  const current = demoSteps[currentStepIndex];

  const goToNext = () => {
    if (currentStepIndex < demoSteps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      demoSteps[nextIndex].action();
    } else {
      setDemoTourActive(false);
    }
  };

  const goToPrev = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      demoSteps[prevIndex].action();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white border-2 border-blue-600 rounded-xl shadow-2xl p-5 text-slate-900 relative">
        {/* Close Button */}
        <button
          onClick={() => setDemoTourActive(false)}
          className="absolute top-3 right-3 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step Badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded bg-blue-700 text-white font-mono font-bold text-[10px]">
            {current.step}
          </span>
          <span className="text-[11px] font-mono text-blue-700 font-semibold">
            {current.time}
          </span>
        </div>

        {/* Step Title */}
        <h4 className="text-sm font-bold text-slate-900 mb-1.5">
          {current.title}
        </h4>

        {/* Pitch Script */}
        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          {current.pitch}
        </p>

        {/* Takeaway / Punchline */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-[11px] text-blue-900 font-medium mb-4">
          {current.takeaway}
        </div>

        {/* Progress Dots & Nav Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1">
            {demoSteps.map((_, idx) => (
              <span
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentStepIndex ? 'bg-blue-700' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={goToPrev}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={goToNext}
              className="px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <span>{currentStepIndex === demoSteps.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
