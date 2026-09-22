import React from 'react';
import { Competency } from '../../types';

interface CompetencyBarChartProps {
  competencies: Competency[];
  onSelectCompetency?: (id: string) => void;
}

export const CompetencyBarChart: React.FC<CompetencyBarChartProps> = ({
  competencies,
  onSelectCompetency,
}) => {
  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Competency Benchmark Index</h3>
          <p className="text-xs text-slate-500">Official Statistical System Competency Baseline (Benchmark: 75%)</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5 text-emerald-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Competent (≥75%)
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Moderate Gap (50-74%)
          </span>
          <span className="inline-flex items-center gap-1.5 text-rose-700">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Critical Gap (&lt;50%)
          </span>
        </div>
      </div>

      <div className="space-y-4 pt-1">
        {competencies.map((comp) => {
          let barColor = 'bg-emerald-500';
          let textColor = 'text-emerald-700';
          let badgeBg = 'bg-emerald-50 border-emerald-200 text-emerald-800';

          if (comp.status === 'moderate_gap') {
            barColor = 'bg-amber-500';
            textColor = 'text-amber-700';
            badgeBg = 'bg-amber-50 border-amber-200 text-amber-800';
          } else if (comp.status === 'critical_gap') {
            barColor = 'bg-rose-500';
            textColor = 'text-rose-700';
            badgeBg = 'bg-rose-50 border-rose-200 text-rose-800';
          }

          return (
            <div
              key={comp.id}
              onClick={() => onSelectCompetency && onSelectCompetency(comp.id)}
              className="group cursor-pointer p-2.5 rounded-lg transition-all hover:bg-slate-50 border border-transparent hover:border-slate-200"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-900 transition-colors">
                    {comp.name}
                  </span>
                  <span className="text-xs text-slate-400 font-mono hidden md:inline">({comp.category})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeBg}`}>
                    {comp.status === 'competent'
                      ? 'Competent'
                      : comp.status === 'moderate_gap'
                      ? 'Moderate Gap'
                      : 'Critical Gap'}
                  </span>
                  <span className={`text-sm font-bold font-mono ${textColor} min-w-[3rem] text-right`}>
                    {comp.score}%
                  </span>
                </div>
              </div>

              {/* Progress bar with 75% benchmark marker */}
              <div className="relative w-full h-3.5 bg-slate-100 rounded-full overflow-hidden">
                {/* 75% benchmark reference line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10 opacity-70"
                  style={{ left: '75%' }}
                  title="Target Benchmark (75%)"
                />
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                  style={{ width: `${comp.score}%` }}
                />
              </div>

              {comp.gapPoints > 0 && (
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>Required: 75%</span>
                  <span className="text-rose-600 font-medium font-mono">
                    Gap: -{comp.gapPoints} pts
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-3 bg-slate-400 inline-block rounded-xs"></span>
          Vertical line indicates minimum mandatory government certification standard (75%).
        </span>
        <span className="font-mono text-slate-400">Formula: Assmt(40%) + Quiz(30%) + Pract(30%)</span>
      </div>
    </div>
  );
};
