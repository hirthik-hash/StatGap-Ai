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
    <div className="space-y-5 pb-12 animate-fadeIn">
      {/* Page Header */}
      <div className="officer-card p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-[#EEE4D8] text-[#6B4A35] border border-[#DED2C5]">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="badge badge-unverified uppercase text-[10px] tracking-widest">
                Phase 9 Cadre Progression Benchmark
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#2F2520] tracking-tight">
              Career Progression & Target Role Planning
            </h1>
            <p className="text-sm text-[#6E625A] mt-1 max-w-3xl">
              Evaluate your current verified competencies against institutional benchmarks for target
              statistical cadres (e.g. Junior Statistical Officer to Senior Statistical Officer or Director),
              identifying gap deltas and targeted learning pathways.
            </p>
          </div>

          {/* Target Role Selector */}
          <div className="bg-[#F8F3EB] p-4 rounded-xl border border-[#DED2C5] shrink-0 min-w-[280px]">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#6E625A] mb-2">
              Select Target Career Benchmark:
            </label>
            {isLoadingRoles ? (
              <div className="flex items-center gap-2 text-xs text-[#93877D] py-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#6B4A35]" />
                <span>Loading Cadre Roles...</span>
              </div>
            ) : (
              <select
                value={selectedRoleId}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full bg-[#FBF8F2] border border-[#CBB9A7] rounded-lg px-3 py-2 text-xs text-[#2F2520] font-semibold focus:outline-none focus:ring-2 focus:ring-[#6B4A35] transition-all"
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
      <div className="bg-[#FDF6EC] border border-[#D4A96A] rounded-xl p-4 flex items-start gap-3 text-[#7A4F1E] text-xs leading-relaxed">
        <Info className="w-5 h-5 text-[#A97838] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#7A4F1E]">Administrative Notice: </span>
          {comparison?.disclaimer ||
            'Career progression analysis is an assumption-based institutional competency benchmarking tool for personal development planning. It does not constitute an official administrative promotion decision or seniority list.'}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-[#FBF0EF] border border-[#D4958F] rounded-xl p-4 text-[#7A2E2A] text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[#9A4B42] shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoadingComparison && (
        <div className="officer-card p-12 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[#6B4A35] mx-auto mb-3" />
          <p className="text-sm text-[#6E625A] font-medium">
            Evaluating competency deltas against configured cadre benchmarks...
          </p>
        </div>
      )}

      {!isLoadingComparison && comparison && (
        <>
          {/* Overview KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="officer-card p-4">
              <div className="text-[10px] text-[#93877D] font-bold uppercase tracking-wider">Target Cadre Benchmark</div>
              <div className="text-base font-black text-[#2F2520] mt-1 truncate">{comparison.target_role_name}</div>
              <div className="text-xs text-[#6B4A35] font-bold mt-0.5">Cadre: {comparison.target_cadre}</div>
            </div>

            <div className="officer-card p-4">
              <div className="text-[10px] text-[#93877D] font-bold uppercase tracking-wider">Cadre Readiness Score</div>
              <div className="text-2xl font-black text-[#2F2520] mt-1">
                {comparison.overall_readiness_score}%
              </div>
              <div className="w-full bg-[#EEE4D8] h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    comparison.overall_readiness_score >= 80
                      ? 'bg-[#547A5A]'
                      : comparison.overall_readiness_score >= 50
                      ? 'bg-[#A97838]'
                      : 'bg-[#9A4B42]'
                  }`}
                  style={{ width: `${Math.min(100, comparison.overall_readiness_score)}%` }}
                />
              </div>
            </div>

            <div className="officer-card p-4">
              <div className="text-[10px] text-[#93877D] font-bold uppercase tracking-wider">Competencies Satisfied</div>
              <div className="text-2xl font-black text-[#2F2520] mt-1">
                {comparison.met_competencies_count} / {comparison.total_required_competencies_count}
              </div>
              <div className="text-xs text-[#6E625A] mt-1">
                {Math.round(
                  (comparison.met_competencies_count /
                    (comparison.total_required_competencies_count || 1)) *
                    100
                )}
                % met threshold
              </div>
            </div>

            <div className="officer-card p-4">
              <div className="text-[10px] text-[#93877D] font-bold uppercase tracking-wider">Emerging Skills Focus</div>
              <div className="text-2xl font-black text-[#A97838] mt-1">
                {comparison.emerging_skills_required.length}
              </div>
              <div className="text-xs text-[#6E625A] mt-1">Strategic MoSPI priorities</div>
            </div>
          </div>

          {/* Competency Deltas Breakdown */}
          <div className="officer-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DED2C5] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#6B4A35]" />
                <h2 className="text-base font-bold text-[#2F2520]">Cadre Competency Delta Matrix</h2>
              </div>
              <span className="text-xs text-[#6E625A]">
                Target Role ID: <span className="font-mono text-[#2F2520] font-semibold">{comparison.target_role_id}</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#2F2520]">
                <thead className="bg-[#F8F3EB] text-[#3A2921] font-bold border-b border-[#DED2C5]">
                  <tr>
                    <th className="py-3 px-4">Competency & Domain</th>
                    <th className="py-3 px-3 text-center">Required Level</th>
                    <th className="py-3 px-3 text-center">Your Current Level</th>
                    <th className="py-3 px-3 text-center">Competency Delta</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Targeted Interventions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DED2C5]">
                  {comparison.competency_deltas.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#F5EFE6] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#2F2520] text-sm">{item.competency_name}</div>
                        <div className="text-[10px] text-[#93877D] font-mono">{item.competency_id} · {item.domain}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-[#2F2520]">
                        {Math.round(item.required_level * 100)}%
                      </td>
                      <td className="py-3 px-3 text-center font-semibold">
                        <span
                          className={
                            item.current_level >= item.required_level
                              ? 'text-[#547A5A] font-bold'
                              : 'text-[#A97838] font-bold'
                          }
                        >
                          {Math.round(item.current_level * 100)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        {item.gap > 0 ? (
                          <span className="text-[#9A4B42] font-black">-{Math.round(item.gap * 100)}%</span>
                        ) : (
                          <span className="text-[#547A5A] font-bold">0% (Met)</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.status === 'MET' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EFF6EF] text-[#2E5B34] border border-[#A8C9AC] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#547A5A]" /> Met
                          </span>
                        )}
                        {item.status === 'MODERATE_GAP' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FDF6EC] text-[#7A4F1E] border border-[#D4A96A] inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-[#A97838]" /> Moderate
                          </span>
                        )}
                        {item.status === 'CRITICAL_GAP' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FBF0EF] text-[#7A2E2A] border border-[#D4958F] inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-[#9A4B42]" /> Critical Gap
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.recommended_interventions && item.recommended_interventions.length > 0 ? (
                          <div className="flex items-center justify-end gap-2">
                            {onNavigateToTraining && (
                              <button
                                onClick={() => onNavigateToTraining(item.competency_id)}
                                className="px-2.5 py-1 rounded bg-[#6B4A35] hover:bg-[#523625] text-[#FBF8F2] text-[11px] font-bold shadow-xs transition-colors"
                              >
                                Train ({item.recommended_interventions.length})
                              </button>
                            )}
                            {onNavigateToAssessment && (
                              <button
                                onClick={() => onNavigateToAssessment(item.competency_id)}
                                className="px-2.5 py-1 rounded bg-[#EEE4D8] text-[#3A2921] hover:bg-[#DED2C5] text-[11px] font-bold transition-colors border border-[#CBB9A7]"
                              >
                                Test
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#93877D] text-[11px]">Ready / Verified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Emerging Skills and Targeted Learning Pathway */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Emerging Skills */}
            <div className="officer-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-[#A97838]" />
                <h3 className="text-base font-bold text-[#2F2520]">Strategic Emerging Skills</h3>
              </div>
              <p className="text-xs text-[#6E625A] mb-4">
                MoSPI modern statistical standards identified for the {comparison.target_role_name} benchmark:
              </p>
              <div className="space-y-2.5">
                {comparison.emerging_skills_required.map((skill, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-[#F8F3EB] border border-[#DED2C5] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-[#A97838]" />
                      <span className="text-xs font-bold text-[#2F2520]">{skill}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FDF6EC] text-[#7A4F1E] border border-[#D4A96A]">
                      Emerging
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Targeted Recommended Pathway */}
            <div className="officer-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-[#6B4A35]" />
                <h3 className="text-base font-bold text-[#2F2520]">Targeted Training Interventions</h3>
              </div>
              <p className="text-xs text-[#6E625A] mb-4">
                Approved courses from iGOT Karmayogi, NSSTA, and TPAC to bridge your target role deltas:
              </p>
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {comparison.recommended_pathway.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#F8F3EB] border border-[#DED2C5] text-center text-xs text-[#93877D]">
                    No active training gaps detected for this role benchmark.
                  </div>
                ) : (
                  comparison.recommended_pathway.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#F8F3EB] border border-[#DED2C5] flex items-center justify-between gap-3 hover:border-[#CBB9A7] transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#2F2520] truncate">{p.title}</div>
                        <div className="text-[10px] text-[#6E625A] mt-0.5">
                          {p.provider} · {p.duration_hours || 4}h · Expected Gain: +{Math.round((p.expected_gain || 0.25) * 100)}%
                        </div>
                      </div>
                      {p.course_url ? (
                        <a
                          href={p.course_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded bg-[#6B4A35] hover:bg-[#523625] text-[#FBF8F2] text-xs font-bold shrink-0 flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <button
                          onClick={() => onNavigateToTraining && onNavigateToTraining(p.competency_id)}
                          className="px-2.5 py-1 rounded bg-[#EEE4D8] hover:bg-[#DED2C5] text-[#3A2921] border border-[#CBB9A7] text-xs font-bold shrink-0 flex items-center gap-1 transition-colors"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3 text-[#6B4A35]" />
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
