import React, { useState } from 'react';
import { 
  AlertOctagon, 
  AlertTriangle, 
  BarChart2, 
  CheckCircle, 
  Clock, 
  FileCheck, 
  PieChart, 
  ShieldAlert, 
  TrendingDown, 
  TrendingUp, 
  Users 
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';

export const Analytics: React.FC = () => {
  const { delays, projectInfo, activities } = useProject();

  // Contractor Data Quality Scores
  const contractorScores = [
    { contractor: 'Piping EPC (Essar Fab)', discipline: 'PIPING', completeness: 92, onTimeRate: 88, ambiguousRate: 14, score: 86 },
    { contractor: 'Civil Foundations (L&T Sub)', discipline: 'CIVIL', completeness: 96, onTimeRate: 94, ambiguousRate: 5, score: 95 },
    { contractor: 'Electrical Consortium (Siemens-Power)', discipline: 'ELECTRICAL', completeness: 90, onTimeRate: 85, ambiguousRate: 10, score: 89 },
    { contractor: 'Instrumentation & DCS (Yokogawa Partner)', discipline: 'INSTRUMENTATION', completeness: 88, onTimeRate: 82, ambiguousRate: 18, score: 84 },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Delay Taxonomy & Execution Analytics
              </span>
              <span className="text-xs text-slate-500">Stage 08 & 10</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Project Performance & Delay Root Cause Analytics
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl mt-1">
              Reconciled field events expose systemic project bottlenecks—such as Third-Party TPI test-pack clearance and monsoon flooding—before they derail the commissioning deadline.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-500 block text-[11px]">Schedule Lag:</span>
              <span className="text-rose-600 font-bold font-mono">-5.6% Variance</span>
            </div>
          </div>
        </div>
      </div>

      {/* S-Curve & Delay Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): S-Curve Visualization */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-700" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Planned vs Actual Cumulative S-Curve
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">*Data Date: 05-Sep-2026</span>
          </div>

          {/* Clean SVG S-Curve */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative">
            <svg viewBox="0 0 500 200" className="w-full h-48 overflow-visible">
              {/* Grid Lines */}
              {[0, 25, 50, 75, 100].map((val, idx) => (
                <g key={idx}>
                  <line 
                    x1="40" 
                    y1={180 - (val * 1.6)} 
                    x2="480" 
                    y2={180 - (val * 1.6)} 
                    stroke="#e2e8f0" 
                    strokeDasharray="2,2" 
                  />
                  <text x="10" y={184 - (val * 1.6)} fill="#94a3b8" fontSize="10" fontFamily="monospace">
                    {val}%
                  </text>
                </g>
              ))}

              {/* Data Date Cutoff Line */}
              <line x1="285" y1="10" x2="285" y2="185" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4,4" />
              <text x="290" y="25" fill="#f43f5e" fontSize="10" fontWeight="bold" fontFamily="monospace">
                05-SEP CUT-OFF
              </text>

              {/* Planned Baseline Curve (Slate Blue) */}
              <path
                d="M 50 164 Q 160 130 285 70 T 470 20"
                fill="none"
                stroke="#64748b"
                strokeWidth="2.5"
              />

              {/* Actual Progress Curve (Emerald) */}
              <path
                d="M 50 164 Q 160 135 285 80"
                fill="none"
                stroke="#059669"
                strokeWidth="3"
              />

              {/* Data Points */}
              {[
                { cx: 50, cy: 164, label: '10%' },
                { cx: 105, cy: 146, label: '21%' },
                { cx: 165, cy: 122, label: '36%' },
                { cx: 225, cy: 98, label: '51%' },
                { cx: 285, cy: 80, label: '62.8%' },
              ].map((pt, idx) => (
                <g key={idx}>
                  <circle cx={pt.cx} cy={pt.cy} r="4" fill="#059669" stroke="#ffffff" strokeWidth="2" />
                  <text x={pt.cx - 10} y={pt.cy - 8} fill="#059669" fontSize="9" fontWeight="bold" fontFamily="monospace">
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>

            {/* S-Curve Legend */}
            <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-200 mt-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-1 bg-slate-500 rounded"></span>
                  <span className="text-slate-600">Baseline Plan</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-1 bg-emerald-600 rounded"></span>
                  <span className="text-emerald-700 font-bold">Approved Actual</span>
                </div>
              </div>
              <span className="text-amber-700 font-semibold">Lag: -5.6%</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Variance updates dynamically in real-time as each field event is approved by the planner.
          </p>
        </div>

        {/* Right (5 cols): Delay Taxonomy Breakdown */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Delay Taxonomy & Root Causes
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">{delays.length} active holds</span>
          </div>

          <div className="space-y-2.5">
            {[
              { cat: 'TEST_PACK_PENDING', label: 'Third-Party TPI Test Pack Hold', days: 1, discipline: 'PIPING' },
              { cat: 'MANPOWER_SHORTAGE', label: '6G Coded Welder Mobilization', days: 2, discipline: 'PIPING' },
              { cat: 'WEATHER_INCLEMENT', label: 'Monsoon Flash Rain & Dewatering', days: 1, discipline: 'CIVIL' },
              { cat: 'DRAWING_PENDING', label: 'AFC Tolerance Drawing Approval', days: 1, discipline: 'MECHANICAL' },
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900">{item.label}</span>
                  <span className="text-rose-600 font-bold font-mono">+{item.days} Day</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Discipline: <strong>{item.discipline}</strong></span>
                  <span className="font-mono text-slate-400">{item.cat}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900">
            <strong className="text-amber-800">Primary Bottleneck:</strong> TPI Inspector clearance delay on Line 24A test pack currently impacts the 11-Sep compressor skids milestone.
          </div>
        </div>
      </div>

      {/* Contractor & Discipline Data Quality Scorecard */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Contractor Reporting Quality Scorecard
            </h3>
          </div>
          <span className="text-xs text-slate-500">Evaluates reporting freshness and ambiguity</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-medium">
                <th className="pb-2.5">Contractor / Package</th>
                <th className="pb-2.5">Discipline</th>
                <th className="pb-2.5 text-center">Completeness</th>
                <th className="pb-2.5 text-center">On-Time Rate</th>
                <th className="pb-2.5 text-center">Ambiguous Rate</th>
                <th className="pb-2.5 text-right">Data Quality Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contractorScores.map((c, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3 text-slate-900 font-medium">{c.contractor}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium">
                      {c.discipline}
                    </span>
                  </td>
                  <td className="py-3 text-center text-slate-700">{c.completeness}%</td>
                  <td className="py-3 text-center text-slate-700">{c.onTimeRate}%</td>
                  <td className="py-3 text-center text-amber-700 font-medium">{c.ambiguousRate}%</td>
                  <td className="py-3 text-right">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${
                      c.score >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      c.score >= 85 ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {c.score}/100
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
