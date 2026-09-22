import React from 'react';
import { Competency } from '../../types';

interface GapDistributionChartProps {
  competencies: Competency[];
}

export const GapDistributionChart: React.FC<GapDistributionChartProps> = ({ competencies }) => {
  const competentCount = competencies.filter((c) => c.status === 'competent').length;
  const moderateCount = competencies.filter((c) => c.status === 'moderate_gap').length;
  const criticalCount = competencies.filter((c) => c.status === 'critical_gap').length;
  const total = competencies.length;

  const competentPct = Math.round((competentCount / total) * 100);
  const moderatePct = Math.round((moderateCount / total) * 100);
  const criticalPct = Math.round((criticalCount / total) * 100);

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <h3 className="text-base font-bold text-slate-900">Gap Distribution Index</h3>
        <p className="text-xs text-slate-500 mb-4">Competency distribution across {total} mapped skill dimensions</p>

        {/* Visual Stacked bar */}
        <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-100 mb-5">
          <div
            className="h-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${competentPct}%` }}
            title={`Competent: ${competentCount}`}
          />
          <div
            className="h-full bg-amber-500 transition-all duration-700"
            style={{ width: `${moderatePct}%` }}
            title={`Moderate Gaps: ${moderateCount}`}
          />
          <div
            className="h-full bg-rose-500 transition-all duration-700"
            style={{ width: `${criticalPct}%` }}
            title={`Critical Gaps: ${criticalCount}`}
          />
        </div>

        {/* Breakdown items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
              <span className="text-xs font-semibold text-emerald-950">Verified Competent</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-xs text-emerald-800 font-bold">{competentCount} skills</span>
              <span className="text-[11px] text-emerald-600 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                {competentPct}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/60 border border-amber-100">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-amber-200"></span>
              <span className="text-xs font-semibold text-amber-950">Moderate Gaps</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-xs text-amber-800 font-bold">{moderateCount} skills</span>
              <span className="text-[11px] text-amber-600 bg-amber-100/70 px-1.5 py-0.5 rounded">
                {moderatePct}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/60 border border-rose-100">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 ring-2 ring-rose-200"></span>
              <span className="text-xs font-semibold text-rose-950">Critical Gaps</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-xs text-rose-800 font-bold">{criticalCount} skills</span>
              <span className="text-[11px] text-rose-600 bg-rose-100/70 px-1.5 py-0.5 rounded">
                {criticalPct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
        Prioritizes remediation for Critical Gaps (Python, AI/ML) and Moderate Gaps (Regression, Data Viz).
      </div>
    </div>
  );
};
