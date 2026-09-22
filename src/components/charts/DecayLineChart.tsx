import React from 'react';

interface DecayLineChartProps {
  currentScore?: number; // e.g., 84
  days30Score?: number; // e.g., 79
  days90Score?: number; // e.g., 71
  benchmark?: number; // 75%
  competencyName?: string;
  onRefreshClick?: () => void;
  dataPoints?: { day: number; retention: number; isProjected: boolean }[];
  currentDay?: number;
  currentRetention?: number;
}

export const DecayLineChart: React.FC<DecayLineChartProps> = ({
  currentScore,
  days30Score,
  days90Score,
  benchmark = 75,
  competencyName = 'Regression Interpretation',
  onRefreshClick,
  dataPoints,
  currentDay,
  currentRetention,
}) => {
  const effectiveCurrentScore = currentScore ?? (currentRetention != null ? 84 : 84);
  const effective30Score = days30Score ?? (dataPoints && dataPoints.length >= 3 ? dataPoints[2].retention : 79);
  const effective90Score = days90Score ?? (currentRetention != null ? currentRetention : 71);

  // SVG coordinate calculations
  // Width: 500, Height: 220
  // Y-axis: 50% to 100%
  const minY = 50;
  const maxY = 100;
  const getY = (val: number) => 190 - ((val - minY) / (maxY - minY)) * 140;

  const p0 = { x: 70, y: getY(effectiveCurrentScore), val: effectiveCurrentScore, label: 'Current' };
  const p30 = { x: 250, y: getY(effective30Score), val: effective30Score, label: '30 Days' };
  const p90 = { x: 430, y: getY(effective90Score), val: effective90Score, label: '90 Days' };
  const benchY = getY(benchmark);

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Knowledge Retention & Decay Curve</h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              Refresh Recommended
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Competency: <strong className="text-slate-800">{competencyName}</strong> (Half-life: ~65 days)
          </p>
        </div>

        {onRefreshClick && (
          <button
            onClick={onRefreshClick}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-900 text-white hover:bg-blue-800 shadow-xs transition-all active:scale-98"
          >
            <svg className="w-3.5 h-3.5 animate-spin-reverse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Start Refresher Now
          </button>
        )}
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox="0 0 500 220" className="w-full h-48 select-none">
          <defs>
            <linearGradient id="decayArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="50" y1={getY(100)} x2="470" y2={getY(100)} stroke="#f1f5f9" strokeWidth="1" />
          <text x="35" y={getY(100) + 4} fontSize="10" fill="#94a3b8" textAnchor="end">100%</text>

          <line x1="50" y1={getY(85)} x2="470" y2={getY(85)} stroke="#f1f5f9" strokeWidth="1" />
          <text x="35" y={getY(85) + 4} fontSize="10" fill="#94a3b8" textAnchor="end">85%</text>

          {/* Benchmark Line at 75% */}
          <line
            x1="50"
            y1={benchY}
            x2="470"
            y2={benchY}
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <text x="475" y={benchY + 3} fontSize="10" fill="#ef4444" fontWeight="bold">
            75% Benchmark
          </text>

          <line x1="50" y1={getY(60)} x2="470" y2={getY(60)} stroke="#f1f5f9" strokeWidth="1" />
          <text x="35" y={getY(60) + 4} fontSize="10" fill="#94a3b8" textAnchor="end">60%</text>

          {/* Shaded Area under curve */}
          <path
            d={`M ${p0.x} ${p0.y} C 160 ${p0.y + 10}, 200 ${p30.y - 5}, ${p30.x} ${p30.y} C 340 ${p30.y + 15}, 380 ${p90.y - 10}, ${p90.x} ${p90.y} L ${p90.x} 190 L ${p0.x} 190 Z`}
            fill="url(#decayArea)"
          />

          {/* Spline Decay Curve */}
          <path
            d={`M ${p0.x} ${p0.y} C 160 ${p0.y + 10}, 200 ${p30.y - 5}, ${p30.x} ${p30.y} C 340 ${p30.y + 15}, 380 ${p90.y - 10}, ${p90.x} ${p90.y}`}
            fill="none"
            stroke="#d97706"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Points & Data Callouts */}
          {/* P0: Current */}
          <circle cx={p0.x} cy={p0.y} r="5.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
          <text x={p0.x} y={p0.y - 12} fontSize="12" fontWeight="bold" fill="#047857" textAnchor="middle">
            {p0.val}%
          </text>
          <text x={p0.x} y="208" fontSize="11" fill="#475569" fontWeight="600" textAnchor="middle">
            Current
          </text>

          {/* P30: 30 Days */}
          <circle cx={p30.x} cy={p30.y} r="5.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
          <text x={p30.x} y={p30.y - 12} fontSize="12" fontWeight="bold" fill="#b45309" textAnchor="middle">
            {p30.val}%
          </text>
          <text x={p30.x} y="208" fontSize="11" fill="#475569" fontWeight="600" textAnchor="middle">
            30 Days
          </text>

          {/* P90: 90 Days */}
          <circle cx={p90.x} cy={p90.y} r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
          <text x={p90.x} y={p90.y - 12} fontSize="12" fontWeight="bold" fill="#b91c1c" textAnchor="middle">
            {p90.val}%
          </text>
          <text x={p90.x} y="208" fontSize="11" fill="#ef4444" fontWeight="700" textAnchor="middle">
            90 Days (Breach)
          </text>
        </svg>
      </div>

      <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg flex items-start gap-2.5">
        <svg className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-xs text-amber-900 leading-relaxed">
          <strong>Statistical Decay Diagnostic:</strong> Your competency score is showing signs of knowledge decay (84% → 79% → 71%). At Day 68, your retention crosses below the mandatory 75% MoSPI operational standard. A 10-minute micro-refresher is recommended before the gap becomes critical.
        </p>
      </div>
    </div>
  );
};
