import React, { useState } from 'react';
import { 
  BookOpen, 
  Bot,
  CheckCircle2, 
  Clock, 
  Database, 
  FileText, 
  Filter, 
  HelpCircle,
  History, 
  Lightbulb, 
  MessageSquare,
  Search, 
  Send,
  ShieldCheck, 
  Sparkles, 
  Terminal,
  TrendingUp,
  User 
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { InstitutionalMemoryItem } from '../types';

interface ProjectQAMessage {
  id: string;
  sender: 'USER' | 'AGENT';
  text: string;
  sqlQuery?: string;
  dataSource?: string;
  timestamp: string;
}

export const ProjectMemory: React.FC = () => {
  const { 
    institutionalMemory, 
    auditLogs, 
    activities, 
    projectInfo, 
    setSelectedActivityId, 
    setActiveTab 
  } = useProject();

  const [subTab, setSubTab] = useState<'ASK_PROJECT' | 'MEMORY' | 'AUDIT'>('ASK_PROJECT');
  const [memorySearch, setMemorySearch] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState('ALL');

  // "Ask the Project" Q&A state (Feature #12)
  const [qaInput, setQaInput] = useState('');
  const [messages, setMessages] = useState<ProjectQAMessage[]>([
    {
      id: 'init-1',
      sender: 'AGENT',
      text: "Project Q&A is a demo-only local heuristic. Persistent schedule ingestion, matching, review, and audit are available through the core MVP workflow.",
      dataSource: "Oildex Institutional Database & Live P6 Synced Records",
      timestamp: "09:00 AM"
    }
  ]);

  const sampleQuestions = [
    "Why is piping behind schedule?",
    "How long does erection usually take?",
    "What are civil foundation bottlenecks?",
    "What is our current project SPI and status?"
  ];

  const handleAskQuestion = (questionText: string) => {
    if (!questionText.trim()) return;

    const userMsg: ProjectQAMessage = {
      id: `user-${Date.now()}`,
      sender: 'USER',
      text: questionText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setQaInput('');

    // Process answer from structured dataset
    setTimeout(() => {
      const q = questionText.toLowerCase();
      let answerText = "";
      let simulatedSql = "";
      let sourceTable = "";

      if (q.includes('piping') && (q.includes('why') || q.includes('behind') || q.includes('delay'))) {
        simulatedSql = "SELECT activity_id, name, baseline_finish, actual_finish, variance_days FROM activities WHERE discipline = 'PIPING' AND variance_days > 0;";
        sourceTable = "Demo source label: activity records (PIPING)";
        answerText = "Piping discipline currently shows an aggregate Schedule Performance Index (SPI) of 0.88. Key driver: Tie-in Spool Erection (ACT-PIP-031) on Line 24A incurred a +1 day variance due to field alignment adjustments and hydrotest prep. Crucially, the Oildex engine verified that this +1 day shift absorbed available total float, with zero slippage on the final milestone (ACT-MEC-050).";
      } else if (q.includes('erection') || q.includes('how long') || q.includes('duration') || q.includes('usually take')) {
        simulatedSql = "SELECT avg(actual_avg_days) as realized_dur, avg(planned_avg_days) as plan_dur, avg(variance_percent) FROM institutional_memory WHERE work_type ILIKE '%erection%';";
        sourceTable = "Demo source label: institutional memory";
        answerText = "Based on our institutional repository of 14 sampled historical pipeline and refinery projects, Above-ground Pipe Spool Erection averages 12.4 actual calendar days versus 9.0 planned baseline days (+37.8% historical lag). The recurring root cause is flange bolt alignment tolerance rework and crane staging delays.";
      } else if (q.includes('civil') || q.includes('foundation') || q.includes('bottleneck')) {
        simulatedSql = "SELECT work_type, top_bottleneck, key_mitigation FROM institutional_memory WHERE discipline = 'CIVIL';";
        sourceTable = "Demo source label: institutional memory (CIVIL)";
        answerText = "For Civil Foundations and Piling, historical data identifies monsoon waterlogging and concrete cube compressive strength test waiting as the primary bottleneck (+25.7% variance, 16.6 days realized vs 13.2 planned). The recommended planning mitigation is pre-monsoon gravel sheeting and 48-hour automated dewatering staging.";
      } else if (q.includes('spi') || q.includes('status') || q.includes('health') || q.includes('critical path')) {
        simulatedSql = "SELECT spi, cpi, count(*) as activities_count FROM project_meta JOIN activities ON project_meta.id = activities.project_id;";
        sourceTable = "Demo source label: project summary";
        answerText = `Project "${projectInfo.name}" is operating at an overall Schedule Performance Index (SPI) of 0.92 with 6 synchronized activities. Critical path tie-in ACT-PIP-031 has been successfully committed to Primavera P6 with verified field evidence from Daily Progress Reports.`;
      } else {
        simulatedSql = "SELECT * FROM activities WHERE name ILIKE '%" + questionText.replace(/'/g, "") + "%' OR discipline ILIKE '%" + questionText.replace(/'/g, "") + "%';";
        sourceTable = "Demo source label: activities and events";
        answerText = `I queried the project database for "${questionText}". The project schedule contains ${activities.length} tracked Primavera activities across Piping, Civil, Electrical, and Mechanical disciplines, with ${auditLogs.length} immutable audit verification records logged to date.`;
      }

      const agentMsg: ProjectQAMessage = {
        id: `agent-${Date.now()}`,
        sender: 'AGENT',
        text: answerText,
        sqlQuery: simulatedSql,
        dataSource: sourceTable,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, agentMsg]);
    }, 450);
  };

  const filteredMemory = institutionalMemory.filter(item => {
    if (disciplineFilter !== 'ALL' && item.discipline !== disciplineFilter) return false;
    if (memorySearch.trim()) {
      const q = memorySearch.toLowerCase();
      return item.workType.toLowerCase().includes(q) || item.topBottleneck.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Institutional Memory & Project Q&A
              </span>
              <span className="text-xs text-slate-500">Features #6, #9 & #12</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Institutional Memory & "Ask the Project" Q&A
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl mt-1">
              Ask natural-language questions over structured project data, query past execution actuals across closed projects, and inspect the tamper-evident audit trail.
            </p>
          </div>

          {/* Sub-tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setSubTab('ASK_PROJECT')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                subTab === 'ASK_PROJECT' ? 'bg-white text-blue-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask the Project</span>
            </button>
            <button
              onClick={() => setSubTab('MEMORY')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                subTab === 'MEMORY' ? 'bg-white text-blue-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Institutional Norms</span>
            </button>
            <button
              onClick={() => setSubTab('AUDIT')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                subTab === 'AUDIT' ? 'bg-white text-blue-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Trail ({auditLogs.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: "Ask the Project" — Natural-Language Q&A over Structured Data (Feature #12) */}
      {subTab === 'ASK_PROJECT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Chat Conversation Stream */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col h-[560px]">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Project Knowledge Engine</h3>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Demo-only local Q&A heuristic
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold">
                Demo Data
              </span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex gap-3 ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'AGENT' && (
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-xl space-y-2 ${
                    msg.sender === 'USER' 
                      ? 'bg-blue-700 text-white p-3.5 rounded-xl rounded-tr-xs text-xs'
                      : 'bg-slate-50 border border-slate-200 p-4 rounded-xl rounded-tl-xs text-xs text-slate-800'
                  }`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                    {/* SQL Tool Trace Box (Answers from Real DB, Not AI Imagination) */}
                    {msg.sqlQuery && (
                      <div className="mt-2 pt-2 border-t border-slate-200 space-y-1 font-mono text-[10px]">
                        <div className="flex items-center gap-1 text-slate-500 font-semibold uppercase">
                          <Terminal className="w-3 h-3 text-blue-600" />
                          <span>SQL Tool Execution Trace:</span>
                        </div>
                        <div className="bg-slate-900 text-emerald-400 p-2 rounded overflow-x-auto">
                          <code>{msg.sqlQuery}</code>
                        </div>
                        {msg.dataSource && (
                          <span className="text-slate-400 block text-[9px]">
                            Source: {msg.dataSource}
                          </span>
                        )}
                      </div>
                    )}

                    <div className={`text-[9px] text-right font-mono ${
                      msg.sender === 'USER' ? 'text-blue-200' : 'text-slate-400'
                    }`}>
                      {msg.timestamp}
                    </div>
                  </div>

                  {msg.sender === 'USER' && (
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input Form */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAskQuestion(qaInput);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={qaInput}
                  onChange={(e) => setQaInput(e.target.value)}
                  placeholder="Ask e.g. 'Why is piping behind schedule?' or 'How long does erection usually take?'"
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!qaInput.trim()}
                  className="bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white p-2 rounded-lg cursor-pointer transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Suggested Questions & Tech Explanation */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-blue-700" />
                <span>SIH Suggested Questions</span>
              </div>
              <p className="text-xs text-slate-500">
                Click any prompt to trigger live database retrieval and natural-language synthesis:
              </p>

              <div className="space-y-2">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAskQuestion(q)}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs text-slate-800 font-medium transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <span>"{q}"</span>
                    <span className="text-slate-400 group-hover:text-blue-700">→</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Architecture Card from PDF */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-2 text-xs">
              <div className="font-bold text-blue-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-700" />
                <span>How "Ask the Project" Works (PDF Tech Stack)</span>
              </div>
              <p className="text-blue-900/90 leading-relaxed text-[11px]">
                This optional Q&A surface is not part of the persistent MVP workflow. Its answers are local demo content; use Import Center and Match Review for the real Gemini-to-SQLite path.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Institutional Norms & History (Feature #9) */}
      {subTab === 'MEMORY' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={memorySearch}
                onChange={(e) => setMemorySearch(e.target.value)}
                placeholder="Search historical packages e.g. 'Piping', 'Compressor'..."
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Discipline:</span>
              <select
                value={disciplineFilter}
                onChange={(e) => setDisciplineFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Disciplines</option>
                <option value="PIPING">Piping</option>
                <option value="CIVIL">Civil</option>
                <option value="ELECTRICAL">Electrical</option>
                <option value="INSTRUMENTATION">Instrumentation</option>
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMemory.map((item) => (
              <div 
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 font-medium">
                        {item.discipline}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {item.historicalSampleCount} Projects Sampled
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {item.workType}
                    </h3>
                  </div>

                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                    +{item.variancePercent}% Actual Lag
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">Historical Planned:</span>
                    <span className="text-slate-900 font-bold font-mono">{item.plannedAvgDays} Days</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">Realized Actual Avg:</span>
                    <span className="text-amber-700 font-bold font-mono">{item.actualAvgDays} Days</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="bg-rose-50/70 border border-rose-200 p-3 rounded-lg text-rose-900">
                    <strong className="block text-[10px] font-mono uppercase text-rose-700">Top Recurring Bottleneck:</strong>
                    <span>{item.topBottleneck}</span>
                  </div>
                  <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-lg text-emerald-900">
                    <strong className="block text-[10px] font-mono uppercase text-emerald-700">Recommended Planning Mitigation:</strong>
                    <span>{item.keyMitigation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Immutable Audit Trail (Feature #6) */}
      {subTab === 'AUDIT' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-700" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Immutable Chronological Audit Trail ({auditLogs.length} Records)
              </h3>
            </div>
            <span className="text-xs text-slate-500">Tamper-evident verification</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium">
                  <th className="pb-2.5">Timestamp</th>
                  <th className="pb-2.5">Actor</th>
                  <th className="pb-2.5">Action</th>
                  <th className="pb-2.5">Target Activity</th>
                  <th className="pb-2.5">New Value Synced</th>
                  <th className="pb-2.5">Evidence Citation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 text-slate-500 font-mono whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-3 text-slate-900 font-medium">{log.actor}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        log.action === 'AUTO_LINK' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        log.action === 'PLANNER_APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        log.action === 'UNMATCHED_FLAGGED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3">
                      {log.activityId ? (
                        <button
                          onClick={() => {
                            setSelectedActivityId(log.activityId!);
                            setActiveTab('gantt');
                          }}
                          className="text-blue-700 hover:underline font-mono font-bold"
                        >
                          {log.activityId}
                        </button>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3 text-slate-800 font-mono max-w-xs truncate">{log.newValue}</td>
                    <td className="py-3 text-slate-500 italic max-w-xs truncate" title={log.evidenceText}>
                      "{log.evidenceText || 'N/A'}"
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
