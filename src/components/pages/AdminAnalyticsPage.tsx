import React, { useState, useEffect } from 'react';
import { NavPageId } from '../common/Sidebar';
import {
  AdminAnalyticsService,
  AdminOverview,
  CadreHeatmapResponse,
  GapDistributionResponse,
  TaskReadinessAnalyticsResponse,
  TrainingDemandRollupResponse,
  TrainingEffectivenessResponse,
  FutureRoleComparisonResponse,
  CapacityBuildingPriorityResponse,
} from '../../services/adminAnalyticsService';
import {
  BarChart3,
  Download,
  Users,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Briefcase,
  GraduationCap,
  Layers,
  Sparkles,
  Info,
  ShieldCheck,
  Building,
  Target,
  FileSpreadsheet,
  RefreshCw,
  Compass,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface AdminAnalyticsPageProps {
  onNavigate: (page: NavPageId) => void;
}

export const AdminAnalyticsPage: React.FC<AdminAnalyticsPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<
    'heatmap' | 'gaps' | 'tasks' | 'priorities' | 'future_roles' | 'effectiveness'
  >('heatmap');

  const [selectedCadre, setSelectedCadre] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [heatmap, setHeatmap] = useState<CadreHeatmapResponse | null>(null);
  const [gaps, setGaps] = useState<GapDistributionResponse | null>(null);
  const [tasks, setTasks] = useState<TaskReadinessAnalyticsResponse | null>(null);
  const [demand, setDemand] = useState<TrainingDemandRollupResponse | null>(null);
  const [effectiveness, setEffectiveness] = useState<TrainingEffectivenessResponse | null>(null);
  const [futureRoles, setFutureRoles] = useState<FutureRoleComparisonResponse[]>([]);
  const [priorities, setPriorities] = useState<CapacityBuildingPriorityResponse[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedCadre]);

  const loadData = async () => {
    setLoading(true);
    const cadreParam = selectedCadre === 'all' ? undefined : selectedCadre;
    try {
      const [
        overviewRes,
        heatmapRes,
        gapsRes,
        tasksRes,
        demandRes,
        effectRes,
        futureRes,
        prioritiesRes,
      ] = await Promise.all([
        AdminAnalyticsService.getOverview(cadreParam),
        AdminAnalyticsService.getHeatmap(cadreParam),
        AdminAnalyticsService.getGapDistribution(cadreParam),
        AdminAnalyticsService.getTaskReadiness(cadreParam),
        AdminAnalyticsService.getTrainingDemand(cadreParam),
        AdminAnalyticsService.getTrainingEffectiveness(),
        AdminAnalyticsService.getFutureRequirements(cadreParam),
        AdminAnalyticsService.getCapacityPriorities(cadreParam),
      ]);

      setOverview(overviewRes);
      setHeatmap(heatmapRes);
      setGaps(gapsRes);
      setTasks(tasksRes);
      setDemand(demandRes);
      setEffectiveness(effectRes);
      setFutureRoles(futureRes);
      setPriorities(prioritiesRes);
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const cadreParam = selectedCadre === 'all' ? undefined : selectedCadre;
      await AdminAnalyticsService.downloadCsv(cadreParam);
    } catch (err) {
      console.error('CSV Export Error:', err);
    } finally {
      setExporting(false);
    }
  };

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 0.75) return 'bg-[#EFF6EF] text-[#2E5B34] border-[#A8C9AC]';
    if (mastery >= 0.5) return 'bg-[#FDF6EC] text-[#7A4F1E] border-[#D4A96A]';
    return 'bg-[#FBF0EF] text-[#7A2E2A] border-[#D4958F]';
  };

  return (
    <div className="space-y-5 pb-12 animate-fadeIn">
      {/* Top Header */}
      <div className="officer-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-unverified uppercase text-[10px] tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#6B4A35]" />
              Administrative Intelligence
            </span>
            <span className="text-xs text-[#93877D]">MoSPI / NSSTA Workforce Command Center</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#2F2520] tracking-tight">
            National Cadre Analytics & Competency Intelligence
          </h1>
          <p className="text-sm text-[#6E625A] mt-1">
            Aggregate competency heatmaps, task deployment readiness, training demand, and statistical modernization pipeline.
          </p>
        </div>

        {/* Filter & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#FBF8F2] border border-[#CBB9A7] rounded-lg px-3 py-1.5">
            <Users className="w-4 h-4 text-[#8A6A52]" />
            <select
              value={selectedCadre}
              onChange={(e) => setSelectedCadre(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#2F2520] focus:outline-none cursor-pointer"
            >
              <option value="all">All Statistical Cadres</option>
              <option value="ISS">Indian Statistical Service (ISS)</option>
              <option value="SSS">Subordinate Statistical Service (SSS)</option>
              <option value="DES">Directorate of Economics & Stats (DES)</option>
              <option value="Field Operations">Field Operations (FOD)</option>
              <option value="Data Science & Analytics Unit">Data Science Unit</option>
            </select>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#EFF6EF] text-[#2E5B34] border border-[#A8C9AC] hover:bg-[#E5EEE6] text-xs font-bold transition disabled:opacity-50 shadow-xs"
            title="Download full cadre competency matrix as CSV"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Generating...' : 'Export Matrix (CSV)'}
          </button>

          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-[#F8F3EB] border border-[#DED2C5] text-[#6E625A] hover:text-[#2F2520] hover:bg-[#EEE4D8] transition"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="officer-card p-4">
          <div className="flex items-center justify-between text-[#93877D] text-xs mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Evaluated</span>
            <Users className="w-4 h-4 text-[#6B4A35]" />
          </div>
          <div className="text-2xl font-black text-[#2F2520]">
            {overview?.total_officers ?? '--'}
          </div>
          <div className="text-[10px] text-[#6E625A] mt-0.5">Across all units</div>
        </div>

        <div className="officer-card p-4">
          <div className="flex items-center justify-between text-[#93877D] text-xs mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Mean Mastery</span>
            <TrendingUp className="w-4 h-4 text-[#547A5A]" />
          </div>
          <div className="text-2xl font-black text-[#547A5A]">
            {overview ? `${(overview.overall_mean_mastery * 100).toFixed(1)}%` : '--'}
          </div>
          <div className="text-[10px] text-[#6E625A] mt-0.5">Cadre-wide average</div>
        </div>

        <div className="officer-card p-4">
          <div className="flex items-center justify-between text-[#93877D] text-xs mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Verified Rate</span>
            <ShieldCheck className="w-4 h-4 text-[#6B4A35]" />
          </div>
          <div className="text-2xl font-black text-[#3A2921]">
            {overview ? `${(overview.overall_verified_mastery_rate * 100).toFixed(1)}%` : '--'}
          </div>
          <div className="text-[10px] text-[#6E625A] mt-0.5">Independent proctored</div>
        </div>

        <div className="officer-card p-4 border-[#D4958F] bg-[#FBF0EF]">
          <div className="flex items-center justify-between text-[#9A4B42] text-xs mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Red Alert Gaps</span>
            <AlertTriangle className="w-4 h-4 text-[#9A4B42]" />
          </div>
          <div className="text-2xl font-black text-[#7A2E2A]">
            {overview?.red_gap_count ?? '--'}
          </div>
          <div className="text-[10px] text-[#7A2E2A]/70 mt-0.5">Critical gap interventions</div>
        </div>

        <div className="officer-card p-4 border-[#D4A96A] bg-[#FDF6EC]">
          <div className="flex items-center justify-between text-[#A97838] text-xs mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Deployment</span>
            <CheckCircle2 className="w-4 h-4 text-[#A97838]" />
          </div>
          <div className="text-2xl font-black text-[#7A4F1E]">
            {overview ? `${(overview.task_deployment_ready_rate * 100).toFixed(1)}%` : '--'}
          </div>
          <div className="text-[10px] text-[#7A4F1E]/70 mt-0.5">Task readiness index</div>
        </div>

        <div className="officer-card p-4">
          <div className="flex items-center justify-between text-[#93877D] text-xs mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Decay Alerts</span>
            <ShieldAlert className="w-4 h-4 text-[#8A6A52]" />
          </div>
          <div className="text-2xl font-black text-[#6B4A35]">
            {overview?.decay_alert_count ?? '--'}
          </div>
          <div className="text-[10px] text-[#6E625A] mt-0.5">Refresher required</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#DED2C5] pb-2">
        <button
          onClick={() => setActiveTab('heatmap')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'heatmap'
              ? 'bg-[#6B4A35] text-[#FBF8F2] shadow-xs'
              : 'text-[#6E625A] hover:text-[#2F2520] hover:bg-[#EEE4D8]'
          }`}
        >
          <Layers className="w-4 h-4" />
          Cadre Heatmap
        </button>

        <button
          onClick={() => setActiveTab('gaps')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'gaps'
              ? 'bg-[#6B4A35] text-[#FBF8F2] shadow-xs'
              : 'text-[#6E625A] hover:text-[#2F2520] hover:bg-[#EEE4D8]'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Gap Distribution & Risk
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'tasks'
              ? 'bg-[#6B4A35] text-[#FBF8F2] shadow-xs'
              : 'text-[#6E625A] hover:text-[#2F2520] hover:bg-[#EEE4D8]'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Task Readiness & Bottlenecks
        </button>

        <button
          onClick={() => setActiveTab('priorities')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'priorities'
              ? 'bg-[#6B4A35] text-[#FBF8F2] shadow-xs'
              : 'text-[#6E625A] hover:text-[#2F2520] hover:bg-[#EEE4D8]'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Capacity Priorities & Demand
        </button>

        <button
          onClick={() => setActiveTab('future_roles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'future_roles'
              ? 'bg-[#6B4A35] text-[#FBF8F2] shadow-xs'
              : 'text-[#6E625A] hover:text-[#2F2520] hover:bg-[#EEE4D8]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Modernization & Future Roles
        </button>

        <button
          onClick={() => setActiveTab('effectiveness')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'effectiveness'
              ? 'bg-[#6B4A35] text-[#FBF8F2] shadow-xs'
              : 'text-[#6E625A] hover:text-[#2F2520] hover:bg-[#EEE4D8]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Training Effectiveness
        </button>
      </div>

      {/* Main Content Areas */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-[#93877D]">
          <RefreshCw className="w-8 h-8 animate-spin mb-3 text-[#6B4A35]" />
          <p className="text-sm font-medium">Calculating cadre competency intelligence...</p>
        </div>
      ) : (
        <>
          {/* 1. Cadre Mastery Heatmap */}
          {activeTab === 'heatmap' && heatmap && (
            <div className="space-y-4">
              <div className="officer-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-[#2F2520]">Cadre × Competency Mastery Matrix</h2>
                    <p className="text-xs text-[#6E625A]">
                      Mean estimated mastery level across each statistical cadre and core statistical domain.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#6E625A]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-[#EFF6EF] border border-[#A8C9AC]"></span> High (≥75%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-[#FDF6EC] border border-[#D4A96A]"></span> Moderate (50-74%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-[#FBF0EF] border border-[#D4958F]"></span> Low / Critical (&lt;50%)
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#DED2C5] bg-[#F8F3EB] text-xs text-[#3A2921]">
                        <th className="py-3 px-4 font-bold">Competency Domain</th>
                        {heatmap.cadres.map((c) => (
                          <th key={c} className="py-3 px-4 font-bold text-center">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DED2C5] text-sm">
                      {heatmap.competencies.map((comp) => (
                        <tr key={comp.id} className="hover:bg-[#F5EFE6] transition">
                          <td className="py-3 px-4 font-semibold text-[#2F2520]">
                            <div>{comp.name}</div>
                            <span className="text-[10px] text-[#93877D] font-mono">{comp.id}</span>
                          </td>
                          {heatmap.cadres.map((cadreName) => {
                            const cell = heatmap.matrix.find(
                              (m) => m.cadre === cadreName && m.competency_id === comp.id
                            );
                            if (!cell) {
                              return (
                                <td key={cadreName} className="py-3 px-4 text-center text-xs text-[#93877D]">
                                  --
                                </td>
                              );
                            }
                            return (
                              <td key={cadreName} className="py-3 px-4 text-center">
                                <div
                                  className={`inline-flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border text-xs font-bold ${getMasteryColor(
                                    cell.mean_mastery
                                  )}`}
                                >
                                  <span>{(cell.mean_mastery * 100).toFixed(0)}%</span>
                                  <span className="text-[9px] opacity-80">
                                    {cell.red_gap_count > 0 ? `${cell.red_gap_count} Red` : 'OK'}
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. Gap Distribution & Risk */}
          {activeTab === 'gaps' && gaps && (
            <div className="space-y-6">
              {/* Gap Breakdown Bar */}
              <div className="officer-card p-5">
                <h2 className="text-base font-bold text-[#2F2520] mb-1">Cadre Gap Breakdown</h2>
                <p className="text-xs text-[#6E625A] mb-4">
                  Distribution of competency evaluations across Red (Critical), Orange (Moderate), and Green (Proficient) bands.
                </p>

                <div className="h-4 w-full bg-[#EEE4D8] rounded-full overflow-hidden flex mb-3">
                  <div
                    style={{ width: `${gaps.green_percentage}%` }}
                    className="bg-[#547A5A] h-full transition-all"
                    title={`Green: ${gaps.green_count} (${gaps.green_percentage}%)`}
                  />
                  <div
                    style={{ width: `${gaps.orange_percentage}%` }}
                    className="bg-[#A97838] h-full transition-all"
                    title={`Orange: ${gaps.orange_count} (${gaps.orange_percentage}%)`}
                  />
                  <div
                    style={{ width: `${gaps.red_percentage}%` }}
                    className="bg-[#9A4B42] h-full transition-all"
                    title={`Red: ${gaps.red_count} (${gaps.red_percentage}%)`}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-[#EFF6EF] border border-[#A8C9AC] rounded-xl p-3">
                    <span className="text-xs text-[#2E5B34] font-bold">Green (Proficient)</span>
                    <div className="text-xl font-black text-[#2E5B34] mt-1">
                      {gaps.green_count} ({gaps.green_percentage}%)
                    </div>
                  </div>
                  <div className="bg-[#FDF6EC] border border-[#D4A96A] rounded-xl p-3">
                    <span className="text-xs text-[#7A4F1E] font-bold">Orange (Moderate Gap)</span>
                    <div className="text-xl font-black text-[#7A4F1E] mt-1">
                      {gaps.orange_count} ({gaps.orange_percentage}%)
                    </div>
                  </div>
                  <div className="bg-[#FBF0EF] border border-[#D4958F] rounded-xl p-3">
                    <span className="text-xs text-[#7A2E2A] font-bold">Red (Critical Gap)</span>
                    <div className="text-xl font-black text-[#7A2E2A] mt-1">
                      {gaps.red_count} ({gaps.red_percentage}%)
                    </div>
                  </div>
                </div>
              </div>

              {/* High-Risk Competency Concentrations */}
              <div className="officer-card p-5">
                <h2 className="text-base font-bold text-[#2F2520] mb-1">High-Risk Competency Concentrations</h2>
                <p className="text-xs text-[#6E625A] mb-4">
                  Ranked by national criticality score based on weighted red and orange gap counts.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[#DED2C5] bg-[#F8F3EB] text-xs text-[#3A2921]">
                        <th className="py-2.5 px-3 font-bold">Competency</th>
                        <th className="py-2.5 px-3 text-center font-bold">Red Gaps</th>
                        <th className="py-2.5 px-3 text-center font-bold">Orange Gaps</th>
                        <th className="py-2.5 px-3 text-center font-bold">Proficient</th>
                        <th className="py-2.5 px-3 text-right font-bold">Criticality Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DED2C5]">
                      {gaps.high_risk_competencies.map((c) => (
                        <tr key={c.competency_id} className="hover:bg-[#F5EFE6]">
                          <td className="py-3 px-3">
                            <span className="font-semibold text-[#2F2520]">{c.competency_name}</span>
                            <span className="block text-[10px] text-[#93877D] font-mono">{c.competency_id}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#FBF0EF] text-[#7A2E2A] border border-[#D4958F]">
                              {c.red_count}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#FDF6EC] text-[#7A4F1E] border border-[#D4A96A]">
                              {c.orange_count}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center text-[#6E625A]">{c.green_count}</td>
                          <td className="py-3 px-3 text-right font-mono font-black text-[#9A4B42]">
                            {c.criticality_score.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. Task Deployment Readiness */}
          {activeTab === 'tasks' && tasks && (
            <div className="space-y-4">
              <div className="officer-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-[#2F2520]">Task Deployment Readiness & Bottlenecks</h2>
                    <p className="text-xs text-[#6E625A]">
                      Operational readiness for real-world statistical tasks with key bottleneck competencies blocking qualification.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#93877D]">Overall Average Readiness</span>
                    <div className="text-xl font-black text-[#3A2921]">
                      {(tasks.average_readiness_rate * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {tasks.tasks.map((task) => (
                    <div
                      key={task.task_id}
                      className="bg-[#F8F3EB] border border-[#DED2C5] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#2F2520]">{task.task_name}</span>
                          <span className="text-xs text-[#93877D] font-mono">({task.task_id})</span>
                        </div>
                        {task.primary_bottleneck_competency_name && (
                          <div className="flex items-center gap-1.5 text-xs text-[#9A4B42]">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>
                              Primary Bottleneck: <strong>{task.primary_bottleneck_competency_name}</strong> (blocking {task.bottleneck_officer_count} officers)
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-6 min-w-[240px]">
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between text-xs text-[#6E625A]">
                            <span>Ready Officers</span>
                            <span className="font-semibold text-[#2F2520]">{task.ready_officers_count} / {task.total_officers_evaluated}</span>
                          </div>
                          <div className="h-2 w-full bg-[#EEE4D8] rounded-full overflow-hidden">
                            <div
                              style={{ width: `${task.readiness_rate * 100}%` }}
                              className={`h-full ${
                                task.readiness_rate >= 0.7
                                  ? 'bg-[#547A5A]'
                                  : task.readiness_rate >= 0.4
                                  ? 'bg-[#A97838]'
                                  : 'bg-[#9A4B42]'
                              }`}
                            />
                          </div>
                        </div>
                        <div className="text-right min-w-[60px]">
                          <span
                            className={`text-lg font-black ${
                              task.readiness_rate >= 0.7
                                ? 'text-[#547A5A]'
                                : task.readiness_rate >= 0.4
                                ? 'text-[#A97838]'
                                : 'text-[#9A4B42]'
                            }`}
                          >
                            {(task.readiness_rate * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. Capacity Priorities & Training Demand */}
          {activeTab === 'priorities' && (
            <div className="space-y-6">
              {/* Provider Demand Rollup */}
              {demand && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="officer-card p-4">
                    <div className="flex items-center gap-2 text-[#6B4A35] text-xs font-bold mb-1">
                      <GraduationCap className="w-4 h-4" />
                      iGOT Karmayogi Bharat Demand
                    </div>
                    <div className="text-2xl font-black text-[#2F2520]">{demand.igot_demand_count}</div>
                    <div className="text-xs text-[#6E625A] mt-1">Self-paced digital modules recommended</div>
                  </div>

                  <div className="officer-card p-4">
                    <div className="flex items-center gap-2 text-[#547A5A] text-xs font-bold mb-1">
                      <Building className="w-4 h-4" />
                      NSSTA Academy Demand
                    </div>
                    <div className="text-2xl font-black text-[#2F2520]">{demand.nssta_demand_count}</div>
                    <div className="text-xs text-[#6E625A] mt-1">Residential / workshop interventions</div>
                  </div>

                  <div className="officer-card p-4">
                    <div className="flex items-center gap-2 text-[#A97838] text-xs font-bold mb-1">
                      <ShieldCheck className="w-4 h-4" />
                      TPAC Statutory Framework
                    </div>
                    <div className="text-2xl font-black text-[#2F2520]">{demand.tpac_demand_count}</div>
                    <div className="text-xs text-[#6E625A] mt-1">Mandatory statistical syllabus units</div>
                  </div>
                </div>
              )}

              {/* Ranked Priorities Table */}
              <div className="officer-card p-5">
                <h2 className="text-base font-bold text-[#2F2520] mb-1">
                  National Capacity-Building Priority Queue
                </h2>
                <p className="text-xs text-[#6E625A] mb-4">
                  Prioritized training calendar recommendations based on gap severity, officer reach, and task bottleneck impact.
                </p>

                <div className="space-y-3">
                  {priorities.map((item) => (
                    <div
                      key={item.competency_id}
                      className="bg-[#F8F3EB] border border-[#DED2C5] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-[#EEE4D8] border border-[#CBB9A7] text-[#6B4A35] flex items-center justify-center font-black text-xs shrink-0">
                          #{item.rank}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#2F2520]">{item.competency_name}</span>
                            <span
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                                item.urgency === 'URGENT'
                                  ? 'bg-[#FBF0EF] text-[#7A2E2A] border-[#D4958F]'
                                  : item.urgency === 'HIGH'
                                  ? 'bg-[#FDF6EC] text-[#7A4F1E] border-[#D4A96A]'
                                  : 'bg-[#EFF6EF] text-[#2E5B34] border-[#A8C9AC]'
                              }`}
                            >
                              {item.urgency}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-[#EEE4D8] text-[#3A2921] font-mono font-semibold">
                              {item.recommended_provider}
                            </span>
                          </div>
                          <p className="text-xs text-[#6E625A]">{item.rationale}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-[#6E625A] shrink-0">
                        <div className="text-right">
                          <div className="text-[#2F2520] font-bold">{item.affected_officers_count} Officers</div>
                          <div className="text-[#9A4B42] font-mono font-semibold">{item.red_gap_count} Red Gaps</div>
                        </div>
                        <div className="text-right min-w-[70px]">
                          <div className="text-[10px] text-[#93877D] uppercase font-bold">Score</div>
                          <div className="text-base font-black text-[#6B4A35] font-mono">
                            {item.priority_score.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. Modernization & Future Roles */}
          {activeTab === 'future_roles' && (
            <div className="space-y-4">
              <div className="officer-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#FDF6EC] text-[#7A4F1E] border border-[#D4A96A]">
                    <Info className="w-3.5 h-3.5 mr-1 text-[#A97838]" />
                    Assumption-Based Role Target
                  </span>
                  <span className="text-xs text-[#93877D]">
                    Target definitions for statistical modernization under MoSPI Strategic Vision
                  </span>
                </div>
                <h2 className="text-base font-bold text-[#2F2520] mb-1">
                  Future Role Readiness & Modernization Pipelines
                </h2>
                <p className="text-xs text-[#6E625A] mb-4">
                  Evaluates existing cadre readiness against modernized job profiles (AI Survey Analytics, Big Data Macroeconomics, etc.).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {futureRoles.map((role) => (
                    <div
                      key={role.role_id}
                      className="bg-[#F8F3EB] border border-[#DED2C5] rounded-xl p-5 space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-[#2F2520] text-base">{role.role_title}</h3>
                            <span className="text-xs text-[#6B4A35] font-semibold">
                              Target Cadre: {role.target_cadre}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                              role.urgency === 'HIGH'
                                ? 'bg-[#FBF0EF] text-[#7A2E2A] border-[#D4958F]'
                                : 'bg-[#FDF6EC] text-[#7A4F1E] border-[#D4A96A]'
                            }`}
                          >
                            {role.urgency} Urgency
                          </span>
                        </div>
                        <p className="text-xs text-[#6E625A]">{role.description}</p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-[#DED2C5]">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#6E625A]">Qualified Pipeline:</span>
                          <span className="font-bold text-[#2F2520]">
                            {role.qualified_officers_count} / {role.total_cadre_officers} ({(role.readiness_rate * 100).toFixed(0)}%)
                          </span>
                        </div>

                        <div className="h-2 w-full bg-[#EEE4D8] rounded-full overflow-hidden">
                          <div
                            style={{ width: `${role.readiness_rate * 100}%` }}
                            className="h-full bg-[#6B4A35]"
                          />
                        </div>

                        {role.critical_missing_competencies.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] text-[#93877D] font-medium">Critical Missing Competencies:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {role.critical_missing_competencies.map((comp) => (
                                <span
                                  key={comp}
                                  className="text-[10px] px-2 py-0.5 rounded bg-[#FBF0EF] text-[#7A2E2A] border border-[#D4958F] font-mono font-semibold"
                                >
                                  {comp}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 6. Training Effectiveness */}
          {activeTab === 'effectiveness' && effectiveness && (
            <div className="space-y-4">
              <div className="officer-card p-5 space-y-4">
                <h2 className="text-base font-bold text-[#2F2520]">
                  Longitudinal Training Effectiveness Evaluation
                </h2>
                <p className="text-xs text-[#6E625A]">
                  Measures pre-intervention vs. post-intervention mastery shifts across evaluated officer cohorts.
                </p>

                {effectiveness.status === 'insufficient_longitudinal_data' ? (
                  <div className="bg-[#FDF6EC] border border-[#D4A96A] rounded-xl p-6 text-center space-y-2">
                    <Info className="w-8 h-8 text-[#A97838] mx-auto" />
                    <h3 className="font-bold text-[#7A4F1E]">
                      Insufficient Longitudinal Data for Empirical Shift Analysis
                    </h3>
                    <p className="text-xs text-[#6E625A] max-w-xl mx-auto">
                      {effectiveness.insufficient_data_reason ||
                        'STAT-GAP AI strictly adheres to empirical integrity standards and requires at least two separate verification/assessment cycles per cohort before reporting definitive percentage mastery shift rates.'}
                    </p>
                    <div className="pt-2 text-xs text-[#93877D]">
                      Evaluated Intervention Records: {effectiveness.total_evaluated_interventions}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#F8F3EB] border border-[#DED2C5] rounded-xl p-4">
                      <span className="text-xs text-[#6E625A]">Mean Mastery Shift</span>
                      <div className="text-3xl font-black text-[#547A5A] mt-1">
                        +{(effectiveness.mean_mastery_shift * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-[#93877D] mt-1">
                        Across {effectiveness.total_evaluated_interventions} completed interventions
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
