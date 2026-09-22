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
    if (mastery >= 0.75) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (mastery >= 0.5) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              Administrative Intelligence
            </span>
            <span className="text-xs text-slate-400">MoSPI / NSSTA Workforce Command Center</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            National Cadre Analytics & Competency Intelligence
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Aggregate competency heatmaps, task deployment readiness, training demand, and statistical modernization pipeline.
          </p>
        </div>

        {/* Filter & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
            <Users className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCadre}
              onChange={(e) => setSelectedCadre(e.target.value)}
              className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">All Statistical Cadres</option>
              <option value="ISS" className="bg-slate-900 text-slate-200">Indian Statistical Service (ISS)</option>
              <option value="SSS" className="bg-slate-900 text-slate-200">Subordinate Statistical Service (SSS)</option>
              <option value="DES" className="bg-slate-900 text-slate-200">Directorate of Economics & Stats (DES)</option>
              <option value="Field Operations" className="bg-slate-900 text-slate-200">Field Operations (FOD)</option>
              <option value="Data Science & Analytics Unit" className="bg-slate-900 text-slate-200">Data Science Unit</option>
            </select>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-sm font-medium transition disabled:opacity-50"
            title="Download full cadre competency matrix as CSV"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Generating...' : 'Export Matrix (CSV)'}
          </button>

          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Evaluated Officers</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {overview?.total_officers ?? '--'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Across all units</div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Mean Mastery</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {overview ? `${(overview.overall_mean_mastery * 100).toFixed(1)}%` : '--'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Cadre-wide average</div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Verified Mastery</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {overview ? `${(overview.overall_verified_mastery_rate * 100).toFixed(1)}%` : '--'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Independent proctored</div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Red Alert Gaps</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">
            {overview?.red_gap_count ?? '--'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Critical gap interventions</div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Deployment Ready</span>
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {overview ? `${(overview.task_deployment_ready_rate * 100).toFixed(1)}%` : '--'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Task readiness index</div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Decay Alerts</span>
            <ShieldAlert className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {overview?.decay_alert_count ?? '--'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Refresher required</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('heatmap')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'heatmap'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          Cadre Heatmap
        </button>

        <button
          onClick={() => setActiveTab('gaps')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'gaps'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Gap Distribution & Risk
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'tasks'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Task Readiness & Bottlenecks
        </button>

        <button
          onClick={() => setActiveTab('priorities')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'priorities'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Capacity Priorities & Demand
        </button>

        <button
          onClick={() => setActiveTab('future_roles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'future_roles'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Modernization & Future Roles
        </button>

        <button
          onClick={() => setActiveTab('effectiveness')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'effectiveness'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Training Effectiveness
        </button>
      </div>

      {/* Main Content Areas */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mb-3 text-indigo-400" />
          <p className="text-sm">Calculating cadre competency intelligence...</p>
        </div>
      ) : (
        <>
          {/* 1. Cadre Mastery Heatmap */}
          {activeTab === 'heatmap' && heatmap && (
            <div className="space-y-4">
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Cadre × Competency Mastery Matrix</h2>
                    <p className="text-xs text-slate-400">
                      Mean estimated mastery level across each statistical cadre and core statistical domain.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-500"></span> High (≥75%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-amber-500/40 border border-amber-500"></span> Moderate (50-74%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-rose-500/40 border border-rose-500"></span> Low / Critical (&lt;50%)
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs text-slate-400">
                        <th className="py-3 px-4 font-semibold">Competency Domain</th>
                        {heatmap.cadres.map((c) => (
                          <th key={c} className="py-3 px-4 font-semibold text-center">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                      {heatmap.competencies.map((comp) => (
                        <tr key={comp.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4 font-medium text-slate-200">
                            <div>{comp.name}</div>
                            <span className="text-xs text-slate-500 font-mono">{comp.id}</span>
                          </td>
                          {heatmap.cadres.map((cadreName) => {
                            const cell = heatmap.matrix.find(
                              (m) => m.cadre === cadreName && m.competency_id === comp.id
                            );
                            if (!cell) {
                              return (
                                <td key={cadreName} className="py-3 px-4 text-center text-xs text-slate-600">
                                  --
                                </td>
                              );
                            }
                            return (
                              <td key={cadreName} className="py-3 px-4 text-center">
                                <div
                                  className={`inline-flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border text-xs font-semibold ${getMasteryColor(
                                    cell.mean_mastery
                                  )}`}
                                >
                                  <span>{(cell.mean_mastery * 100).toFixed(0)}%</span>
                                  <span className="text-[10px] opacity-75">
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
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-white mb-1">Cadre Gap Breakdown</h2>
                <p className="text-xs text-slate-400 mb-4">
                  Distribution of competency evaluations across Red (Critical), Orange (Moderate), and Green (Proficient) bands.
                </p>

                <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex mb-3">
                  <div
                    style={{ width: `${gaps.green_percentage}%` }}
                    className="bg-emerald-500 h-full transition-all"
                    title={`Green: ${gaps.green_count} (${gaps.green_percentage}%)`}
                  />
                  <div
                    style={{ width: `${gaps.orange_percentage}%` }}
                    className="bg-amber-500 h-full transition-all"
                    title={`Orange: ${gaps.orange_count} (${gaps.orange_percentage}%)`}
                  />
                  <div
                    style={{ width: `${gaps.red_percentage}%` }}
                    className="bg-rose-500 h-full transition-all"
                    title={`Red: ${gaps.red_count} (${gaps.red_percentage}%)`}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                    <span className="text-xs text-emerald-400 font-medium">Green (Proficient)</span>
                    <div className="text-xl font-bold text-emerald-400 mt-1">
                      {gaps.green_count} ({gaps.green_percentage}%)
                    </div>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <span className="text-xs text-amber-400 font-medium">Orange (Moderate Gap)</span>
                    <div className="text-xl font-bold text-amber-400 mt-1">
                      {gaps.orange_count} ({gaps.orange_percentage}%)
                    </div>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
                    <span className="text-xs text-rose-400 font-medium">Red (Critical Gap)</span>
                    <div className="text-xl font-bold text-rose-400 mt-1">
                      {gaps.red_count} ({gaps.red_percentage}%)
                    </div>
                  </div>
                </div>
              </div>

              {/* High-Risk Competency Concentrations */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-white mb-1">High-Risk Competency Concentrations</h2>
                <p className="text-xs text-slate-400 mb-4">
                  Ranked by national criticality score based on weighted red and orange gap counts.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs text-slate-400">
                        <th className="py-2.5 px-3">Competency</th>
                        <th className="py-2.5 px-3 text-center">Red Gaps</th>
                        <th className="py-2.5 px-3 text-center">Orange Gaps</th>
                        <th className="py-2.5 px-3 text-center">Proficient</th>
                        <th className="py-2.5 px-3 text-right">Criticality Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {gaps.high_risk_competencies.map((c) => (
                        <tr key={c.competency_id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-3">
                            <span className="font-medium text-slate-200">{c.competency_name}</span>
                            <span className="block text-xs text-slate-500 font-mono">{c.competency_id}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              {c.red_count}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              {c.orange_count}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center text-slate-400">{c.green_count}</td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-rose-300">
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
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Task Deployment Readiness & Bottlenecks</h2>
                    <p className="text-xs text-slate-400">
                      Operational readiness for real-world statistical tasks with key bottleneck competencies blocking qualification.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Overall Average Readiness</span>
                    <div className="text-xl font-bold text-indigo-300">
                      {(tasks.average_readiness_rate * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {tasks.tasks.map((task) => (
                    <div
                      key={task.task_id}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">{task.task_name}</span>
                          <span className="text-xs text-slate-500 font-mono">({task.task_id})</span>
                        </div>
                        {task.primary_bottleneck_competency_name && (
                          <div className="flex items-center gap-1.5 text-xs text-rose-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>
                              Primary Bottleneck: <strong>{task.primary_bottleneck_competency_name}</strong> (blocking {task.bottleneck_officer_count} officers)
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-6 min-w-[240px]">
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>Ready Officers</span>
                            <span>{task.ready_officers_count} / {task.total_officers_evaluated}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${task.readiness_rate * 100}%` }}
                              className={`h-full ${
                                task.readiness_rate >= 0.7
                                  ? 'bg-emerald-500'
                                  : task.readiness_rate >= 0.4
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                          </div>
                        </div>
                        <div className="text-right min-w-[60px]">
                          <span
                            className={`text-lg font-bold ${
                              task.readiness_rate >= 0.7
                                ? 'text-emerald-400'
                                : task.readiness_rate >= 0.4
                                ? 'text-amber-400'
                                : 'text-rose-400'
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
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
                      <GraduationCap className="w-4 h-4" />
                      iGOT Karmayogi Bharat Demand
                    </div>
                    <div className="text-2xl font-bold text-white">{demand.igot_demand_count}</div>
                    <div className="text-xs text-slate-500 mt-1">Self-paced digital modules recommended</div>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                      <Building className="w-4 h-4" />
                      NSSTA Academy Demand
                    </div>
                    <div className="text-2xl font-bold text-white">{demand.nssta_demand_count}</div>
                    <div className="text-xs text-slate-500 mt-1">Residential / workshop interventions</div>
                  </div>

                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
                      <ShieldCheck className="w-4 h-4" />
                      TPAC Statutory Framework
                    </div>
                    <div className="text-2xl font-bold text-white">{demand.tpac_demand_count}</div>
                    <div className="text-xs text-slate-500 mt-1">Mandatory statistical syllabus units</div>
                  </div>
                </div>
              )}

              {/* Ranked Priorities Table */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-white mb-1">
                  National Capacity-Building Priority Queue
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  Prioritized training calendar recommendations based on gap severity, officer reach, and task bottleneck impact.
                </p>

                <div className="space-y-3">
                  {priorities.map((item) => (
                    <div
                      key={item.competency_id}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                          #{item.rank}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200">{item.competency_name}</span>
                            <span
                              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                                item.urgency === 'URGENT'
                                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                  : item.urgency === 'HIGH'
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              }`}
                            >
                              {item.urgency}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                              {item.recommended_provider}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{item.rationale}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0">
                        <div className="text-right">
                          <div className="text-white font-semibold">{item.affected_officers_count} Officers</div>
                          <div className="text-rose-400 font-mono">{item.red_gap_count} Red Gaps</div>
                        </div>
                        <div className="text-right min-w-[70px]">
                          <div className="text-xs text-slate-500">Score</div>
                          <div className="text-base font-bold text-indigo-300 font-mono">
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
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    <Info className="w-3.5 h-3.5 mr-1" />
                    Assumption-Based Role Target
                  </span>
                  <span className="text-xs text-slate-400">
                    Target definitions for statistical modernization under MoSPI Strategic Vision
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-white mb-1">
                  Future Role Readiness & Modernization Pipelines
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  Evaluates existing cadre readiness against modernized job profiles (AI Survey Analytics, Big Data Macroeconomics, etc.).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {futureRoles.map((role) => (
                    <div
                      key={role.role_id}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-white text-base">{role.role_title}</h3>
                            <span className="text-xs text-indigo-400 font-medium">
                              Target Cadre: {role.target_cadre}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                              role.urgency === 'HIGH'
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {role.urgency} Urgency
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{role.description}</p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-slate-800/80">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Qualified Pipeline:</span>
                          <span className="font-semibold text-slate-200">
                            {role.qualified_officers_count} / {role.total_cadre_officers} ({(role.readiness_rate * 100).toFixed(0)}%)
                          </span>
                        </div>

                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${role.readiness_rate * 100}%` }}
                            className="h-full bg-indigo-500"
                          />
                        </div>

                        {role.critical_missing_competencies.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] text-slate-400">Critical Missing Competencies:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {role.critical_missing_competencies.map((comp) => (
                                <span
                                  key={comp}
                                  className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-mono"
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
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4">
                <h2 className="text-lg font-semibold text-white">
                  Longitudinal Training Effectiveness Evaluation
                </h2>
                <p className="text-xs text-slate-400">
                  Measures pre-intervention vs. post-intervention mastery shifts across evaluated officer cohorts.
                </p>

                {effectiveness.status === 'insufficient_longitudinal_data' ? (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center space-y-2">
                    <Info className="w-8 h-8 text-amber-400 mx-auto" />
                    <h3 className="font-semibold text-amber-300">
                      Insufficient Longitudinal Data for Empirical Shift Analysis
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xl mx-auto">
                      {effectiveness.insufficient_data_reason ||
                        'STAT-GAP AI strictly adheres to empirical integrity standards and requires at least two separate verification/assessment cycles per cohort before reporting definitive percentage mastery shift rates.'}
                    </p>
                    <div className="pt-2 text-xs text-slate-500">
                      Evaluated Intervention Records: {effectiveness.total_evaluated_interventions}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                      <span className="text-xs text-slate-400">Mean Mastery Shift</span>
                      <div className="text-3xl font-bold text-emerald-400 mt-1">
                        +{(effectiveness.mean_mastery_shift * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
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
