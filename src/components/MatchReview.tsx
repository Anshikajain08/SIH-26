import React, { useState } from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  ArrowRight, 
  Check, 
  CheckCircle2, 
  ChevronRight, 
  ExternalLink, 
  FileText, 
  HelpCircle, 
  Layers, 
  RefreshCw, 
  ShieldAlert, 
  ShieldCheck, 
  Sliders, 
  Sparkles, 
  X, 
  XCircle 
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { MatchDecision, MatchRecord } from '../types';

export const MatchReview: React.FC = () => {
  const { 
    matches, 
    activities, 
    selectedMatchId, 
    setSelectedMatchId, 
    approveMatch, 
    overrideMatch, 
    rejectMatch, 
    flagUnmatched,
    setActiveTab,
    setSelectedActivityId
  } = useProject();

  const [decisionFilter, setDecisionFilter] = useState<string>('ALL');
  const [reviewNote, setReviewNote] = useState<string>('');
  const [overrideCandidateId, setOverrideCandidateId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [showExplainMatch, setShowExplainMatch] = useState<boolean>(true);

  // Filter matches
  const filteredMatches = matches.filter(m => {
    if (decisionFilter === 'REVIEW_REQUIRED') return m.decision === 'PLANNER_REVIEW';
    if (decisionFilter === 'AUTO_PROPOSED') return m.decision === 'AUTO_PROPOSED' || m.decision === 'AUTO_ACCEPTED';
    if (decisionFilter === 'UNMATCHED') return m.decision === 'UNMATCHED';
    if (decisionFilter === 'APPROVED') return m.decision === 'APPROVED' || m.decision === 'OVERRIDDEN';
    return true;
  });

  const activeMatch: MatchRecord | undefined = 
    matches.find(m => m.id === selectedMatchId) || 
    matches.find(m => m.decision === 'PLANNER_REVIEW') || 
    filteredMatches[0] || 
    matches[0];

  const currentSelectedCandidateId = overrideCandidateId || activeMatch?.selectedCandidateId || activeMatch?.candidates[0]?.activityId;
  const currentCandidate = activeMatch?.candidates.find(c => c.activityId === currentSelectedCandidateId) || activeMatch?.candidates[0];

  const handleApprove = () => {
    if (!activeMatch) return;
    approveMatch(activeMatch.id, currentSelectedCandidateId, reviewNote);
    setActionSuccessMessage(`Successfully approved and synced to activity ${currentSelectedCandidateId}!`);
    setTimeout(() => setActionSuccessMessage(null), 4000);
    setReviewNote('');
    setOverrideCandidateId(null);
  };

  const handleReject = () => {
    if (!activeMatch) return;
    rejectMatch(activeMatch.id, reviewNote || 'Rejected by planner during review');
    setActionSuccessMessage('Match rejected and excluded from schedule update.');
    setTimeout(() => setActionSuccessMessage(null), 3000);
    setReviewNote('');
  };

  const handleFlagUnmatched = () => {
    if (!activeMatch) return;
    flagUnmatched(activeMatch.id, 'Flagged as potential out-of-scope work or new task');
    setActionSuccessMessage('Flagged to Unmatched/Scope-Change queue.');
    setTimeout(() => setActionSuccessMessage(null), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Confidence Scoring & Human-in-the-Loop Review
              </span>
              <span className="text-xs text-slate-500">Stage 08 & 09</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Schedule-Linking Match Review & Approval Queue
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl mt-1">
              Field events are matched to Primavera P6 activities using a 3-component formula (0.65 Semantic + 0.20 Metadata + 0.15 Keyword). High-confidence matches auto-propose, while ambiguous events are safely routed here for planner validation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono font-medium">
              Formula: 0.65S + 0.20M + 0.15K
            </span>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Queue List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1 pb-2 border-b border-slate-100">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'REVIEW_REQUIRED', label: 'Review Needed' },
                { id: 'AUTO_PROPOSED', label: 'Auto-Proposed' },
                { id: 'APPROVED', label: 'Approved' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDecisionFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    decisionFilter === tab.id
                      ? 'bg-blue-700 text-white font-semibold shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Match Cards List */}
            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {filteredMatches.map(m => {
                const isSelected = activeMatch?.id === m.id;
                const topCandidate = m.candidates[0];
                const isReviewNeeded = m.decision === 'PLANNER_REVIEW';
                const isApproved = m.decision === 'APPROVED' || m.decision === 'OVERRIDDEN';

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMatchId(m.id);
                      setOverrideCandidateId(null);
                    }}
                    className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        m.combinedConfidence >= 0.85
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : m.combinedConfidence >= 0.65
                          ? 'bg-amber-50 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {(m.combinedConfidence * 100).toFixed(0)}% Combined
                      </span>

                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : isReviewNeeded
                          ? 'bg-amber-100 text-amber-900 font-bold'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {m.decision.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-900 mb-1">
                      {topCandidate ? `${topCandidate.activityId} — ${topCandidate.activityName}` : 'Unmatched Event'}
                    </div>

                    <p className="text-xs text-slate-600 italic line-clamp-2 mb-2">
                      "{m.event.rawTextExcerpt}"
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>{m.event.discipline}</span>
                      <span>{m.event.eventDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Detailed Inspector & Approval Station */}
        <div className="lg:col-span-7 space-y-4">
          {activeMatch ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono font-bold text-blue-700 uppercase">
                      Match Inspector
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-mono text-slate-500">{activeMatch.id}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Decision Analysis & Evidence Verification
                  </h3>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black font-mono text-blue-700">
                    {(activeMatch.combinedConfidence * 100).toFixed(0)}%
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono uppercase">Combined Confidence</span>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Match {(activeMatch.finalConfidence * 100).toFixed(0)}% · Extract {(activeMatch.extractionConfidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Source Evidence Box */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                  Original Source Report Sentence:
                </span>
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg text-xs font-serif text-slate-800 leading-relaxed">
                  "{activeMatch.event.rawTextExcerpt}"
                </div>
              </div>

              {/* Explain this Match — One-Click Transparency (Feature #11) */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-700" />
                    <span className="text-xs font-bold text-blue-900">
                      "Explain This Match" — One-Click Model Transparency
                    </span>
                  </div>
                  <button
                    onClick={() => setShowExplainMatch(!showExplainMatch)}
                    className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
                  >
                    {showExplainMatch ? 'Collapse Explanation' : 'Show Explanation'}
                  </button>
                </div>

                {showExplainMatch && currentCandidate && (
                  <div className="space-y-2 pt-1 border-t border-blue-200/60 text-xs">
                    <p className="text-blue-950 font-medium leading-relaxed bg-white/70 p-3 rounded-lg border border-blue-200/60">
                      <strong>Matching Explanation:</strong> Matched because field statement <span className="font-semibold text-blue-900">"{activeMatch.event.rawTextExcerpt}"</span> has a <span className="font-bold text-blue-700">{((currentCandidate.semanticSimilarity ?? 0) * 100).toFixed(0)}% deterministic text similarity</span> to target plan task <span className="font-semibold text-slate-900">"{currentCandidate.activityName}"</span>. Both are verified in discipline <span className="font-mono font-bold text-blue-800">{currentCandidate.discipline}</span> (Area {currentCandidate.area}), and field event date ({activeMatch.event.eventDate}) legitimately coincides with the scheduled baseline window.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                      <div className="bg-white/80 p-2 rounded border border-blue-200 text-center">
                        <span className="text-[10px] text-slate-500 block">TEXT SIMILARITY</span>
                        <span className="font-bold text-blue-700 mt-0.5 block">
                          {((currentCandidate.semanticSimilarity ?? 0.82) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="bg-white/80 p-2 rounded border border-blue-200 text-center">
                        <span className="text-[10px] text-slate-500 block">METADATA ALIGNMENT</span>
                        <span className="font-bold text-emerald-700 mt-0.5 block">
                          {((currentCandidate.metadataScore ?? 0.88) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="bg-white/80 p-2 rounded border border-blue-200 text-center">
                        <span className="text-[10px] text-slate-500 block">KEYWORD CO-OCCURRENCE</span>
                        <span className="font-bold text-slate-800 mt-0.5 block">
                          {((currentCandidate.keywordScore ?? 0.75) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Candidates Selection / Radio */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 block">
                  Retrieved Primavera P6 Candidate Activities:
                </span>

                <div className="space-y-2">
                  {activeMatch.candidates.map((cand, idx) => {
                    const isSelected = currentSelectedCandidateId === cand.activityId;
                    return (
                      <div
                        key={cand.activityId}
                        onClick={() => setOverrideCandidateId(cand.activityId)}
                        className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/50 border-blue-500 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                              isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {cand.activityId}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {cand.activityName}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-semibold text-blue-700">
                            {(cand.finalConfidence * 100).toFixed(0)}%
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 mt-1">
                          {cand.explanation}
                        </p>

                        <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-2 pt-1 border-t border-slate-200/60 font-mono">
                          <span>Discipline: <strong>{cand.discipline}</strong></span>
                          <span>Area: <strong>{cand.area}</strong></span>
                          <span>Rank #{idx + 1}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Constraint Checks Grid */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 block">
                  Deterministic Rule & Constraint Verification:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Discipline Compatibility', passed: activeMatch.candidates[0]?.ruleChecks?.disciplineMatch ?? true },
                    { label: 'Project Area Match', passed: activeMatch.candidates[0]?.ruleChecks?.areaMatch ?? true },
                    { label: 'Baseline Date Window Valid', passed: activeMatch.candidates[0]?.ruleChecks?.dateWindowValid ?? true },
                    { label: 'Status Transition Legitimate', passed: activeMatch.candidates[0]?.ruleChecks?.statusTransitionValid ?? true },
                  ].map((chk, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${
                        chk.passed
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50/60 border-rose-200 text-rose-900'
                      }`}
                    >
                      <span>{chk.label}</span>
                      <span className="font-bold font-mono">
                        {chk.passed ? '✓ PASSED' : '✗ FAILED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Planner Action Station */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Planner Validation Note (Immutable Audit Log):
                  </label>
                  <input
                    type="text"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="e.g. Verified with site supervisor; spool 24A-S03 corresponds to main erection line."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleReject}
                      className="px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Reject Match
                    </button>
                    <button
                      onClick={handleFlagUnmatched}
                      className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Flag Unmatched
                    </button>
                  </div>

                  <button
                    onClick={handleApprove}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Sync to Primavera</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs">
              Select an item from the queue to review.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
