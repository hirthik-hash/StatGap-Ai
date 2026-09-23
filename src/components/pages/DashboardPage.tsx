import React from 'react';
import { User, Competency } from '../../types';
import { NavPageId } from '../common/Sidebar';
import { CompetencyBarChart } from '../charts/CompetencyBarChart';
import { GapDistributionChart } from '../charts/GapDistributionChart';
import { GAP_X_STAGES, resolveGapXStage, scoreToProficiency } from '../../utils/gapxResolver';
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Brain,
  FileSpreadsheet,
  Activity,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Target,
  FileCheck2,
  BookOpen,
  MessageSquare,
} from 'lucide-react';

interface DashboardPageProps {
  user: User;
  competencies: Competency[];
  onNavigate: (page: NavPageId) => void;
  onSelectCompetency: (id: string) => void;
  onOpenAssistant?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  competencies,
  onNavigate,
  onSelectCompetency,
  onOpenAssistant,
}) => {
  // ── Live KPI calculations from real competency data ──
  const criticalCount = competencies.filter((c) => c.status === 'critical_gap').length;
  const moderateCount = competencies.filter((c) => c.status === 'moderate_gap').length;
  const verifiedCount = competencies.filter((c) => c.verification.practicalEvidenceVerified).length;
  const decayAlertCount = competencies.filter(
    (c) => c.decay.status === 'Refresh Recommended' || c.decay.status === 'Critical Decay Alert'
  ).length;
  const avgScore = competencies.length
    ? Math.round(competencies.reduce((s, c) => s + c.score, 0) / competencies.length)
    : 0;

  // ── Determine priority action (highest-gap competency) ──
  const priorityComp = [...competencies].sort((a, b) => b.gapPoints - a.gapPoints)[0];
  const decayComp = [...competencies]
    .filter((c) => c.decay.status !== 'Retained' && c.decay.status !== 'Fresh')
    .sort((a, b) => (a.decay.currentEstimatedRetention ?? 100) - (b.decay.currentEstimatedRetention ?? 100))[0];

  const activeStage = resolveGapXStage('dashboard');
  const loopSteps = GAP_X_STAGES;

  return (
    <div className="space-y-5 pb-12 animate-fadeIn">

      {/* ══════════════════════════════════════════
          SECTION 1 — Officer Action Matrix & Live Priority
      ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Priority Action Card */}
        {priorityComp && (
          <div className="lg:col-span-2 action-card p-5 sm:p-6 shadow-xl">
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-[#A97838]/25 text-[#F3E9D8] border border-[#A97838]/40">
                  <Activity className="w-3 h-3 text-[#EDD8B4]" />
                  Live GAP-X Telemetry · Top Priority
                </span>
                <span className="text-xs text-[#CBB9A7] font-mono">
                  Cadre: <strong className="text-[#FBF8F2]">{user.role || 'Statistical Cadre'}</strong>
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-[#FBF8F2] tracking-tight mb-1">
                {priorityComp.name}
                <span className="ml-2 text-sm font-semibold text-[#DED2C5]">— Critical Priority Gap</span>
              </h2>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="badge badge-critical">
                  <AlertOctagon className="w-3 h-3" />
                  {scoreToProficiency(priorityComp.score)}
                </span>
                <span className="text-xs text-[#CBB9A7]">
                  Current Score: <strong className="text-[#FBF8F2] font-mono">{priorityComp.score}%</strong>
                  <span className="mx-1 text-[#8A6A52]">·</span>
                  Gap Delta: <strong className="text-[#FBF0EF] font-mono">−{priorityComp.gapPoints} pts</strong>
                  <span className="mx-1 text-[#8A6A52]">·</span>
                  MoSPI Benchmark: <strong className="text-[#FBF8F2] font-mono">{priorityComp.requiredScore}%</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5 text-xs">
                <div className="bg-[#2A1E19]/60 border border-[#8A6A52]/30 rounded-lg p-3">
                  <div className="text-[#B8A28F] text-[10px] font-bold uppercase tracking-wide mb-1">WHY-GAP Diagnosis</div>
                  <div className="text-[#F8F3EB] leading-snug">
                    {priorityComp.misconceptionTitle || 'Misconception identified in standard sampling strata & weighting.'}
                  </div>
                </div>
                <div className="bg-[#2A1E19]/60 border border-[#8A6A52]/30 rounded-lg p-3">
                  <div className="text-[#B8A28F] text-[10px] font-bold uppercase tracking-wide mb-1">Operational Impact</div>
                  <div className="text-[#EDD8B4] leading-snug">
                    Below MoSPI verification threshold. Field deployment readiness restricted.
                  </div>
                </div>
                <div className="bg-[#2A1E19]/60 border border-[#8A6A52]/30 rounded-lg p-3">
                  <div className="text-[#B8A28F] text-[10px] font-bold uppercase tracking-wide mb-1">Recommended Pathway</div>
                  <div className="text-[#C8DEC8] leading-snug font-semibold">
                    Complete 15-minute micro-learning + adaptive post-test verification.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => { onSelectCompetency(priorityComp.id); onNavigate('why-gap'); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#A97838] hover:bg-[#8F642E] text-[#FFFDFC] text-xs font-bold transition-all shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Diagnose Root Cause
                </button>
                <button
                  onClick={() => { onSelectCompetency(priorityComp.id); onNavigate('learning'); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EEE4D8] hover:bg-[#DED2C5] text-[#3A2921] border border-[#CBB9A7] text-xs font-semibold transition-all"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#6B4A35]" />
                  Start Learning (15m)
                </button>
                <button
                  onClick={() => { onSelectCompetency(priorityComp.id); onNavigate('assessments'); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EEE4D8] hover:bg-[#DED2C5] text-[#3A2921] border border-[#CBB9A7] text-xs font-semibold transition-all"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-[#6B4A35]" />
                  Take Assessment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right column — 3 quick-status pills stacked */}
        <div className="flex flex-col gap-3">
          {/* Verified Competencies */}
          <button
            onClick={() => onNavigate('verification')}
            className="officer-card flex items-center justify-between p-4 hover:border-[#547A5A] transition-all group text-left"
          >
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#547A5A] mb-0.5">Verified Badges</div>
              <div className="text-2xl font-black text-[#2E5B34] font-mono">{verifiedCount}</div>
              <div className="text-[11px] text-[#6E625A] mt-0.5">Independent demonstrations confirmed</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#EFF6EF] border border-[#A8C9AC] flex items-center justify-center group-hover:bg-[#C8DEC8] transition-colors">
              <CheckCircle2 className="w-5 h-5 text-[#2E5B34]" />
            </div>
          </button>

          {/* Critical Gaps */}
          <button
            onClick={() => onNavigate('competency-map')}
            className="officer-card flex items-center justify-between p-4 hover:border-[#9A4B42] transition-all group text-left"
          >
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#9A4B42] mb-0.5">Critical Gaps</div>
              <div className="text-2xl font-black text-[#7A2E2A] font-mono">{criticalCount}</div>
              <div className="text-[11px] text-[#6E625A] mt-0.5">Score &lt; 50% · Immediate priority</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#FBF0EF] border border-[#D4958F] flex items-center justify-center group-hover:bg-[#E8C8C4] transition-colors">
              <AlertOctagon className="w-5 h-5 text-[#9A4B42]" />
            </div>
          </button>

          {/* Decay Alert */}
          <button
            onClick={() => onNavigate('knowledge-decay')}
            className="officer-card flex items-center justify-between p-4 hover:border-[#A97838] transition-all group text-left"
          >
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#A97838] mb-0.5">Knowledge Decay Alert</div>
              <div className="text-2xl font-black text-[#7A4F1E] font-mono">{decayAlertCount}</div>
              <div className="text-[11px] text-[#6E625A] mt-0.5">Ebbinghaus interval refresh due</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-[#FDF6EC] border border-[#D4A96A] flex items-center justify-center group-hover:bg-[#EDD8B4] transition-colors">
              <TrendingDown className="w-5 h-5 text-[#A97838]" />
            </div>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 2 — GAP-X Active Stage Progress
      ═══════════════════════════════════════════ */}
      <div className="officer-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-3.5 h-3.5 text-[#6B4A35]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#2F2520]">
            GAP-X Continuous Intelligence Cycle — Active Workspace Indicator
          </span>
          <span className="text-[10px] text-[#6E625A] ml-auto hidden sm:inline">
            Stage progression driven by authenticated multi-source evidence
          </span>
        </div>

        <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
          {loopSteps.map((stage, idx) => {
            const isCurrent = stage.id === activeStage.id;
            return (
              <React.Fragment key={stage.id}>
                <div
                  className={`flex flex-col items-center px-2.5 py-2 rounded-lg border min-w-fit transition-all ${
                    isCurrent
                      ? `${stage.bgColor} ${stage.borderColor} shadow-xs ring-1 ring-[#6B4A35]/30`
                      : 'bg-[#F8F3EB] border-[#DED2C5]'
                  }`}
                  title={stage.description}
                >
                  <div className="text-[9px] font-bold font-mono text-[#93877D]">
                    0{idx + 1}
                  </div>
                  <div className={`text-[10px] font-black uppercase mt-0.5 ${
                    isCurrent ? stage.color : 'text-[#6E625A]'
                  }`}>
                    {stage.label}
                  </div>
                </div>
                {idx < loopSteps.length - 1 && (
                  <div className="flex items-center text-[#B8A28F] text-xs shrink-0">›</div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 3 — Officer Unified Action Center
      ═══════════════════════════════════════════ */}
      <div className="bg-[#FFFDFC] border border-[#DED2C5] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EEE4D8] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#EEE4D8] text-[#6B4A35] border border-[#CBB9A7]">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#2F2520]">Unified Officer Action Center</h3>
          </div>
          <span className="text-xs text-[#6E625A]">
            One-click execution across all STAT-GAP AI intelligence modules
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Action 1: Why-Gap Diagnosis */}
          <button
            onClick={() => onNavigate('why-gap')}
            className="p-4 rounded-xl bg-[#F8F3EB] hover:bg-[#EEE4D8] border border-[#DED2C5] hover:border-[#8A6A52] transition-all text-left group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-[#FDF6EC] text-[#A97838] border border-[#D4A96A]">
                  <Brain className="w-4 h-4" />
                </span>
                <ChevronRight className="w-4 h-4 text-[#93877D] group-hover:text-[#6B4A35] transition-colors" />
              </div>
              <div className="text-sm font-bold text-[#2F2520] group-hover:text-[#6B4A35] transition-colors">
                Diagnose Root Causes
              </div>
              <p className="text-xs text-[#6E625A] mt-1 leading-relaxed">
                Inspect WHY-GAP explanations and specific misconceptions behind competency deficits.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-[#A97838] flex items-center gap-1">
              <span>Open Why-Gap</span> →
            </div>
          </button>

          {/* Action 2: Task Readiness */}
          <button
            onClick={() => onNavigate('task-readiness')}
            className="p-4 rounded-xl bg-[#F8F3EB] hover:bg-[#EEE4D8] border border-[#DED2C5] hover:border-[#8A6A52] transition-all text-left group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-[#EEE4D8] text-[#6B4A35] border border-[#CBB9A7]">
                  <Target className="w-4 h-4" />
                </span>
                <ChevronRight className="w-4 h-4 text-[#93877D] group-hover:text-[#6B4A35] transition-colors" />
              </div>
              <div className="text-sm font-bold text-[#2F2520] group-hover:text-[#6B4A35] transition-colors">
                Evaluate Task Readiness
              </div>
              <p className="text-xs text-[#6E625A] mt-1 leading-relaxed">
                Check deployment eligibility for PLFS, ASI, CPI, and field survey operations.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-[#6B4A35] flex items-center gap-1">
              <span>Check Readiness</span> →
            </div>
          </button>

          {/* Action 3: Career Progression */}
          <button
            onClick={() => onNavigate('career-progression')}
            className="p-4 rounded-xl bg-[#F8F3EB] hover:bg-[#EEE4D8] border border-[#DED2C5] hover:border-[#8A6A52] transition-all text-left group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-[#EFF6EF] text-[#547A5A] border border-[#A8C9AC]">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <ChevronRight className="w-4 h-4 text-[#93877D] group-hover:text-[#547A5A] transition-colors" />
              </div>
              <div className="text-sm font-bold text-[#2F2520] group-hover:text-[#547A5A] transition-colors">
                Career Progression Benchmark
              </div>
              <p className="text-xs text-[#6E625A] mt-1 leading-relaxed">
                Plan target cadre competencies (JSO → SSO → Director) with targeted training pathways.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-[#547A5A] flex items-center gap-1">
              <span>Explore Roles</span> →
            </div>
          </button>

          {/* Action 4: Independent Verification */}
          <button
            onClick={() => onNavigate('verification')}
            className="p-4 rounded-xl bg-[#F8F3EB] hover:bg-[#EEE4D8] border border-[#DED2C5] hover:border-[#8A6A52] transition-all text-left group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-[#EFF6EF] text-[#547A5A] border border-[#8CBF94]">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <ChevronRight className="w-4 h-4 text-[#93877D] group-hover:text-[#547A5A] transition-colors" />
              </div>
              <div className="text-sm font-bold text-[#2F2520] group-hover:text-[#547A5A] transition-colors">
                Independent Verification
              </div>
              <p className="text-xs text-[#6E625A] mt-1 leading-relaxed">
                Submit multi-evidence demonstrations (assessments, practicals, supervisor sign-offs).
              </p>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-[#547A5A] flex items-center gap-1">
              <span>Verify Skills</span> →
            </div>
          </button>

          {/* Action 5: Knowledge Retention & Decay */}
          <button
            onClick={() => onNavigate('knowledge-decay')}
            className="p-4 rounded-xl bg-[#F8F3EB] hover:bg-[#EEE4D8] border border-[#DED2C5] hover:border-[#8A6A52] transition-all text-left group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-[#FDF6EC] text-[#A97838] border border-[#D4A96A]">
                  <Clock className="w-4 h-4" />
                </span>
                <ChevronRight className="w-4 h-4 text-[#93877D] group-hover:text-[#A97838] transition-colors" />
              </div>
              <div className="text-sm font-bold text-[#2F2520] group-hover:text-[#A97838] transition-colors">
                Knowledge Decay Watch
              </div>
              <p className="text-xs text-[#6E625A] mt-1 leading-relaxed">
                Monitor Ebbinghaus retention forecasts and launch spaced micro-quizzes.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-[#A97838] flex items-center gap-1">
              <span>Review Decay</span> →
            </div>
          </button>

          {/* Action 6: AI Learning Assistant */}
          <button
            onClick={() => {
              if (onOpenAssistant) {
                onOpenAssistant();
              } else {
                onNavigate('study-material');
              }
            }}
            className="p-4 rounded-xl bg-[#F8F3EB] hover:bg-[#EEE4D8] border border-[#DED2C5] hover:border-[#6B4A35] transition-all text-left group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-[#EEE4D8] text-[#6B4A35] border border-[#CBB9A7]">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#EFF6EF] text-[#2E5B34] border border-[#A8C9AC]">
                  RAG Grounded
                </span>
              </div>
              <div className="text-sm font-bold text-[#2F2520] group-hover:text-[#6B4A35] transition-colors">
                AI Statistical Assistant
              </div>
              <p className="text-xs text-[#6E625A] mt-1 leading-relaxed">
                Ask queries grounded in official MoSPI manuals with strict anti-hallucination citations.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-[#6B4A35] flex items-center gap-1">
              <span>Launch Assistant</span> →
            </div>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 4 — Overview KPI Row
      ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="officer-card p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#6E625A] mb-1">Overall Proficiency</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#2F2520] font-mono">{avgScore}%</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              avgScore >= 75 ? 'bg-[#EFF6EF] text-[#2E5B34] border border-[#A8C9AC]' : avgScore >= 50 ? 'bg-[#FDF6EC] text-[#7A4F1E] border border-[#D4A96A]' : 'bg-[#FBF0EF] text-[#7A2E2A] border border-[#D4958F]'
            }`}>
              {scoreToProficiency(avgScore)}
            </span>
          </div>
          <div className="mt-2 w-full h-1.5 bg-[#EEE4D8] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${avgScore >= 75 ? 'bg-[#547A5A]' : avgScore >= 50 ? 'bg-[#A97838]' : 'bg-[#9A4B42]'}`}
              style={{ width: `${avgScore}%` }}
            />
          </div>
          <div className="text-[10px] text-[#93877D] mt-1">Target: 75% (MoSPI standard)</div>
        </div>

        <div className="officer-card p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#A97838] mb-1">Moderate Gaps</div>
          <div className="text-2xl font-black text-[#7A4F1E] font-mono">{moderateCount}</div>
          <div className="text-[10px] text-[#6E625A] mt-1">Score 50–74%</div>
          <button
            onClick={() => onNavigate('competency-map')}
            className="mt-2 text-[10px] text-[#6B4A35] hover:text-[#3A2921] font-semibold flex items-center gap-1"
          >
            View map <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="officer-card p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#6E625A] mb-1">Total Competencies</div>
          <div className="text-2xl font-black text-[#2F2520] font-mono">{competencies.length}</div>
          <div className="text-[10px] text-[#6E625A] mt-1">NSSTA framework domains</div>
          <button
            onClick={() => onNavigate('competency-map')}
            className="mt-2 text-[10px] text-[#6B4A35] hover:text-[#3A2921] font-semibold flex items-center gap-1"
          >
            Full map <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="officer-card p-4">
          {decayComp ? (
            <>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#A97838] mb-1">Highest Decay Risk</div>
              <div className="text-sm font-bold text-[#2F2520] leading-tight">{decayComp.name}</div>
              <div className="text-xs text-[#6E625A] mt-0.5 font-mono">
                Retention: {decayComp.decay.currentEstimatedRetention ?? decayComp.decay.current}%
              </div>
              <button
                onClick={() => onNavigate('knowledge-decay')}
                className="mt-2 text-[10px] text-[#A97838] hover:text-[#7A4F1E] font-semibold flex items-center gap-1"
              >
                Monitor <ChevronRight className="w-3 h-3" />
              </button>
            </>
          ) : (
            <>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#547A5A] mb-1">Retention</div>
              <div className="text-sm font-bold text-[#547A5A]">All Stable</div>
              <div className="text-[10px] text-[#6E625A] mt-1">No decay alerts</div>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 5 — Analytics Charts
      ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CompetencyBarChart
            competencies={competencies}
            onSelectCompetency={(id) => { onSelectCompetency(id); onNavigate('competency-map'); }}
          />
        </div>
        <div className="lg:col-span-1">
          <GapDistributionChart competencies={competencies} />
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 6 — Why-Gap Spotlight
      ═══════════════════════════════════════════ */}
      {priorityComp && (
        <div className="officer-card border-[#DED2C5] overflow-hidden">
          <div className="bg-gradient-to-r from-[#2A1E19] to-[#3A2921] p-5 sm:p-6 text-[#FBF8F2]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#A97838] text-[#FFFDFC]">
                    <Brain className="w-3 h-3" />
                    Why-Gap Intelligence
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#FBF8F2]">
                  {priorityComp.misconceptionTitle || `${priorityComp.name} — Conceptual Gap Detected`}
                </h3>
                {priorityComp.misconceptionExplanation && (
                  <p className="text-xs text-[#DED2C5] leading-relaxed">
                    {priorityComp.misconceptionExplanation}
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  onClick={() => { onSelectCompetency(priorityComp.id); onNavigate('why-gap'); }}
                  className="px-4 py-2 rounded-lg bg-[#A97838] hover:bg-[#8F642E] text-[#FFFDFC] font-bold text-xs transition-all shadow-xs"
                >
                  Diagnose Root Cause →
                </button>
                <button
                  onClick={() => { onSelectCompetency(priorityComp.id); onNavigate('learning'); }}
                  className="px-4 py-2 rounded-lg bg-[#EEE4D8] hover:bg-[#DED2C5] text-[#3A2921] border border-[#CBB9A7] font-semibold text-xs transition-all"
                >
                  Start Learning (15m)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          SECTION 7 — Platform Core Intelligence Pillars
      ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Brain, color: 'text-[#6B4A35]', bg: 'bg-[#EEE4D8] border border-[#CBB9A7]', title: 'Explainable Why-Gap AI', desc: 'Identifies exact conceptual misconceptions from assessment responses.' },
          { icon: ShieldCheck, color: 'text-[#547A5A]', bg: 'bg-[#EFF6EF] border border-[#A8C9AC]', title: 'Independent Verification', desc: 'Multi-evidence timeline required before institutional certification.' },
          { icon: Clock, color: 'text-[#A97838]', bg: 'bg-[#FDF6EC] border border-[#D4A96A]', title: 'Knowledge Decay Watch', desc: 'Ebbinghaus model forecasts when skills degrade below MoSPI thresholds.' },
          { icon: FileSpreadsheet, color: 'text-[#657A82]', bg: 'bg-[#EEF0EE] border border-[#B8A28F]/40', title: 'Responsible RAG Grounding', desc: 'Answers strictly grounded in official MoSPI statistical manuals with citations.' },
        ].map((card) => (
          <div key={card.title} className="officer-card p-4">
            <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-2.5`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <h4 className="text-xs font-bold text-[#2F2520] mb-1">{card.title}</h4>
            <p className="text-[11px] text-[#6E625A] leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </div>

    </div>
  );
};
