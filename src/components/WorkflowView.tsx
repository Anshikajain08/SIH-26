import React, { useState } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Layers, 
  ShieldCheck, 
  Sparkles, 
  Zap, 
  AlertTriangle, 
  Calendar, 
  ChevronRight,
  Database,
  GitFork,
  Radio,
  Sliders,
  Play
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { ProgressEvent, MatchRecord } from '../types';

export const WorkflowView: React.FC = () => {
  const { 
    activities, 
    events, 
    matches, 
    approveMatch, 
    processTimeAgentInput,
    setActiveTab,
    setSelectedMatchId,
    setSelectedActivityId
  } = useProject();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number>(0);
  const [customInputText, setCustomInputText] = useState<string>('');
  const [activeSimulationResult, setActiveSimulationResult] = useState<{
    event: ProgressEvent;
    match: MatchRecord;
  } | null>(null);
  const [simulationApproved, setSimulationApproved] = useState<boolean>(false);

  // Pre-configured realistic field samples from the PS benchmark
  const fieldSamples = [
    {
      title: 'Ambiguous / Needs Review Case (Line 24A Erection)',
      type: 'Daily Progress Report (DPR PDF)',
      text: 'Spool erection completed for Line 24A today at Gas Processing Unit. Spool S03 hydrotest pending.',
      category: 'Planner Review Case (Score: 0.78)',
      targetId: 'ACT-PIP-024',
      badge: '0.78 Confidence • Review Queue'
    },
    {
      title: 'High-Confidence Auto-Link Case (Excavation)',
      type: 'Civil Shift Log (Excel)',
      text: 'Excavation completed for compressor station foundation F11. 140 cu.m soil shifted.',
      category: 'Auto-Proposed (Score: 0.92)',
      targetId: 'ACT-CIV-002',
      badge: '0.92 Confidence • Auto-Propose'
    },
    {
      title: 'Supervisor Voice Audio Log (Cable Pulling)',
      type: 'Supervisor Field Text (Demo)',
      text: 'Substation 02 cable tray completed today. Pulled 120m feeder cable.',
      category: 'Auto-Proposed (Score: 0.88)',
      targetId: 'ACT-ELE-008',
      badge: '0.88 Confidence • Auto-Propose'
    },
    {
      title: 'Delay & Root Cause Case (Flash Flood Rain)',
      type: 'Inclement Weather Log',
      text: 'Piping corridor trench excavation halted due to heavy monsoon flash rains and standing water.',
      category: 'Delay Event (Weather Category)',
      targetId: 'ACT-PIP-015',
      badge: '0.81 Confidence • Delay Logged'
    }
  ];

  // Derive effective result from simulation or benchmark state so all stages are immediately interactive
  const effectiveResult = activeSimulationResult || (events[0] && matches[0] ? { event: events[0], match: matches[0] } : null);

  // Initialize or run simulation for the active sample
  const handleRunSample = (sampleText: string) => {
    const result = processTimeAgentInput(sampleText);
    setActiveSimulationResult(result);
    setSimulationApproved(false);
    setCurrentStep(2); // advance to extraction stage
  };

  const handleApproveCurrent = () => {
    const target = effectiveResult;
    if (!target) return;
    approveMatch(
      target.match.id,
      undefined,
      'Approved via Interactive Pipeline Workflow'
    );
    setSimulationApproved(true);
    setCurrentStep(4); // Advance to Gantt & schedule impact
  };

  const currentSample = fieldSamples[selectedSampleIndex];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner: Workflow Introduction */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>SIH 2026 PS 26122 • End-to-End Technical Pipeline</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Interactive Planning-to-Execution Workflow
            </h2>
            <p className="text-sm text-slate-600 max-w-3xl mt-1 leading-relaxed">
              Experience the 4-stage pipeline that bridges unstructured field reports (DPRs, Excel, Voice) to Primavera P6 baseline schedules using AI extraction, semantic matching, and deterministic approval logic.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveTab('gantt');
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Jump to Gantt
            </button>
            <button
              onClick={() => {
                setActiveTab('review');
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white shadow-xs transition-colors cursor-pointer"
            >
              Open Review Queue
            </button>
          </div>
        </div>
      </div>

      {/* Step Indicator Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[
            {
              num: 1,
              title: '1. Ingestion',
              subtitle: 'Messy Field Inputs',
              icon: FileText
            },
            {
              num: 2,
              title: '2. AI Extraction',
              subtitle: 'Structured Event JSON',
              icon: Layers
            },
            {
              num: 3,
              title: '3. Semantic Match',
              subtitle: 'Confidence Scoring',
              icon: ShieldCheck
            },
            {
              num: 4,
              title: '4. Baseline Sync',
              subtitle: 'Gantt & Variance',
              icon: Calendar
            },
          ].map((s) => {
            const Icon = s.icon;
            const isCurrent = currentStep === s.num;
            const isCompleted = currentStep > s.num;
            return (
              <button
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-blue-50 border-2 border-blue-600 shadow-xs'
                    : isCompleted
                    ? 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                    : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-400'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  isCurrent
                    ? 'bg-blue-700 text-white'
                    : isCompleted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </div>
                <div className="truncate">
                  <div className={`text-xs font-bold ${isCurrent ? 'text-blue-900' : 'text-slate-800'}`}>
                    {s.title}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {s.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Stage Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Sample Selector & Input Control */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Select Field Report Source
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Step 1</span>
            </div>

            <div className="space-y-2.5">
              {fieldSamples.map((sample, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedSampleIndex(idx);
                    handleRunSample(sample.text);
                  }}
                  className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedSampleIndex === idx
                      ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-900">
                      {sample.title}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                      {sample.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 italic line-clamp-2 mb-2">
                    "{sample.text}"
                  </p>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-blue-700 font-medium">{sample.badge}</span>
                    <span className="text-slate-400 flex items-center gap-1 hover:text-blue-700">
                      Test flow <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Input Box */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Or Type Any Custom Field Log:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInputText}
                  onChange={(e) => setCustomInputText(e.target.value)}
                  placeholder="e.g. Line 24A started today, spool S03 erected"
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                  onClick={() => {
                    if (customInputText.trim()) {
                      handleRunSample(customInputText);
                    }
                  }}
                  className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Run
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Pipeline Transformation Output */}
        <div className="lg:col-span-7 space-y-4">
          {/* Stage 1 Content: Ingestion & Parsing */}
          {currentStep === 1 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-mono font-bold text-blue-700 uppercase">STAGE 01</span>
                  <h3 className="text-base font-bold text-slate-900">Ingestion & Document Normalization</h3>
                </div>
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Ready to Process
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Raw Ingested Text Excerpt
                </span>
                <p className="text-sm font-serif text-slate-800 leading-relaxed bg-white p-3 rounded border border-slate-200">
                  "{currentSample.text}"
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                  <span>Format: <strong>{currentSample.type}</strong></span>
                  <span>Document ID: <strong>DPR-2026-0905-01</strong></span>
                  <span>Project: <strong>Oildex</strong></span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                The ingestion layer accepts heterogeneous sources (Daily Progress Reports in PDF, contractor Excel logs, or audio notes) and isolates individual event statements for NLP parsing without forcing field staff to change their reporting habits.
              </p>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => handleRunSample(currentSample.text)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <span>Proceed to AI Extraction</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Stage 2 Content: AI Structured Extraction */}
          {currentStep === 2 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-mono font-bold text-blue-700 uppercase">STAGE 02</span>
                  <h3 className="text-base font-bold text-slate-900">Structured ProgressEvent Extraction</h3>
                </div>
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700 border border-blue-200">
                  Schema Validated
                </span>
              </div>

              {effectiveResult ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <span className="text-[10px] text-slate-500 block uppercase font-mono">Discipline</span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                        {effectiveResult.event.discipline}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <span className="text-[10px] text-slate-500 block uppercase font-mono">Action</span>
                      <span className="text-xs font-bold text-blue-700 mt-0.5 block">
                        {effectiveResult.event.action}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <span className="text-[10px] text-slate-500 block uppercase font-mono">Object / Tag</span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                        {effectiveResult.event.objectOrTag}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <span className="text-[10px] text-slate-500 block uppercase font-mono">Status Extracted</span>
                      <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                        {effectiveResult.event.status}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <span className="text-[10px] text-slate-500 block uppercase font-mono">Event Date</span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5 block font-mono">
                        {effectiveResult.event.eventDate}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <span className="text-[10px] text-slate-500 block uppercase font-mono">Quantity / Work</span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                        {effectiveResult.event.quantity ? `${effectiveResult.event.quantity} ${effectiveResult.event.unit || ''}` : 'Activity Milestones'}
                      </span>
                    </div>
                  </div>

                  {/* Raw Text Preservation Banner (Legal & Audit requirement) */}
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                    <span className="text-[11px] font-semibold text-amber-900 block mb-1">
                      Preserved Legal Source Sentence:
                    </span>
                    <span className="text-xs text-amber-800 italic">
                      "{effectiveResult.event.rawTextExcerpt}"
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Select a sample or click "Run" on the left to extract.
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  ← Back to Ingestion
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <span>Proceed to Semantic Matching</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Stage 3 Content: Semantic Matching & Confidence Breakdown */}
          {currentStep === 3 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-mono font-bold text-blue-700 uppercase">STAGE 03</span>
                  <h3 className="text-base font-bold text-slate-900">
                    Semantic Matching & Mathematical Confidence Score
                  </h3>
                </div>
                {effectiveResult && (
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    effectiveResult.match.decision === 'AUTO_PROPOSED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border border-amber-300'
                  }`}>
                    {(effectiveResult.match.finalConfidence * 100).toFixed(0)}% Match Confidence
                  </span>
                )}
              </div>

              {effectiveResult ? (
                <div className="space-y-4">
                  {/* Top Candidate Card */}
                  {effectiveResult.match.candidates[0] && (
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs font-mono font-bold bg-blue-700 text-white rounded">
                            {effectiveResult.match.candidates[0].activityId}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {effectiveResult.match.candidates[0].activityName}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-semibold text-slate-500">
                          Primavera L5/L6 Activity
                        </span>
                      </div>

                      <p className="text-xs text-slate-600">
                        {effectiveResult.match.candidates[0].explanation}
                      </p>
                    </div>
                  )}

                  {/* 3-Component Formula Calculation breakdown */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                      <span>PS 26122 Confidence Formula Breakdown</span>
                      <span className="font-mono text-blue-700">
                        Final = 0.65×Semantic + 0.20×Metadata + 0.15×Keyword
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 text-xs font-mono">
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-500 block">SEMANTIC (65%)</span>
                        <span className="font-bold text-slate-800 mt-1 block">
                          {(((effectiveResult.match.candidates[0]?.semanticSimilarity ?? 0.78)) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-500 block">METADATA (20%)</span>
                        <span className="font-bold text-slate-800 mt-1 block">
                          {(((effectiveResult.match.candidates[0]?.metadataScore ?? 0.85)) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-500 block">KEYWORD (15%)</span>
                        <span className="font-bold text-slate-800 mt-1 block">
                          {(((effectiveResult.match.candidates[0]?.keywordScore ?? 0.70)) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Decision Action */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-blue-900 block">
                        Deterministic Routing Rule:
                      </span>
                      <span className="text-xs text-blue-700">
                        {effectiveResult.match.decision === 'AUTO_PROPOSED'
                          ? 'Score ≥ 0.85: Auto-proposal ready. One click to commit to Primavera schedule.'
                          : 'Score 0.65–0.84: Ambiguity flagged. Routed to human planner review.'}
                      </span>
                    </div>

                    <button
                      onClick={handleApproveCurrent}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs whitespace-nowrap cursor-pointer"
                    >
                      {simulationApproved ? '✓ Updated!' : 'Approve & Link Schedule'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Run a sample first.
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  ← Back to Extraction
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <span>View Baseline vs Actual Impact</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Stage 4 Content: Baseline vs Actual Gantt Impact */}
          {currentStep === 4 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-mono font-bold text-blue-700 uppercase">STAGE 04</span>
                  <h3 className="text-base font-bold text-slate-900">
                    Live Baseline vs. Actual Schedule Impact
                  </h3>
                </div>
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Schedule Synchronized
                </span>
              </div>

              {effectiveResult?.match.candidates[0] ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900">
                        {effectiveResult.match.candidates[0].activityId} - {effectiveResult.match.candidates[0].activityName}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-700">
                        {simulationApproved ? '100% Complete' : 'In Progress (85%)'}
                      </span>
                    </div>

                    {/* Dual bar comparison representation */}
                    <div className="space-y-2 mt-3 text-xs">
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>Planned Primavera Baseline:</span>
                          <span>2026-08-25 → 2026-09-02 (9 days)</span>
                        </div>
                        <div className="h-3 bg-slate-300 rounded-full w-full overflow-hidden">
                          <div className="h-3 bg-slate-600 rounded-full w-4/5" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>Actual Field Execution (Updated):</span>
                          <span className="text-emerald-700 font-semibold">Completed on 05-Sep (+1d Variance)</span>
                        </div>
                        <div className="h-3 bg-slate-200 rounded-full w-full overflow-hidden">
                          <div className="h-3 bg-emerald-600 rounded-full w-[90%]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Downstream Impact:</span>
                      <span className="font-semibold text-slate-800 mt-1 block">
                        Hydrotest ACT-PIP-032 rescheduled by +1 day (Zero critical path slippage)
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Audit History Citation:</span>
                      <span className="font-mono text-[11px] text-slate-700 mt-1 block truncate">
                        Approved by Planner via Oildex at {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => {
                        if (effectiveResult.match.candidates[0]) {
                          setSelectedActivityId(effectiveResult.match.candidates[0].activityId);
                        }
                        setActiveTab('gantt');
                      }}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Full Interactive Gantt Screen</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setCurrentStep(1);
                        setSelectedSampleIndex((prev) => (prev + 1) % fieldSamples.length);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Test Next Field Sample
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Run a sample or approve an event to view schedule impact.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
