import React, { useState } from 'react';
import { Competency } from '../../types';
import { NavPageId } from '../common/Sidebar';
import { scoreToProficiency, decayToRiskCategory } from '../../utils/gapxResolver';
import {
  Sparkles,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Search,
  Target,
  BookOpen,
  FileCheck2,
  TrendingDown,
} from 'lucide-react';

interface CompetencyMapPageProps {
  competencies: Competency[];
  onSelectCompetency: (id: string) => void;
  onNavigate: (page: NavPageId) => void;
}

/** Static prerequisite relationships for NSSTA competency framework */
const PREREQUISITES: Record<string, string[]> = {
  comp_sampling_theory:     [],
  comp_regression:          ['Descriptive Statistics'],
  comp_hypothesis_testing:  ['Probability Theory', 'Sampling Theory'],
  comp_data_visualization:  ['Descriptive Statistics'],
  comp_python:              [],
  comp_econometrics:        ['Regression Analysis'],
  comp_ml_ai:               ['Regression Analysis', 'Python Programming'],
};

export const CompetencyMapPage: React.FC<CompetencyMapPageProps> = ({
  competencies,
  onSelectCompetency,
  onNavigate,
}) => {
  const [filter, setFilter] = useState<'all' | 'competent' | 'moderate_gap' | 'critical_gap'>('all');
  const [search, setSearch] = useState('');

  const filtered = competencies.filter((c) => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (
      search &&
      !c.name.toLowerCase().includes(search.toLowerCase()) &&
      !c.category.toLowerCase().includes(search.toLowerCase())
    ) return false;
    return true;
  });

  const criticalCount  = competencies.filter((c) => c.status === 'critical_gap').length;
  const moderateCount  = competencies.filter((c) => c.status === 'moderate_gap').length;
  const competentCount = competencies.filter((c) => c.status === 'competent').length;

  return (
    <div className="space-y-5 pb-12 animate-fadeIn">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="officer-card p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-unverified uppercase">Framework Mapping</span>
              <span className="text-[11px] text-slate-400">{competencies.length} Competency Domains</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Competency Map</h1>
            <p className="text-sm text-slate-500 mt-1">
              NSSTA standardized evaluation matrix — India's Official Statistical System.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search competencies…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white w-48"
              />
            </div>

            {/* Filter pills */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                All ({competencies.length})
              </button>
              <button
                onClick={() => setFilter('critical_gap')}
                className={`px-2.5 py-1 rounded-md transition-all ${filter === 'critical_gap' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-700 hover:bg-rose-50'}`}
              >
                Critical ({criticalCount})
              </button>
              <button
                onClick={() => setFilter('moderate_gap')}
                className={`px-2.5 py-1 rounded-md transition-all ${filter === 'moderate_gap' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-700 hover:bg-amber-50'}`}
              >
                Moderate ({moderateCount})
              </button>
              <button
                onClick={() => setFilter('competent')}
                className={`px-2.5 py-1 rounded-md transition-all ${filter === 'competent' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'}`}
              >
                Competent ({competentCount})
              </button>
            </div>
          </div>
        </div>

        {/* Scoring formula — officer-readable */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[11px] text-slate-600">
          <span className="font-semibold text-slate-800">Composite Score:</span>
          <span className="font-mono bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-700">
            Assessment (40%) + Quiz Accuracy (30%) + Practical (30%)
          </span>
          <span className="text-rose-600 font-semibold">0–49%: Critical</span>
          <span className="text-amber-600 font-semibold">50–74%: Moderate</span>
          <span className="text-emerald-600 font-semibold">75%+: Competent</span>
        </div>
      </div>

      {/* ── Competency Cards Grid ────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="officer-card p-8 text-center text-slate-500 text-sm">
          No competencies match your filter. Try adjusting the search or filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((comp, i) => {
            // Status configuration
            let statusBadge: React.ReactNode;
            let borderClass = 'border-slate-200';
            let progressColor = 'bg-emerald-500';
            let StatusIcon = CheckCircle2;

            if (comp.status === 'critical_gap') {
              statusBadge = <span className="badge badge-critical"><AlertOctagon className="w-3 h-3" />Critical Gap</span>;
              borderClass = 'border-rose-200 hover:border-rose-300';
              progressColor = 'bg-rose-500';
              StatusIcon = AlertOctagon;
            } else if (comp.status === 'moderate_gap') {
              statusBadge = <span className="badge badge-moderate"><AlertTriangle className="w-3 h-3" />Moderate Gap</span>;
              borderClass = 'border-amber-200 hover:border-amber-300';
              progressColor = 'bg-amber-500';
              StatusIcon = AlertTriangle;
            } else {
              statusBadge = <span className="badge badge-competent"><CheckCircle2 className="w-3 h-3" />Competent</span>;
              borderClass = 'border-emerald-100 hover:border-emerald-200';
            }

            // Decay risk
            const retention = comp.decay.currentEstimatedRetention ?? comp.decay.current;
            const riskInfo = decayToRiskCategory(comp.decay.status, retention);
            const hasDecayAlert = comp.decay.status === 'Refresh Recommended' || comp.decay.status === 'Critical Decay Alert';

            // Prerequisites
            const prereqs = PREREQUISITES[comp.id] || [];

            return (
              <div
                key={comp.id}
                className={`officer-card border ${borderClass} p-5 flex flex-col animate-fadeIn stagger-${Math.min(i + 1, 5)}`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                    {comp.category}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {statusBadge}
                    {hasDecayAlert && (
                      <span className="badge badge-decaying">
                        <TrendingDown className="w-3 h-3" />
                        Decaying
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mb-1">{comp.name}</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mb-3">{comp.description}</p>

                {/* Score & progress */}
                <div className="mb-3">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[11px] font-medium text-slate-600">
                      Proficiency: <strong className="text-slate-800">{scoreToProficiency(comp.score)}</strong>
                    </span>
                    <span className="text-xs font-black font-mono text-slate-900">{comp.score}%</span>
                  </div>
                  <div className="competency-bar">
                    <div className="competency-bar-threshold" />
                    <div className={`competency-bar-fill ${progressColor}`} style={{ width: `${comp.score}%` }} />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 text-right">Target: {comp.requiredScore}%</div>
                </div>

                {/* Evidence mini-row */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {[
                    { label: 'Assessment', val: comp.evidence.assessmentScore },
                    { label: 'Quiz', val: comp.evidence.quizAccuracy },
                    { label: 'Practical', val: comp.evidence.practicalPerformance },
                  ].map((ev) => (
                    <div key={ev.label} className="text-center p-1.5 bg-slate-50 rounded border border-slate-100">
                      <div className="text-[9px] text-slate-400 uppercase font-semibold">{ev.label}</div>
                      <div className="text-xs font-bold text-slate-800 font-mono">{ev.val}%</div>
                    </div>
                  ))}
                </div>

                {/* Prerequisites */}
                {prereqs.length > 0 && (
                  <div className="mb-3 flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-slate-400">Requires:</span>
                    {prereqs.map((p) => (
                      <span key={p} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded font-medium">
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => { onSelectCompetency(comp.id); onNavigate('why-gap'); }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-800 text-slate-700 text-[10px] font-semibold transition-all"
                  >
                    <Sparkles className="w-3 h-3" />
                    Diagnose
                  </button>
                  <button
                    onClick={() => { onSelectCompetency(comp.id); onNavigate('learning'); }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-cyan-50 hover:text-cyan-800 text-slate-700 text-[10px] font-semibold transition-all"
                  >
                    <BookOpen className="w-3 h-3" />
                    Learn
                  </button>
                  <button
                    onClick={() => { onSelectCompetency(comp.id); onNavigate('assessments'); }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-700 text-[10px] font-semibold transition-all"
                  >
                    <FileCheck2 className="w-3 h-3" />
                    Assess
                  </button>
                  <button
                    onClick={() => { onSelectCompetency(comp.id); onNavigate('gap-analysis'); }}
                    className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Detail
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
