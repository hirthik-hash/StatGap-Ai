import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  TrendingUp,
  Award,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';
import {
  careerService,
  TargetRoleSummary,
  CareerComparisonResponse,
} from '../../services/careerService';
import { User } from '../../types';

interface CareerProgressionPageProps {
  user: User;
  onNavigateToTraining?: (competencyId?: string) => void;
  onNavigateToAssessment?: (competencyId?: string) => void;
}

export const CareerProgressionPage: React.FC<CareerProgressionPageProps> = ({
  user,
  onNavigateToTraining,
  onNavigateToAssessment,
}) => {
  const [targetRoles, setTargetRoles] = useState<TargetRoleSummary[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [comparison, setComparison] = useState<CareerComparisonResponse | null>(null);
  const [isLoadingRoles, setIsLoadingRoles] = useState<boolean>(true);
  const [isLoadingComparison, setIsLoadingComparison] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadTargetRoles();
  }, []);

  const loadTargetRoles = async () => {
    setIsLoadingRoles(true);
    setErrorMessage(null);
    try {
      const roles = await careerService.listTargetRoles();
      setTargetRoles(roles);
      if (roles.length > 0) {
        setSelectedRoleId(roles[0].id);
        runComparison(roles[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load target career benchmarks.');
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const runComparison = async (roleId: string) => {
    setIsLoadingComparison(true);
    setErrorMessage(null);
    try {
      const data = await careerService.compareOfficerToTargetRole(user.id, roleId);
      setComparison(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to evaluate career progression comparison.');
    } finally {
      setIsLoadingComparison(false);
    }
  };

  const handleRoleChange = (roleId: string) => {
    setSelectedRoleId(roleId);
    runComparison(roleId);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 pb-12">
      {/* Page Header */}
      <div className="bg-[#13233a] border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <TrendingUp className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-900/60 text-blue-300 border border-blue-700">
                Phase 9 Cadre Progression Benchmark
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Career Progression & Target Role Planning
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Evaluate your current verified competencies against institutional benchmarks for target
              statistical cadres (e.g. Junior Statistical Officer to Senior Statistical Officer or Director),
              identifying gap deltas and targeted learning pathways.
            </p>
          </div>

          {/* Target Role Selector */}
          <div className="bg-[#0f172a]/80 p-4 rounded-xl border border-slate-700/90 shrink-0 min-w-[280px]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Select Target Career Benchmark:
            </label>
            {isLoadingRoles ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>Loading Cadre Roles...</span>
              </div>
            ) : (
              <select
                value={selectedRoleId}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-blue-500"
              >
                {targetRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.role_name} ({r.cadre})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Institutional Disclaimer Banner */}
      <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-4 flex items-start gap-3 text-amber-200 text-xs leading-relaxed">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-300">Administrative Notice: </span>
          {comparison?.disclaimer ||
            'Career progression analysis is an assumption-based institutional competency benchmarking tool for personal development planning. It does not constitute an official administrative promotion decision or seniority list.'}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 text-rose-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoadingComparison && (
        <div className="bg-[#13233a] border border-slate-800 rounded-2xl p-12 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-3" />
          <p className="text-sm text-slate-300">
            Evaluating competency deltas against configured cadre benchmarks...
          </p>
        </div>
      )}

      {!isLoadingComparison && comparison && (
        <>
          {/* Overview KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#13233a] border border-slate-700/80 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-medium">Target Cadre Benchmark</div>
              <div className="text-lg font-bold text-white mt-1">{comparison.target_role_name}</div>
              <div className="text-xs text-blue-400 font-semibold mt-0.5">Cadre: {comparison.target_cadre}</div>
            </div>

            <div className="bg-[#13233a] border border-slate-700/80 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-medium">Cadre Readiness Score</div>
              <div className="text-2xl font-bold text-white mt-1">
                {comparison.overall_readiness_score}%
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    comparison.overall_readiness_score >= 80
                      ? 'bg-emerald-500'
                      : comparison.overall_readiness_score >= 50
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, comparison.overall_readiness_score)}%` }}
                />
              </div>
            </div>

            <div className="bg-[#13233a] border border-slate-700/80 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-medium">Competencies Satisfied</div>
              <div className="text-2xl font-bold text-white mt-1">
                {comparison.met_competencies_count} / {comparison.total_required_competencies_count}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {Math.round(
                  (comparison.met_competencies_count /
                    (comparison.total_required_competencies_count || 1)) *
                    100
                )}
                % met threshold
              </div>
            </div>

            <div className="bg-[#13233a] border border-slate-700/80 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-medium">Emerging Skills Focus</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {comparison.emerging_skills_required.length}
              </div>
              <div className="text-xs text-slate-400 mt-1">Strategic MoSPI priorities</div>
            </div>
          </div>

          {/* Competency Deltas Breakdown */}
          <div className="bg-[#13233a] border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-white">Cadre Competency Delta Matrix</h2>
              </div>
              <span className="text-xs text-slate-400">
                Target Role ID: <span className="font-mono text-slate-300">{comparison.target_role_id}</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Competency & Domain</th>
                    <th className="py-3 px-3 text-center">Required Level</th>
                    <th className="py-3 px-3 text-center">Your Current Level</th>
                    <th className="py-3 px-3 text-center">Competency Delta</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Targeted Interventions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {comparison.competency_deltas.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white text-sm">{item.competency_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.competency_id} · {item.domain}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-200">
                        {Math.round(item.required_level * 100)}%
                      </td>
                      <td className="py-3 px-3 text-center font-semibold">
                        <span
                          className={
                            item.current_level >= item.required_level
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                          }
                        >
                          {Math.round(item.current_level * 100)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        {item.gap > 0 ? (
                          <span className="text-rose-400 font-bold">-{Math.round(item.gap * 100)}%</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">0% (Met)</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.status === 'MET' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Met
                          </span>
                        )}
                        {item.status === 'MODERATE_GAP' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Moderate
                          </span>
                        )}
                        {item.status === 'CRITICAL_GAP' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Critical Gap
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.recommended_interventions && item.recommended_interventions.length > 0 ? (
                          <div className="flex items-center justify-end gap-2">
                            {onNavigateToTraining && (
                              <button
                                onClick={() => onNavigateToTraining(item.competency_id)}
                                className="px-2.5 py-1 rounded bg-blue-900/60 text-blue-200 hover:bg-blue-800 text-[11px] font-medium transition-colors border border-blue-700/60"
                              >
                                Train ({item.recommended_interventions.length})
                              </button>
                            )}
                            {onNavigateToAssessment && (
                              <button
                                onClick={() => onNavigateToAssessment(item.competency_id)}
                                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px] font-medium transition-colors border border-slate-700"
                              >
                                Test
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Ready / Verified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Emerging Skills and Targeted Learning Pathway */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Emerging Skills */}
            <div className="bg-[#13233a] border border-slate-700/80 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Strategic Emerging Skills</h3>
              </div>
              <p className="text-xs text-slate-300 mb-4">
                MoSPI modern statistical standards identified for the {comparison.target_role_name} benchmark:
              </p>
              <div className="space-y-2.5">
                {comparison.emerging_skills_required.map((skill, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-sm font-medium text-slate-200">{skill}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800">
                      Emerging
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Targeted Recommended Pathway */}
            <div className="bg-[#13233a] border border-slate-700/80 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Targeted Training Interventions</h3>
              </div>
              <p className="text-xs text-slate-300 mb-4">
                Approved courses from iGOT Karmayogi, NSSTA, and TPAC to bridge your target role deltas:
              </p>
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {comparison.recommended_pathway.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center text-xs text-slate-400">
                    No active training gaps detected for this role benchmark.
                  </div>
                ) : (
                  comparison.recommended_pathway.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 hover:border-blue-500/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{p.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {p.provider} · {p.duration_hours || 4}h · Expected Gain: +{Math.round((p.expected_gain || 0.25) * 100)}%
                        </div>
                      </div>
                      {p.course_url ? (
                        <a
                          href={p.course_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shrink-0 flex items-center gap-1 transition-colors"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <button
                          onClick={() => onNavigateToTraining && onNavigateToTraining(p.competency_id)}
                          className="px-2.5 py-1 rounded bg-blue-900/80 hover:bg-blue-800 text-blue-200 text-xs font-medium shrink-0 flex items-center gap-1 transition-colors"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
