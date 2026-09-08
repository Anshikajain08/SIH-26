import React from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { Navbar } from './components/Navbar';
import { ImportCenter } from './components/ImportCenter';
import { AIExtraction } from './components/AIExtraction';
import { MatchReview } from './components/MatchReview';
import { GanttChart } from './components/GanttChart';
import { AuditLog } from './components/AuditLog';
import { ActivityDetailDrawer } from './components/ActivityDetailDrawer';

const AppContent: React.FC = () => {
  const { activeTab } = useProject();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'import' && <ImportCenter />}
        {activeTab === 'extraction' && <AIExtraction />}
        {activeTab === 'review' && <MatchReview />}
        {activeTab === 'gantt' && <GanttChart />}
        {activeTab === 'audit' && <AuditLog />}
      </main>

      {/* Activity Detail Slide-Over Drawer */}
      <ActivityDetailDrawer />

      {/* Product footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-blue-700 font-bold">Oildex</span>
            <span>•</span>
            <span>Field progress and schedule control</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Gemini Extraction + Embedding Semantic Matching + SQLite Persistence
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}
