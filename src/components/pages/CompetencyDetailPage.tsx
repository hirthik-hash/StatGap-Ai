import React from 'react';
import { Competency } from '../../types';
import { NavPageId } from '../common/Sidebar';
import {
  Sparkles,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  Activity,
  Layers,
  BookOpen,
} from 'lucide-react';

interface CompetencyDetailPageProps {
  competency: Competency;
  allCompetencies: Competency[];
  onSelectCompetency: (id: string) => void;
  onNavigate: (page: NavPageId) => void;
}

export const CompetencyDetailPage: React.FC<CompetencyDetailPageProps> = ({
  competency,
  allCompetencies,
  onSelectCompetency,
  onNavigate,
}) => {
  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => onNavigate('competency-map')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Competency Map
        </button>

        {/* Quick competency switcher */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Switch Competency:</span>
          <select
            value={competency.id}
            onChange={(e) => onSelectCompetency(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {allCompetencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.score}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Competency Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                {competency.category}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  competency.status === 'competent'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : competency.status === 'moderate_gap'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {competency.status === 'competent'
                  ? 'Competent'
                  : competency.status === 'moderate_gap'
                  ? 'Moderate Gap'
                  : 'Critical Gap'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {competency.name}
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">{competency.description}</p>
          </div>

          {/* Action Trigger Button */}
          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('why-gap')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 active:scale-98 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Why is this my gap?</span>
              <ArrowRight className="w-4 h-4 text-blue-200" />
            </button>
            <button
              onClick={() => onNavigate('learning')}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-slate-600" />
              <span>Targeted Learning</span>
            </button>
          </div>
        </div>

        {/* Score Metrics Trio */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Score</div>
            <div className="text-3xl font-black font-mono text-slate-900 mt-1">{competency.score}%</div>
            <div className="text-[11px] text-slate-500 mt-1">Normalized composite index</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Required Score</div>
            <div className="text-3xl font-black font-mono text-slate-900 mt-1">{competency.requiredScore}%</div>
            <div className="text-[11px] text-slate-500 mt-1">Official MoSPI Threshold</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Identified Gap</div>
            <div className={`text-3xl font-black font-mono mt-1 ${competency.gapPoints > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {competency.gapPoints > 0 ? `${competency.gapPoints} pts` : 'None (Met)'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {competency.gapPoints > 0 ? `${competency.gapPoints} percentage points deficit` : 'Meets certification'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</div>
            <div className="text-xl font-black text-slate-900 mt-2">
              {competency.status === 'competent'
                ? 'Competent'
                : competency.status === 'moderate_gap'
                ? 'Moderate Gap'
                : 'Critical Gap'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Classification level</div>
          </div>
        </div>
      </div>

      {/* Section 9: Multi-Source Evidence Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Diagnostic Multi-Source Evidence</h2>
            <p className="text-xs text-slate-500">
              STAT-GAP AI synthesizes proof across multiple independent channels, not a single test.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-900 border border-blue-200">
            5 Signals Evaluated
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Assessment Evidence */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Assessment</span>
            <div className="my-2">
              <div className="text-xl font-extrabold text-slate-900 font-mono">
                {competency.evidence.assessmentRatio}
              </div>
              <div className="text-xs text-slate-500">
                Score: <strong className="text-slate-800">{competency.evidence.assessmentScore}%</strong>
              </div>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full"
                style={{ width: `${competency.evidence.assessmentScore}%` }}
              />
            </div>
          </div>

          {/* Quiz Accuracy */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Quiz Accuracy</span>
            <div className="my-2">
              <div className="text-xl font-extrabold text-slate-900 font-mono">
                {competency.evidence.quizAccuracy}%
              </div>
              <div className="text-xs text-slate-500">Adaptive item accuracy</div>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full"
                style={{ width: `${competency.evidence.quizAccuracy}%` }}
              />
            </div>
          </div>

          {/* Practical Performance */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Practical Performance</span>
            <div className="my-2">
              <div className="text-xl font-extrabold text-slate-900 font-mono">
                {competency.evidence.practicalPerformance}%
              </div>
              <div className="text-xs text-slate-500">Simulated survey exercises</div>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full"
                style={{ width: `${competency.evidence.practicalPerformance}%` }}
              />
            </div>
          </div>

          {/* Repeated Errors */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Repeated Errors</span>
            <div className="my-2">
              <div className="text-xl font-extrabold text-rose-700 font-mono">
                {competency.evidence.repeatedErrors}
              </div>
              <div className="text-xs text-rose-600">Recurring misconception pattern</div>
            </div>
            <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-semibold self-start border border-rose-200">
              Systematic Fallacy
            </span>
          </div>

          {/* Confidence Pattern */}
          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 flex flex-col justify-between">
            <span className="text-[11px] font-bold text-rose-900 uppercase">Confidence Pattern</span>
            <div className="my-2">
              <div className="text-sm font-bold text-rose-800 leading-tight">
                {competency.evidence.confidencePattern}
              </div>
              <div className="text-[11px] text-rose-700 mt-1">Dangerous calibration gap</div>
            </div>
            <span className="text-[10px] text-rose-800 font-semibold bg-rose-100/80 px-1.5 py-0.5 rounded self-start">
              Entrenched Fallacy
            </span>
          </div>
        </div>
      </div>

      {/* Section 9: Related Misconception Box */}
      {competency.misconceptionTitle && (
        <div className="bg-gradient-to-br from-amber-50/80 to-amber-100/50 rounded-2xl border border-amber-300 p-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                  Related Statistical Misconception
                </span>
                <span className="text-xs text-amber-800 font-mono">Confidence: High</span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {competency.misconceptionTitle}
              </h3>

              <p className="text-sm text-slate-700 leading-relaxed bg-white/70 p-4 rounded-xl border border-amber-200/80">
                {competency.misconceptionExplanation}
              </p>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-amber-950 font-medium">
                  Identified via rule-based explainable reasoning: <code className="text-xs font-mono bg-amber-100 px-1.5 py-0.5 rounded">accuracy &lt; 60% + repeatedErrors ≥ 2 + High Confidence</code>
                </span>

                <button
                  onClick={() => onNavigate('why-gap')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <span>Why is this my gap?</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
