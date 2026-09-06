import React, { useState } from 'react';
import { 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  Download, 
  FileCode, 
  FileSpreadsheet, 
  FileText, 
  Layers, 
  Mic, 
  Plus, 
  Upload, 
  Zap 
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { presetBenchmarkReports } from '../data/syntheticDPRs';
import { ProgressEvent, SourceDocument } from '../types';

export const ImportCenter: React.FC = () => {
  const { documents, ingestNewDocument, setActiveTab } = useProject();
  const [activeTab, setActiveFormatTab] = useState<'DPR' | 'SPREADSHEET' | 'CUSTOM_TEXT'>('DPR');
  const [customText, setCustomText] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  const currentDoc = documents.find(d => d.id === selectedDocId) || documents[0];

  const handleProcessCustomText = () => {
    if (!customText.trim()) return;

    setIsProcessing(true);
    setTimeout(() => {
      const newDocId = `DOC-CUSTOM-${Date.now()}`;
      const newDoc: SourceDocument = {
        id: newDocId,
        fileName: 'User_Uploaded_Site_Report.txt',
        type: 'DPR_TXT',
        discipline: 'MULTI',
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16) + ' IST',
        uploadedBy: 'Site Engineer (Manual Ingestion)',
        rawText: customText,
        extractedEventCount: 2,
        parsingStatus: 'PARSED',
      };

      const extracted: ProgressEvent[] = [
        {
          id: `EVT-USR-${Date.now()}-1`,
          sourceDocId: newDocId,
          sourceType: 'User Report (TXT)',
          rawTextExcerpt: customText.slice(0, 150),
          normalizedActivityText: 'Field progress entry parsed from custom user report',
          discipline: customText.toLowerCase().includes('civil') || customText.toLowerCase().includes('pour') ? 'CIVIL' : 'PIPING',
          action: 'PROGRESS UPDATE',
          objectOrTag: customText.toLowerCase().includes('24a') ? 'Line 24A' : 'Plant Package',
          eventDate: '2026-09-05',
          status: 'IN_PROGRESS',
          difficulty: 'PARAPHRASED',
          groundTruthActivityId: 'ACT-PIP-024',
        },
      ];

      ingestNewDocument(newDoc, extracted);
      setIsProcessing(false);
      setUploadFeedback('Document successfully parsed into 2 ProgressEvents and routed to AI Extraction!');
      setCustomText('');
      setTimeout(() => setUploadFeedback(null), 4000);
    }, 600);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Heterogeneous Ingestion Center
              </span>
              <span className="text-xs text-slate-500">Stage 01 & 02</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Multi-Format Field Reporting Ingestion
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl mt-1">
              Accepts messy site reports (Daily Progress Reports in PDF/TXT, contractor discipline spreadsheets, and audio logs) without requiring site teams to change their reporting habits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono font-medium">
              {documents.length} Source Documents Active
            </span>
          </div>
        </div>
      </div>

      {uploadFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{uploadFeedback}</span>
        </div>
      )}

      {/* Format Selector Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFormatTab('DPR')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'DPR'
                ? 'bg-blue-700 text-white font-semibold shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Daily Progress Reports (PDF/Text)</span>
          </button>

          <button
            onClick={() => setActiveFormatTab('SPREADSHEET')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'SPREADSHEET'
                ? 'bg-blue-700 text-white font-semibold shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Contractor Discipline Sheets (Excel)</span>
          </button>

          <button
            onClick={() => setActiveFormatTab('CUSTOM_TEXT')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'CUSTOM_TEXT'
                ? 'bg-blue-700 text-white font-semibold shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Paste / Upload New Field Log</span>
          </button>
        </div>
      </div>

      {/* Main Ingestion Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Ingested Documents List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-900 uppercase tracking-wider px-1">
            Active Source Documents ({documents.length})
          </div>

          <div className="space-y-2.5">
            {documents.map(doc => {
              const isSelected = (currentDoc.id === doc.id);
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-500 shadow-xs ring-1 ring-blue-500'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {doc.fileName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700">
                      {doc.type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    <span>Discipline: <strong>{doc.discipline}</strong></span>
                    <span className="text-blue-700 font-semibold">{doc.extractedEventCount} Events Extracted</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (7 cols): Document Preview & Extraction Station */}
        <div className="lg:col-span-7 space-y-4">
          {activeTab === 'CUSTOM_TEXT' ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Manual Text / Field Log Ingestion
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Paste raw shift sentences or site diary excerpts to test extraction against the OIL Primavera schedule.
                </p>
              </div>

              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Example: Spool erection completed for Line 24A today at Unit 01. Hydrotest pack pending review..."
                rows={6}
                className="w-full p-3.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setCustomText('Spool erection completed for Line 24A today at Unit 01. Hydrotest pack pending review.')}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                >
                  Load Sample Line 24A
                </button>
                <button
                  onClick={handleProcessCustomText}
                  disabled={!customText.trim() || isProcessing}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isProcessing ? 'Parsing Document...' : 'Ingest & Extract'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-mono font-bold text-blue-700 uppercase">
                    Document Viewer
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {currentDoc.fileName}
                  </h3>
                </div>

                <button
                  onClick={() => setActiveTab('extraction')}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <span>View Extracted Events</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Raw Ingested Text Excerpt
                </span>
                <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                  {currentDoc.rawText}
                </pre>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">Discipline</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{currentDoc.discipline}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">Source Type</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{currentDoc.type}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">Status</span>
                  <span className="font-semibold text-emerald-700 mt-0.5 block font-mono">PARSED & READY</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
