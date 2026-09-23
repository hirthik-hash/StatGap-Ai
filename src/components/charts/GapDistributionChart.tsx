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
    <div className="w-full bg-[#FFFDFC] rounded-xl border border-[#DED2C5] p-5 shadow-xs flex flex-col justify-between">
      <div>
        <h3 className="text-base font-bold text-[#2F2520]">Gap Distribution Index</h3>
        <p className="text-xs text-[#6E625A] mb-4">Competency distribution across {total} mapped skill dimensions</p>

        {/* Visual Stacked bar */}
        <div className="w-full h-4 rounded-full overflow-hidden flex bg-[#EEE4D8] mb-5">
          <div
            className="h-full bg-[#547A5A] transition-all duration-700"
            style={{ width: `${competentPct}%` }}
            title={`Competent: ${competentCount}`}
          />
          <div
            className="h-full bg-[#A97838] transition-all duration-700"
            style={{ width: `${moderatePct}%` }}
            title={`Moderate Gaps: ${moderateCount}`}
          />
          <div
            className="h-full bg-[#9A4B42] transition-all duration-700"
            style={{ width: `${criticalPct}%` }}
            title={`Critical Gaps: ${criticalCount}`}
          />
        </div>

        {/* Breakdown items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#EFF6EF] border border-[#A8C9AC]">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#547A5A] ring-2 ring-[#C8DEC8]"></span>
              <span className="text-xs font-semibold text-[#1F5E2A]">Verified Competent</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-xs text-[#2E5B34] font-bold">{competentCount} skills</span>
              <span className="text-[11px] text-[#1F5E2A] bg-[#C8DEC8]/60 px-1.5 py-0.5 rounded">
                {competentPct}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FDF6EC] border border-[#D4A96A]">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#A97838] ring-2 ring-[#EDD8B4]"></span>
              <span className="text-xs font-semibold text-[#7A4F1E]">Moderate Gaps</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-xs text-[#7A4F1E] font-bold">{moderateCount} skills</span>
              <span className="text-[11px] text-[#A97838] bg-[#EDD8B4]/60 px-1.5 py-0.5 rounded">
                {moderatePct}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FBF0EF] border border-[#D4958F]">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#9A4B42] ring-2 ring-[#E8C8C4]"></span>
              <span className="text-xs font-semibold text-[#7A2E2A]">Critical Gaps</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-xs text-[#7A2E2A] font-bold">{criticalCount} skills</span>
              <span className="text-[11px] text-[#9A4B42] bg-[#E8C8C4]/60 px-1.5 py-0.5 rounded">
                {criticalPct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#EEE4D8] text-[11px] text-[#6E625A]">
        Prioritizes remediation for Critical Gaps (Python, AI/ML) and Moderate Gaps (Regression, Data Viz).
      </div>
    </div>
  );
};
