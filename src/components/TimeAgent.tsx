import React, { useState } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Mic, 
  MicOff, 
  Radio, 
  Send, 
  ShieldCheck, 
  Sparkles, 
  Volume2 
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { CandidateActivityMatch, MatchRecord, ProgressEvent } from '../types';

export const TimeAgent: React.FC = () => {
  const { processTimeAgentInput, approveMatch, setActiveTab, setSelectedMatchId } = useProject();
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [lastProcessed, setLastProcessed] = useState<{ event: ProgressEvent; match: MatchRecord } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ sender: 'user' | 'agent'; text: string; time: string }>>([
    {
      sender: 'agent',
      text: 'Good day, Supervisor. I am your Oildex Time Agent. Speak or type field progress updates (e.g. "Line 24A started at 10 this morning" or "Spool S03 erected on 24A").',
      time: '08:00',
    }
  ]);

  const quickPrompts = [
    'Line 24A started at 10 this morning, spool S03 erected',
    'Hydrotest for Line 24A delayed due to test pack pending inspection',
    'F11 foundation concrete poured today, 42 cum M35 done',
    'Substation 02 cable tray completed. Pulled 120m feeder cable'
  ];

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText(transcript);
          setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);

        recognition.start();
      } catch (err) {
        setIsListening(true);
        setTimeout(() => {
          setInputText(quickPrompts[0]);
          setIsListening(false);
        }, 1500);
      }
    } else {
      setIsListening(true);
      setTimeout(() => {
        setInputText(quickPrompts[0]);
        setIsListening(false);
      }, 1400);
    }
  };

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setConversationHistory(prev => [...prev, { sender: 'user', text, time: userTime }]);

    const result = processTimeAgentInput(text);
    setLastProcessed(result);
    setConfirmed(false);
    setInputText('');

    const agentReply = `Parsed ${result.event.action} on ${result.event.objectOrTag} (${result.event.discipline}). Top candidate is ${result.match.candidates[0]?.activityId || 'Unmatched'} with ${(result.match.finalConfidence * 100).toFixed(0)}% confidence. Review confirmation card below.`;

    setTimeout(() => {
      setConversationHistory(prev => [
        ...prev, 
        { sender: 'agent', text: agentReply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    }, 400);
  };

  const handleConfirmAndLog = () => {
    if (!lastProcessed) return;
    approveMatch(lastProcessed.match.id, undefined, 'Logged via Supervisor Conversational Time Agent');
    setConfirmed(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                Supervisor Voice & Conversational Time Agent
              </span>
              <span className="text-xs text-slate-500">Stage 01: Frictionless Reporting</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Conversational Voice Time Agent for Field Teams
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl mt-1">
              Supervisors dictate progress updates on mobile or tablet in natural speech. The Time Agent normalizes language, retrieves schedule candidates, and provides an instant confirmation card.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-xs font-mono font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
              Speech Recognition Ready
            </span>
          </div>
        </div>
      </div>

      {/* Main Two Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Chat Console & Voice Input */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col h-[560px] justify-between shadow-xs">
            {/* Messages Scroll Area */}
            <div className="space-y-3 overflow-y-auto pr-1 flex-1 mb-4">
              {conversationHistory.map((msg, idx) => (
                <div 
                  key={idx}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`max-w-[85%] rounded-xl p-3.5 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-700 text-white font-medium'
                      : 'bg-slate-100 text-slate-800 font-mono'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-1 px-1">
                    {msg.sender === 'user' ? 'Supervisor' : 'Time Agent'} • {msg.time}
                  </span>
                </div>
              ))}

              {isListening && (
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-700 p-3 rounded-xl text-xs font-mono animate-pulse">
                  <Radio className="w-4 h-4 text-purple-600 animate-spin" />
                  <span>Listening to field audio stream... speak your update now.</span>
                </div>
              )}
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="pt-3 border-t border-slate-100 mb-3">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">
                Click Sample Field Utterance:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(qp)}
                    className="text-[11px] font-mono bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded px-2.5 py-1 text-left transition-colors cursor-pointer"
                  >
                    "{qp}"
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={toggleListening}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white border-rose-500 animate-pulse'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-slate-100'
                }`}
                title={isListening ? 'Stop listening' : 'Start microphone voice input'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type or dictate site update... e.g. 'Line 24A started at 10 this morning'"
                className="flex-1 bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />

              <button
                onClick={() => handleSend()}
                disabled={!inputText.trim()}
                className="p-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Instant Confirmation Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase">
                    Proposed Schedule Confirmation Card
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Deterministic Guard</span>
              </div>

              {lastProcessed ? (
                <div className="space-y-3.5 mt-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">
                      Raw Supervisor Speech Input
                    </span>
                    <span className="text-xs text-slate-700 italic block mt-0.5">
                      "{lastProcessed.event.rawTextExcerpt}"
                    </span>
                  </div>

                  {lastProcessed.match.candidates[0] && (
                    <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-700 text-white">
                          {lastProcessed.match.candidates[0].activityId}
                        </span>
                        <span className="text-xs font-bold text-emerald-700">
                          {(lastProcessed.match.finalConfidence * 100).toFixed(0)}% Confidence
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-900">
                        {lastProcessed.match.candidates[0].activityName}
                      </div>

                      <div className="text-xs text-slate-600">
                        {lastProcessed.match.candidates[0].explanation}
                      </div>
                    </div>
                  )}

                  {confirmed ? (
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Actual progress logged and synchronized to baseline Gantt!</span>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-2">
                      <button
                        onClick={handleConfirmAndLog}
                        className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm & Log to Baseline Schedule</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedMatchId(lastProcessed.match.id);
                          setActiveTab('review');
                        }}
                        className="w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Send to Planner Review Queue</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs mt-8 space-y-2">
                  <Volume2 className="w-8 h-8 mx-auto text-slate-300" />
                  <p>No active voice event. Speak or select a quick prompt to generate a confirmation card.</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
              Evaluated with identical confidence formula: 0.65×Semantic + 0.20×Metadata + 0.15×Keyword.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
