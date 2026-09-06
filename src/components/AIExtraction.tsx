import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  Code, 
  Copy, 
  FileText, 
  Filter, 
  Layers, 
  Search, 
  Sparkles, 
  Tag 
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { DifficultyBucket, ProgressEvent } from '../types';

export const AIExtraction: React.FC = () => {
  const { events, setActiveTab, setSelectedMatchId } = useProject();
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);

  const filteredEvents = events.filter(e => {
    if (difficultyFilter !== 'ALL' && e.difficulty !== difficultyFilter) return false;
    return true;
  });

  const currentEvent: ProgressEvent | undefined = events.find(e => e.id === selectedEventId) || filteredEvents[0];

  const handleCopyJson = () => {
    if (!currentEvent) return;
    const jsonStr = JSON.stringify(
      {
        event_id: currentEvent.id,
        discipline: currentEvent.discipline,
        action: currentEvent.action,
        object: currentEvent.objectOrTag,
        event_date: currentEvent.eventDate,
        status: currentEvent.status,
        quantity: currentEvent.quantity ?? null,
        unit: currentEvent.unit ?? null,
        raw_source_text: currentEvent.rawTextExcerpt,
        ground_truth_id: currentEvent.groundTruthActivityId ?? 'UNMATCHED_SCOPE',
      },
      null,
      2
    );
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                AI Extraction & Normalization
              </span>
              <span className="text-xs text-slate-500">Stage 04: Structured Fact Schema</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Free-Text to Structured ProgressEvent Schema
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl mt-1">
              Extracts verifiable facts (discipline, action, object/tag, date, status, quantity) from messy shift logs while strictly preserving the raw source sentence for dispute verification and auditability.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono font-medium">
              {events.length} Events Normalized
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 mr-2">Difficulty Tier:</span>
          {[
            { id: 'ALL', label: 'All Tiers' },
            { id: 'EASY', label: 'Easy (Exact Match)' },
            { id: 'PARAPHRASED', label: 'Paraphrased / Synonym' },
            { id: 'NOISY', label: 'Noisy / Mixed' },
            { id: 'AMBIGUOUS', label: 'Ambiguous (Review Required)' },
            { id: 'UNMATCHED', label: 'Unmatched (New Scope)' },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setDifficultyFilter(btn.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                difficultyFilter === btn.id
                  ? 'bg-blue-700 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Two-Column Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Events Table */}
        <div className="lg:col-span-5 space-y-2.5">
          {filteredEvents.map(evt => {
            const isSelected = (currentEvent?.id === evt.id);
            return (
              <div
                key={evt.id}
                onClick={() => setSelectedEventId(evt.id)}
                className={`p-4 rounded-xl border transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/50 border-blue-500 shadow-xs ring-1 ring-blue-500'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800">
                      {evt.discipline}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {evt.action} {evt.objectOrTag}
                    </span>
                  </div>

                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    evt.difficulty === 'EASY' ? 'bg-emerald-100 text-emerald-800' :
                    evt.difficulty === 'AMBIGUOUS' ? 'bg-amber-100 text-amber-900 font-bold' :
                    evt.difficulty === 'UNMATCHED' ? 'bg-rose-100 text-rose-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {evt.difficulty}
                  </span>
                </div>

                <p className="text-xs text-slate-600 italic line-clamp-2 mb-2">
                  "{evt.rawTextExcerpt}"
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>Date: <strong>{evt.eventDate}</strong></span>
                  <span className="text-blue-700 font-semibold">{evt.status}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column (7 cols): JSON Schema & Detail Station */}
        <div className="lg:col-span-7 space-y-4">
          {currentEvent ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-mono font-bold text-blue-700 uppercase">
                    Normalized Event Schema
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {currentEvent.id}
                  </h3>
                </div>

                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy Schema JSON'}</span>
                </button>
              </div>

              {/* Legal Raw Source Excerpt */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Original Source Report Quote:
                </span>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-serif text-slate-800 italic leading-relaxed">
                  "{currentEvent.rawTextExcerpt}"
                </div>
              </div>

              {/* Extracted Fields Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase block font-mono">Discipline</span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block">{currentEvent.discipline}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase block font-mono">Normalized Action</span>
                  <span className="text-xs font-bold text-blue-700 mt-0.5 block">{currentEvent.action}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase block font-mono">Target Tag / Object</span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block">{currentEvent.objectOrTag}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase block font-mono">Date</span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block font-mono">{currentEvent.eventDate}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase block font-mono">Status Extracted</span>
                  <span className="text-xs font-bold text-emerald-700 mt-0.5 block">{currentEvent.status}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <span className="text-[10px] text-slate-500 uppercase block font-mono">Report Format</span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block">{currentEvent.sourceType}</span>
                </div>
              </div>

              {/* Interactive Next Step */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Next Pipeline Step: Candidate Retrieval
                  </span>
                  <span className="text-xs text-slate-500">
                    Target Primavera Activity: <strong className="text-blue-700">{currentEvent.groundTruthActivityId || 'Unmatched'}</strong>
                  </span>
                </div>

                <button
                  onClick={() => {
                    setActiveTab('review');
                  }}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Go to Match Review</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs">
              Select an event on the left.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
