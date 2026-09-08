import React from 'react';
import { 
  Calendar, 
  FileText, 
  Layers, 
  ShieldCheck, 
  Database
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';

export const Navbar: React.FC = () => {
  const { 
    projectInfo, 
    activeTab, 
    setActiveTab, 
    matches
  } = useProject();

  const pendingReviewCount = matches.filter(m => m.decision === 'PLANNER_REVIEW').length;

  const navItems = [
    { id: 'import', label: 'Ingest', icon: FileText, highlight: true },
    { id: 'extraction', label: 'Extracted Events', icon: Layers },
    { 
      id: 'review', 
      label: 'Match Review', 
      icon: ShieldCheck, 
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined 
    },
    { id: 'gantt', label: 'Schedule', icon: Calendar },
    { id: 'audit', label: 'Audit Log', icon: Database },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Bar: Brand, Project Info & Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Logo & Project Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-700 flex items-center justify-center text-white font-black text-sm shadow-sm tracking-tight">
            OIL
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider text-blue-700 uppercase font-mono">
                OIL INDIA LIMITED
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">Oil India Limited</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Oildex Connected
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              Oildex <span className="font-normal text-slate-400">|</span> <span className="text-slate-600 text-xs sm:text-sm font-normal truncate max-w-xs sm:max-w-md">Planning-to-Execution Linking Layer</span>
            </h1>
          </div>
        </div>

        {/* Product status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Data Cut-off Badge */}
          <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-500">Cut-off Data Date:</span>
            <span className="font-mono font-semibold text-slate-800">{projectInfo.dataDate}</span>
          </div>

          {/* Schedule health */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-500">SPI:</span>
                <span className="font-mono font-bold text-amber-700">{projectInfo.spi.toFixed(2)}</span>
          </div>

        </div>
      </div>

      {/* Clean Light Nav Tabs */}
      <div className="border-t border-slate-200 bg-slate-50/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto no-scrollbar">
          <nav className="flex space-x-1 py-1.5" aria-label="Tabs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
