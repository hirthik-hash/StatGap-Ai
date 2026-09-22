import React from 'react';
import { User, Competency } from '../../types';
import { NavPageId } from '../common/Sidebar';
import { CompetencyBarChart } from '../charts/CompetencyBarChart';
import { GapDistributionChart } from '../charts/GapDistributionChart';
import { GAP_X_STAGES, resolveGapXStage, scoreToProficiency, decayToRiskCategory } from '../../utils/gapxResolver';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
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
  Compass,
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
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

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
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/25">
                  <Activity className="w-3 h-3" />
                  Live GAP-X Telemetry · Top Priority
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Cadre: <strong className="text-slate-200">{user.role || 'Statistical Cadre'}</strong>
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mb-1">
                {priorityComp.name}
                <span className="ml-2 text-sm font-semibold text-slate-400">— Critical Priority Gap</span>
              </h2>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="badge badge-critical">
                  <AlertOctagon className="w-3 h-3" />
                  {scoreToProficiency(priorityComp.score)}
                </span>
                <span className="text-xs text-slate-400">
                  Current Score: <strong className="text-white font-mono">{priorityComp.score}%</strong>
                  <span className="mx-1 text-slate-600">·</span>
                  Gap Delta: <strong className="text-rose-300 font-mono">−{priorityComp.gapPoints} pts</strong>
                  <span className="mx-1 text-slate-600">·</span>
                  MoSPI Benchmark: <strong className="text-slate-300 font-mono">{priorityComp.requiredScore}%</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5 text-xs">
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wide mb-1">WHY-GAP Diagnosis</div>
                  <div className="text-slate-200 leading-snug">
                    {priorityComp.misconceptionTitle || 'Misconception identified in standard sampling strata & weighting.'}
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wide mb-1">Operational Impact</div>
                  <div className="text-amber-200 leading-snug">
                    Below MoSPI verification threshold. Field deployment readiness restricted.
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wide mb-1">Recommended Pathway</div>
                  <div className="text-emerald-300 leading-snug font-semibold">
                    Complete 15-minute micro-learning + adaptive post-test verification.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => { onSelectCompetency(priorityComp.id); onNavigate('why-gap'); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Diagnose Root Cause
                </button>
                <button
                  onClick={() => { onSelectCompetency(priorityComp.id); onNavigate('learning'); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold transition-all"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Start Learning (15m)
                </button>
                <button
                  onClick={() => { onSelectCompetency(priorityComp.id); onNavigate('assessments'); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold transition-all"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
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
            className="officer-card flex items-center justify-between p-4 hover:border-emerald-500/50 transition-all group text-left"
          >
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5">Verified Badges</div>
              <div className="text-2xl font-black text-emerald-400 font-mono">{verifiedCount}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Independent demonstrations confirmed</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-700/50 flex items-center justify-center group-hover:bg-emerald-900/60 transition-colors">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
          </button>

          {/* Critical Gaps */}
          <button
            onClick={() => onNavigate('competency-map')}
            className="officer-card flex items-center justify-between p-4 hover:border-rose-500/50 transition-all group text-left"
          >
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-0.5">Critical Gaps</div>
              <div className="text-2xl font-black text-rose-400 font-mono">{criticalCount}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Score &lt; 50% · Immediate priority</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-rose-950/60 border border-rose-700/50 flex items-center justify-center group-hover:bg-rose-900/60 transition-colors">
              <AlertOctagon className="w-5 h-5 text-rose-400" />
            </div>
          </button>

          {/* Decay Alert */}
          <button
            onClick={() => onNavigate('knowledge-decay')}
            className="officer-card flex items-center justify-between p-4 hover:border-amber-500/50 transition-all group text-left"
          >
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">Knowledge Decay Alert</div>
              <div className="text-2xl font-black text-amber-400 font-mono">{decayAlertCount}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Ebbinghaus interval refresh due</div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-950/60 border border-amber-700/50 flex items-center justify-center group-hover:bg-amber-900/60 transition-colors">
              <TrendingDown className="w-5 h-5 text-amber-400" />
            </div>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 2 — GAP-X Active Stage Progress
      ═══════════════════════════════════════════ */}
      <div className="officer-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
            GAP-X Continuous Intelligence Cycle — Active Workspace Indicator
          </span>
          <span className="text-[10px] text-slate-400 ml-auto hidden sm:inline">
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
                      ? `${stage.bgColor} ${stage.borderColor}`
                      : 'bg-slate-900/50 border-slate-800'
                  }`}
                  title={stage.description}
                >
                  <div className={`text-[9px] font-bold font-mono text-slate-400`}>
                    0{idx + 1}
                  </div>
                  <div className={`text-[10px] font-black uppercase mt-0.5 ${
                    isCurrent ? stage.color : 'text-slate-400'
                  }`}>
                    {stage.label}
                  </div>
                </div>
                {idx < loopSteps.length - 1 && (
                  <div className="flex items-center text-slate-600 text-xs shrink-0">›</div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 3 — Officer Unified Action Center (Phase 9)
      ═══════════════════════════════════════════ */}
      <div className="bg-[#13233a] border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/70 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Unified Officer Action Center</h3>
          </div>
          <span className="text-xs text-slate-400">
            One-click execution across all STAT-GAP AI intelligence modules
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Action 1: Why-Gap Diagnosis */}
          <button
            onClick={() => onNavigate('why-gap')}
            className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 transition-all text-left group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/25">
                  <Brain className="w-4 h-4" />
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
              </div>
              <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                Diagnose Root Causes
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Inspect WHY-GAP explanations and specific misconceptions behind competency deficits.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-amber-400 flex items-center gap-1">
              <span>Open Why-Gap</span> →
            </div>
          </button>

          {/* Action 2: Task Readiness */}
          <button
            onClick={() => onNavigate('task-readiness')}
            className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/50 transition-all text-left group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  <Target className="w-4 h-4" />
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
              </div>
              <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                Evaluate Task Readiness
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Check deployment eligibility for PLFS, ASI, CPI, and field survey operations.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-blue-400 flex items-center gap-1">
              <span>Check Readiness</span> →
            </div>
          </button>

          {/* Action 3: Career Progression */}
          <button
            onClick={() => onNavigate('career-progression')}
            className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 transition-all text-left group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                Career Progression Benchmark
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Plan target cadre competencies (JSO → SSO → Director) with targeted training pathways.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
              <span>Explore Roles</span> →
            </div>
          </button>

          {/* Action 4: Independent Verification */}
          <button
            onClick={() => onNavigate('verification')}
            className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-teal-500/50 transition-all text-left group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-teal-500/15 text-teal-400 border border-teal-500/25">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
              </div>
              <div className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                Independent Verification
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Submit multi-evidence demonstrations (assessments, practicals, supervisor sign-offs).
              </p>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-teal-400 flex items-center gap-1">
              <span>Verify Skills</span> →
            </div>
          </button>

          {/* Action 5: Knowledge Retention & Decay */}
          <button
            onClick={() => onNavigate('knowledge-decay')}
            className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-orange-500/50 transition-all text-left group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-orange-500/15 text-orange-400 border border-orange-500/25">
                  <Clock className="w-4 h-4" />
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-orange-400 transition-colors" />
              </div>
              <div className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors">
                Knowledge Decay Watch
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Monitor Ebbinghaus retention forecasts and launch spaced micro-quizzes.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-orange-400 flex items-center gap-1">
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
            className="p-4 rounded-xl bg-gradient-to-br from-blue-900/40 to-indigo-900/40 hover:from-blue-900/60 hover:to-indigo-900/60 border border-blue-700/60 transition-all text-left group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-950 text-blue-300 border border-blue-700">
                  RAG Grounded
                </span>
              </div>
              <div className="text-sm font-bold text-white group-hover:text-blue-200 transition-colors">
                AI Statistical Assistant
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Ask queries grounded in official MoSPI manuals with strict anti-hallucination citations.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-blue-300 flex items-center gap-1">
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
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Overall Proficiency</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white font-mono">{avgScore}%</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              avgScore >= 75 ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : avgScore >= 50 ? 'bg-amber-950 text-amber-300 border border-amber-700' : 'bg-rose-950 text-rose-300 border border-rose-700'
            }`}>
              {scoreToProficiency(avgScore)}
            </span>
          </div>
          <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${avgScore >= 75 ? 'bg-emerald-500' : avgScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
              style={{ width: `${avgScore}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Target: 75% (MoSPI standard)</div>
        </div>

        <div className="officer-card p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">Moderate Gaps</div>
          <div className="text-2xl font-black text-amber-400 font-mono">{moderateCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Score 50–74%</div>
          <button
            onClick={() => onNavigate('competency-map')}
            className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
          >
            View map <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="officer-card p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Competencies</div>
          <div className="text-2xl font-black text-white font-mono">{competencies.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">NSSTA framework domains</div>
          <button
            onClick={() => onNavigate('competency-map')}
            className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
          >
            Full map <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="officer-card p-4">
          {decayComp ? (
            <>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">Highest Decay Risk</div>
              <div className="text-sm font-bold text-white leading-tight">{decayComp.name}</div>
              <div className="text-xs text-slate-400 mt-0.5 font-mono">
                Retention: {decayComp.decay.currentEstimatedRetention ?? decayComp.decay.current}%
              </div>
              <button
                onClick={() => onNavigate('knowledge-decay')}
                className="mt-2 text-[10px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
              >
                Monitor <ChevronRight className="w-3 h-3" />
              </button>
            </>
          ) : (
            <>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">Retention</div>
              <div className="text-sm font-bold text-emerald-400">All Stable</div>
              <div className="text-[10px] text-slate-400 mt-1">No decay alerts</div>
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
        <div className="officer-card border-slate-700/80 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0c1a30] to-[#102a4e] p-5 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-slate-950">
                    <Brain className="w-3 h-3" />
                    Why-Gap Intelligence
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">
                  {priorityComp.misconceptionTitle || `${priorityComp.name} — Conceptual Gap Detected`}
                </h3>
                {priorityComp.misconceptionExplanation && (
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {priorityComp.misconceptionExplanation}
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  onClick={() => { onSelectCompetency(priorityComp.id); onNavigate('why-gap'); }}
                  className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-all"
                >
                  Diagnose Root Cause →
                </button>
                <button
                  onClick={() => { onSelectCompetency(priorityComp.id); onNavigate('learning'); }}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/15 font-semibold text-xs transition-all"
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
          { icon: Brain, color: 'text-blue-400', bg: 'bg-blue-950/60 border border-blue-800/60', title: 'Explainable Why-Gap AI', desc: 'Identifies exact conceptual misconceptions from assessment responses.' },
          { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-950/60 border border-emerald-800/60', title: 'Independent Verification', desc: 'Multi-evidence timeline required before institutional certification.' },
          { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-950/60 border border-amber-800/60', title: 'Knowledge Decay Watch', desc: 'Ebbinghaus model forecasts when skills degrade below MoSPI thresholds.' },
          { icon: FileSpreadsheet, color: 'text-violet-400', bg: 'bg-violet-950/60 border border-violet-800/60', title: 'Responsible RAG Grounding', desc: 'Answers strictly grounded in official MoSPI statistical manuals with citations.' },
        ].map((card) => (
          <div key={card.title} className="officer-card p-4">
            <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-2.5`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <h4 className="text-xs font-bold text-white mb-1">{card.title}</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">{card.desc}</p>
          </div>
        ))}
      </div>

    </div>
  );
};
