import React from 'react';
import { Competency } from '../../types';
import { NavPageId } from '../common/Sidebar';
import {
  Sparkles,
  ArrowRight,
  ChevronLeft,
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
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Breadcrumb & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => onNavigate('competency-map')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6E625A] hover:text-[#6B4A35] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Competency Map
        </button>

        {/* Quick competency switcher */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#6E625A] font-medium">Switch Competency:</span>
          <select
            value={competency.id}
            onChange={(e) => onSelectCompetency(e.target.value)}
            className="px-2.5 py-1.5 bg-[#FBF8F2] border border-[#CBB9A7] rounded-lg text-xs font-semibold text-[#2F2520] focus:outline-none focus:ring-2 focus:ring-[#6B4A35]"
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
      <div className="bg-[#FFFDFC] rounded-2xl border border-[#DED2C5] p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#EEE4D8]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#93877D] font-mono">
                {competency.category}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  competency.status === 'competent'
                    ? 'bg-[#EFF6EF] text-[#2E5B34] border-[#A8C9AC]'
                    : competency.status === 'moderate_gap'
                    ? 'bg-[#FDF6EC] text-[#7A4F1E] border-[#D4A96A]'
                    : 'bg-[#FBF0EF] text-[#7A2E2A] border-[#D4958F]'
                }`}
              >
                {competency.status === 'competent'
                  ? 'Competent'
                  : competency.status === 'moderate_gap'
                  ? 'Moderate Gap'
                  : 'Critical Gap'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2F2520] tracking-tight">
              {competency.name}
            </h1>
            <p className="text-sm text-[#6E625A] mt-1 max-w-2xl">{competency.description}</p>
          </div>

          {/* Action Trigger Button */}
          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('why-gap')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#6B4A35] hover:bg-[#523625] active:scale-98 text-[#FBF8F2] text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#F3E9D8]" />
              <span>Why is this my gap?</span>
              <ArrowRight className="w-4 h-4 text-[#CBB9A7]" />
            </button>
            <button
              onClick={() => onNavigate('learning')}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#EEE4D8] hover:bg-[#DED2C5] text-[#3A2921] border border-[#CBB9A7] text-xs font-semibold transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#6B4A35]" />
              <span>Targeted Learning</span>
            </button>
          </div>
        </div>

        {/* Score Metrics Trio */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-xl bg-[#F8F3EB] border border-[#DED2C5]">
            <div className="text-xs font-semibold text-[#6E625A] uppercase tracking-wider">Current Score</div>
            <div className="text-3xl font-black font-mono text-[#2F2520] mt-1">{competency.score}%</div>
            <div className="text-[11px] text-[#6E625A] mt-1">Normalized composite index</div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8F3EB] border border-[#DED2C5]">
            <div className="text-xs font-semibold text-[#6E625A] uppercase tracking-wider">Required Score</div>
            <div className="text-3xl font-black font-mono text-[#2F2520] mt-1">{competency.requiredScore}%</div>
            <div className="text-[11px] text-[#6E625A] mt-1">Official MoSPI Threshold</div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8F3EB] border border-[#DED2C5]">
            <div className="text-xs font-semibold text-[#6E625A] uppercase tracking-wider">Identified Gap</div>
            <div className={`text-3xl font-black font-mono mt-1 ${competency.gapPoints > 0 ? 'text-[#9A4B42]' : 'text-[#547A5A]'}`}>
              {competency.gapPoints > 0 ? `${competency.gapPoints} pts` : 'None (Met)'}
            </div>
            <div className="text-[11px] text-[#6E625A] mt-1">
              {competency.gapPoints > 0 ? `${competency.gapPoints} percentage points deficit` : 'Meets certification'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8F3EB] border border-[#DED2C5]">
            <div className="text-xs font-semibold text-[#6E625A] uppercase tracking-wider">Status</div>
            <div className="text-xl font-black text-[#2F2520] mt-2">
              {competency.status === 'competent'
                ? 'Competent'
                : competency.status === 'moderate_gap'
                ? 'Moderate Gap'
                : 'Critical Gap'}
            </div>
            <div className="text-[11px] text-[#6E625A] mt-1">Classification level</div>
          </div>
        </div>
      </div>

      {/* Diagnostic Multi-Source Evidence */}
      <div className="bg-[#FFFDFC] rounded-2xl border border-[#DED2C5] p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#EEE4D8]">
          <div>
            <h2 className="text-lg font-bold text-[#2F2520]">Diagnostic Multi-Source Evidence</h2>
            <p className="text-xs text-[#6E625A]">
              STAT-GAP AI synthesizes proof across multiple independent channels, not a single test.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-[#EEE4D8] text-[#6B4A35] border border-[#CBB9A7]">
            5 Signals Evaluated
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Assessment Evidence */}
          <div className="p-4 rounded-xl bg-[#F8F3EB] border border-[#DED2C5] flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#6E625A] uppercase">Assessment</span>
            <div className="my-2">
              <div className="text-xl font-extrabold text-[#2F2520] font-mono">
                {competency.evidence.assessmentRatio}
              </div>
              <div className="text-xs text-[#6E625A]">
                Score: <strong className="text-[#2F2520]">{competency.evidence.assessmentScore}%</strong>
              </div>
            </div>
            <div className="w-full bg-[#EEE4D8] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#A97838] h-full rounded-full"
                style={{ width: `${competency.evidence.assessmentScore}%` }}
              />
            </div>
          </div>

          {/* Quiz Accuracy */}
          <div className="p-4 rounded-xl bg-[#F8F3EB] border border-[#DED2C5] flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#6E625A] uppercase">Quiz Accuracy</span>
            <div className="my-2">
              <div className="text-xl font-extrabold text-[#2F2520] font-mono">
                {competency.evidence.quizAccuracy}%
              </div>
              <div className="text-xs text-[#6E625A]">Adaptive item accuracy</div>
            </div>
            <div className="w-full bg-[#EEE4D8] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#A97838] h-full rounded-full"
                style={{ width: `${competency.evidence.quizAccuracy}%` }}
              />
            </div>
          </div>

          {/* Practical Performance */}
          <div className="p-4 rounded-xl bg-[#F8F3EB] border border-[#DED2C5] flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#6E625A] uppercase">Practical Performance</span>
            <div className="my-2">
              <div className="text-xl font-extrabold text-[#2F2520] font-mono">
                {competency.evidence.practicalPerformance}%
              </div>
              <div className="text-xs text-[#6E625A]">Simulated survey exercises</div>
            </div>
            <div className="w-full bg-[#EEE4D8] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#A97838] h-full rounded-full"
                style={{ width: `${competency.evidence.practicalPerformance}%` }}
              />
            </div>
          </div>

          {/* Repeated Errors */}
          <div className="p-4 rounded-xl bg-[#F8F3EB] border border-[#DED2C5] flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#6E625A] uppercase">Repeated Errors</span>
            <div className="my-2">
              <div className="text-xl font-extrabold text-[#9A4B42] font-mono">
                {competency.evidence.repeatedErrors}
              </div>
              <div className="text-xs text-[#9A4B42]">Recurring misconception pattern</div>
            </div>
            <span className="text-[10px] text-[#7A2E2A] bg-[#FBF0EF] px-1.5 py-0.5 rounded font-semibold self-start border border-[#D4958F]">
              Systematic Fallacy
            </span>
          </div>

          {/* Confidence Pattern */}
          <div className="p-4 rounded-xl bg-[#FBF0EF] border border-[#D4958F] flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#7A2E2A] uppercase">Confidence Pattern</span>
            <div className="my-2">
              <div className="text-sm font-bold text-[#7A2E2A] leading-tight">
                {competency.evidence.confidencePattern}
              </div>
              <div className="text-[11px] text-[#9A4B42] mt-1">Dangerous calibration gap</div>
            </div>
            <span className="text-[10px] text-[#7A2E2A] font-semibold bg-[#E8C8C4]/60 px-1.5 py-0.5 rounded self-start">
              Entrenched Fallacy
            </span>
          </div>
        </div>
      </div>

      {/* Related Misconception Box */}
      {competency.misconceptionTitle && (
        <div className="bg-[#FDF6EC] rounded-2xl border border-[#D4A96A] p-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#A97838] text-[#FFFDFC] flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7A4F1E] bg-[#EDD8B4] px-2 py-0.5 rounded">
                  Related Statistical Misconception
                </span>
                <span className="text-xs text-[#A97838] font-mono">Confidence: High</span>
              </div>

              <h3 className="text-lg font-bold text-[#2F2520] mb-2">
                {competency.misconceptionTitle}
              </h3>

              <p className="text-sm text-[#3A2921] leading-relaxed bg-[#FFFDFC] p-4 rounded-xl border border-[#DED2C5]">
                {competency.misconceptionExplanation}
              </p>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-[#6E625A] font-medium">
                  Identified via rule-based explainable reasoning: <code className="text-xs font-mono bg-[#EEE4D8] px-1.5 py-0.5 rounded text-[#3A2921]">accuracy &lt; 60% + repeatedErrors ≥ 2 + High Confidence</code>
                </span>

                <button
                  onClick={() => onNavigate('why-gap')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6B4A35] hover:bg-[#523625] text-[#FBF8F2] text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
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
