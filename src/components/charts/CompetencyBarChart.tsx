import React from 'react';
import { Competency } from '../../types';
import { STAT_CHART_COLORS } from '../../utils/chartColors';

interface CompetencyBarChartProps {
  competencies: Competency[];
  onSelectCompetency?: (id: string) => void;
}

export const CompetencyBarChart: React.FC<CompetencyBarChartProps> = ({
  competencies,
  onSelectCompetency,
}) => {
  return (
    <div className="w-full bg-[#FFFDFC] rounded-xl border border-[#DED2C5] p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-[#EEE4D8]">
        <div>
          <h3 className="text-base font-bold text-[#2F2520] tracking-tight">Competency Benchmark Index</h3>
          <p className="text-xs text-[#6E625A]">Official Statistical System Competency Baseline (Benchmark: 75%)</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5 text-[#547A5A]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#547A5A]"></span> Competent (≥75%)
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#A97838]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A97838]"></span> Moderate Gap (50-74%)
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#9A4B42]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9A4B42]"></span> Critical Gap (&lt;50%)
          </span>
        </div>
      </div>

      <div className="space-y-4 pt-1">
        {competencies.map((comp) => {
          let barColor = 'bg-[#547A5A]';
          let textColor = 'text-[#547A5A]';
          let badgeBg = 'bg-[#EFF6EF] border-[#A8C9AC] text-[#2E5B34]';

          if (comp.status === 'moderate_gap') {
            barColor = 'bg-[#A97838]';
            textColor = 'text-[#A97838]';
            badgeBg = 'bg-[#FDF6EC] border-[#D4A96A] text-[#7A4F1E]';
          } else if (comp.status === 'critical_gap') {
            barColor = 'bg-[#9A4B42]';
            textColor = 'text-[#9A4B42]';
            badgeBg = 'bg-[#FBF0EF] border-[#D4958F] text-[#7A2E2A]';
          }

          return (
            <div
              key={comp.id}
              onClick={() => onSelectCompetency && onSelectCompetency(comp.id)}
              className="group cursor-pointer p-2.5 rounded-lg transition-all hover:bg-[#F8F3EB] border border-transparent hover:border-[#DED2C5]"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#2F2520] group-hover:text-[#6B4A35] transition-colors">
                    {comp.name}
                  </span>
                  <span className="text-xs text-[#93877D] font-mono hidden md:inline">({comp.category})</span>
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
              <div className="relative w-full h-3.5 bg-[#EEE4D8] rounded-full overflow-hidden">
                {/* 75% benchmark reference line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[#8A6A52] z-10 opacity-70"
                  style={{ left: '75%' }}
                  title="Target Benchmark (75%)"
                />
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                  style={{ width: `${comp.score}%` }}
                />
              </div>

              {comp.gapPoints > 0 && (
                <div className="flex justify-between text-[11px] text-[#6E625A] mt-1">
                  <span>Required: 75%</span>
                  <span className="text-[#9A4B42] font-medium font-mono">
                    Gap: -{comp.gapPoints} pts
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[#EEE4D8] flex items-center justify-between text-xs text-[#6E625A]">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-3 bg-[#8A6A52] inline-block rounded-xs"></span>
          Vertical line indicates minimum mandatory government certification standard (75%).
        </span>
        <span className="font-mono text-[#93877D]">Formula: Assmt(40%) + Quiz(30%) + Pract(30%)</span>
      </div>
    </div>
  );
};
