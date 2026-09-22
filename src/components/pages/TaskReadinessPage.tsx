import React, { useState, useEffect, useCallback } from 'react';
import { NavPageId } from '../common/Sidebar';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Target,
  Zap,
  BarChart2,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  RefreshCcw,
  Info,
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

interface TaskDefinition {
  taskId: string;
  taskName: string;
  taskDescription?: string;
  taskCategory: string;
  cadreApplicable?: string;
  requirementCount: number;
  isActive: boolean;
}

interface RequirementDetail {
  competency_id: string;
  competency_name: string;
  required_level: number;
  current_level: number | null;
  gap: number | null;
  is_critical: boolean;
  status: 'SATISFIED' | 'GAP' | 'INSUFFICIENT_EVIDENCE';
  satisfied: boolean;
  notes?: string;
}

interface TaskReadinessResult {
  taskId: string;
  taskName: string;
  taskDescription?: string;
  taskCategory?: string;
  readinessStatus: 'READY' | 'PARTIALLY_READY' | 'NOT_READY' | 'INSUFFICIENT_EVIDENCE';
  requirements_met: number;
  requirements_total: number;
  bottleneckCompetencyId: string | null;
  bottleneckCompetencyName: string | null;
  requirementDetails: RequirementDetail[];
  evaluationSummary?: Record<string, number>;
  disclaimer: string;
  isSimulation: boolean;
}

interface SimulationResult {
  simulationId: string;
  taskId: string;
  taskName: string;
  baseline: {
    readinessStatus: string;
    requirementDetails: RequirementDetail[];
    requirementsMet: number;
  };
  simulated: {
    readinessStatus: string;
    requirementDetails: RequirementDetail[];
    requirementsMet: number;
  };
  readinessChanged: boolean;
  disclaimer: string;
  isSimulation: boolean;
}

interface TaskReadinessPageProps {
  userId: string;
  onNavigate: (page: NavPageId) => void;
}

// --- Status Config ---
const STATUS_CONFIG = {
  READY: {
    label: 'Ready',
    icon: CheckCircle2,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800',
    glow: 'shadow-emerald-100',
  },
  PARTIALLY_READY: {
    label: 'Partially Ready',
    icon: AlertTriangle,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800',
    glow: 'shadow-amber-100',
  },
  NOT_READY: {
    label: 'Not Ready',
    icon: XCircle,
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800',
    glow: 'shadow-red-100',
  },
  INSUFFICIENT_EVIDENCE: {
    label: 'Insufficient Evidence',
    icon: HelpCircle,
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-600',
    glow: 'shadow-slate-100',
  },
} as const;

function getAuthToken(): string {
  return localStorage.getItem('auth_token') || '';
}

const RequirementRow: React.FC<{ req: RequirementDetail; simLevel?: number | null }> = ({ req, simLevel }) => {
  const current = simLevel !== undefined && simLevel !== null ? simLevel : req.current_level;
  const gap = req.required_level - (current ?? 0);
  const satisfied = current !== null && gap <= 0.05;
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  const statusIcon =
    req.status === 'INSUFFICIENT_EVIDENCE' ? (
      <HelpCircle size={14} className="text-slate-400" />
    ) : satisfied ? (
      <CheckCircle2 size={14} className="text-emerald-500" />
    ) : (
      <XCircle size={14} className={req.is_critical ? 'text-red-500' : 'text-amber-500'} />
    );

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        satisfied ? 'border-emerald-100 bg-emerald-50/50' : req.is_critical ? 'border-red-100 bg-red-50/40' : 'border-amber-100 bg-amber-50/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {statusIcon}
          <span className="text-sm font-semibold text-slate-800 truncate">{req.competency_name}</span>
          {req.is_critical && (
            <span className="text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700 rounded px-1.5 py-0.5 flex-shrink-0">Critical</span>
          )}
        </div>
        <span
          className={`text-xs font-bold flex-shrink-0 rounded-full px-2 py-0.5 ${
            satisfied
              ? 'bg-emerald-100 text-emerald-700'
              : req.status === 'INSUFFICIENT_EVIDENCE'
              ? 'bg-slate-100 text-slate-500'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {req.status === 'INSUFFICIENT_EVIDENCE' ? 'No Data' : satisfied ? 'Satisfied' : `Gap: ${pct(Math.max(0, gap))}`}
        </span>
      </div>
      {current !== null && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Current</span>
            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${satisfied ? 'bg-emerald-500' : req.is_critical ? 'bg-red-400' : 'bg-amber-400'}`}
                style={{ width: `${Math.min(100, current * 100)}%` }}
              />
            </div>
            <span className="font-mono font-bold">{pct(current)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Required</span>
            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full rounded-full bg-slate-300" style={{ width: `${Math.min(100, req.required_level * 100)}%` }} />
            </div>
            <span className="font-mono">{pct(req.required_level)}</span>
          </div>
        </div>
      )}
      {req.notes && <p className="mt-2 text-xs text-slate-400 italic">{req.notes}</p>}
    </div>
  );
}

export const TaskReadinessPage: React.FC<TaskReadinessPageProps> = ({ userId, onNavigate }) => {
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<TaskReadinessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // What-if simulation state
  const [simMode, setSimMode] = useState(false);
  const [simInputs, setSimInputs] = useState<Record<string, string>>({});
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [expandedSim, setExpandedSim] = useState(false);

  const authHeaders = { Authorization: `Bearer ${getAuthToken()}` };

  // Load tasks on mount
  useEffect(() => {
    fetch(`${API_BASE}/tasks`, { headers: authHeaders })
      .then((r) => r.json())
      .then(setTasks)
      .catch(() => {/* offline — no task data */});
  }, []);

  // Load readiness when task selected
  const loadReadiness = useCallback(async (taskId: string) => {
    setLoading(true);
    setError(null);
    setReadiness(null);
    setSimResult(null);
    setSimInputs({});
    try {
      const r = await fetch(`${API_BASE}/tasks/${taskId}/readiness`, { headers: authHeaders });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setReadiness(data);
    } catch (e: any) {
      setError(`Could not load task readiness: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTaskId) loadReadiness(selectedTaskId);
  }, [selectedTaskId, loadReadiness]);

  // Run what-if simulation
  const runSimulation = async () => {
    if (!selectedTaskId || !readiness) return;
    setSimLoading(true);
    setSimResult(null);
    const changes = readiness.requirementDetails
      .filter((req) => simInputs[req.competency_id] !== undefined)
      .map((req) => ({
        competency_id: req.competency_id,
        hypothetical_level: Math.min(1.0, Math.max(0.0, Number(simInputs[req.competency_id]) / 100)),
      }))
      .filter((c) => !isNaN(c.hypothetical_level));

    if (changes.length === 0) {
      setSimLoading(false);
      return;
    }

    try {
      const r = await fetch(`${API_BASE}/tasks/${selectedTaskId}/simulate`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hypothetical_changes: changes }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSimResult(await r.json());
      setExpandedSim(true);
    } catch (e: any) {
      setError(`Simulation failed: ${e.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  const statusCfg = readiness ? STATUS_CONFIG[readiness.readinessStatus] : null;
  const StatusIcon = statusCfg?.icon ?? HelpCircle;

  return (
    <div className="space-y-5 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="officer-card p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-1">
          <Target size={22} className="text-indigo-600" />
          <span className="badge badge-purple uppercase text-[10px] tracking-widest">Phase 6 — Task Intelligence</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Task Readiness Assessment</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Evaluate whether your current competency profile satisfies the requirements to perform
          official statistical tasks. Use the What-If simulator to model hypothetical improvements.
        </p>
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <Info size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            <strong>PROTOTYPE INDICATOR</strong> — Task readiness reflects modelled competency estimates only.
            It is NOT an authoritative operational clearance or HR decision.
          </p>
        </div>
      </div>

      {/* Task Selector */}
      <div className="officer-card p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <BarChart2 size={15} className="text-indigo-500" /> Select a Task to Evaluate
        </h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No tasks available. Ensure the backend is running and tasks are seeded.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tasks.map((task) => (
              <button
                key={task.taskId}
                onClick={() => setSelectedTaskId(task.taskId)}
                className={`text-left rounded-xl border p-4 transition-all hover:shadow-md ${
                  selectedTaskId === task.taskId
                    ? 'border-indigo-300 bg-indigo-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-indigo-200'
                }`}
              >
                <div className="font-semibold text-sm text-slate-800 mb-1">{task.taskName}</div>
                <div className="text-xs text-slate-500 mb-2 line-clamp-2">{task.taskDescription}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wide bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">{task.taskCategory}</span>
                  <span className="text-[10px] text-slate-400">{task.requirementCount} competencies required</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="officer-card p-10 flex justify-center items-center gap-3">
          <RefreshCcw size={20} className="text-indigo-500 animate-spin" />
          <span className="text-sm text-slate-500">Evaluating task readiness…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="officer-card p-5 border-red-200 bg-red-50">
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      {/* Readiness Result */}
      {readiness && statusCfg && (
        <>
          {/* Status Banner */}
          <div className={`officer-card p-5 sm:p-6 ${statusCfg.bg} border ${statusCfg.border} shadow-lg ${statusCfg.glow}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${statusCfg.bg} border-2 ${statusCfg.border} shadow-inner`}>
                  <StatusIcon size={28} className={statusCfg.color} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-0.5">{readiness.taskName}</p>
                  <h2 className={`text-2xl font-black ${statusCfg.color}`}>{statusCfg.label}</h2>
                  {readiness.bottleneckCompetencyName && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      Bottleneck: <span className="font-semibold">{readiness.bottleneckCompetencyName}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-slate-900">
                  {readiness.requirements_met}
                  <span className="text-lg text-slate-400 font-normal"> / {readiness.requirements_total}</span>
                </div>
                <p className="text-xs text-slate-500">requirements satisfied</p>
                <div className="mt-2 bg-slate-200 rounded-full h-2 w-32 ml-auto overflow-hidden">
                  <div
                    className={`h-full rounded-full ${statusCfg.color.replace('text-', 'bg-')}`}
                    style={{ width: `${readiness.requirements_total > 0 ? (readiness.requirements_met / readiness.requirements_total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Requirement Details */}
          <div className="officer-card p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Competency Requirements Breakdown</h2>
            <div className="space-y-3">
              {readiness.requirementDetails.map((req) => (
                <RequirementRow key={req.competency_id} req={req} />
              ))}
            </div>
          </div>

          {/* What-If Simulation */}
          <div className="officer-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FlaskConical size={16} className="text-violet-600" />
                <h2 className="text-sm font-bold text-slate-700">What-If Simulator</h2>
                <span className="text-[10px] font-bold uppercase tracking-wide bg-violet-100 text-violet-700 rounded px-1.5 py-0.5">Read-Only</span>
              </div>
              <button
                onClick={() => setSimMode(!simMode)}
                className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800"
              >
                {simMode ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {simMode ? 'Close' : 'Open'} Simulator
              </button>
            </div>

            {simMode && (
              <div className="space-y-4">
                <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 flex items-start gap-2">
                  <Info size={13} className="text-violet-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-violet-700">
                    Set hypothetical competency levels (%) below to simulate how improving
                    specific competencies would change your task readiness.
                    <strong> This NEVER modifies your actual profile.</strong>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {readiness.requirementDetails.map((req) => (
                    <div key={req.competency_id} className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                        {req.competency_name}
                        {req.is_critical && (
                          <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded">Critical</span>
                        )}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          placeholder={req.current_level !== null ? `${Math.round(req.current_level * 100)}` : '?'}
                          value={simInputs[req.competency_id] ?? ''}
                          onChange={(e) =>
                            setSimInputs((prev) => ({ ...prev, [req.competency_id]: e.target.value }))
                          }
                          className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-violet-300"
                        />
                        <span className="text-xs text-slate-400">
                          % (required: {Math.round(req.required_level * 100)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={runSimulation}
                  disabled={simLoading || Object.keys(simInputs).length === 0}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2.5 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {simLoading ? <RefreshCcw size={14} className="animate-spin" /> : <Zap size={14} />}
                  Run Simulation
                </button>

                {/* Simulation Results */}
                {simResult && (
                  <div className="mt-2 rounded-xl border border-violet-200 bg-violet-50/50 overflow-hidden">
                    <button
                      onClick={() => setExpandedSim(!expandedSim)}
                      className="w-full flex items-center justify-between p-4 hover:bg-violet-50"
                    >
                      <div className="flex items-center gap-3">
                        <FlaskConical size={15} className="text-violet-600" />
                        <span className="font-semibold text-sm text-slate-800">
                          Simulation Result:{' '}
                          <span className={simResult.readinessChanged ? 'text-emerald-600' : 'text-slate-500'}>
                            {simResult.simulated.readinessStatus.replace('_', ' ')}
                          </span>
                        </span>
                        {simResult.readinessChanged && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-bold">Improvement!</span>
                        )}
                      </div>
                      {expandedSim ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </button>

                    {expandedSim && (
                      <div className="p-4 border-t border-violet-100 space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="rounded-xl bg-white border border-slate-200 p-3">
                            <p className="text-xs text-slate-400 mb-1">Baseline</p>
                            <p className="font-black text-slate-700">{simResult.baseline.readinessStatus.replace('_', ' ')}</p>
                            <p className="text-xs text-slate-400">{simResult.baseline.requirementsMet} / {readiness.requirements_total} met</p>
                          </div>
                          <div className="rounded-xl bg-white border border-slate-200 p-3">
                            <p className="text-xs text-slate-400 mb-1">Simulated</p>
                            <p className={`font-black ${simResult.readinessChanged ? 'text-emerald-600' : 'text-slate-700'}`}>
                              {simResult.simulated.readinessStatus.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-slate-400">{simResult.simulated.requirementsMet} / {readiness.requirements_total} met</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {simResult.simulated.requirementDetails.map((simReq) => {
                            const baseReq = simResult.baseline.requirementDetails.find(
                              (r) => r.competency_id === simReq.competency_id
                            );
                            const changed = simReq.satisfied !== baseReq?.satisfied;
                            return (
                              <div
                                key={simReq.competency_id}
                                className={`flex items-center justify-between p-2.5 rounded-lg text-xs ${
                                  changed ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-slate-100'
                                }`}
                              >
                                <span className="font-medium text-slate-700">{simReq.competency_name}</span>
                                <div className="flex items-center gap-2">
                                  {changed && (
                                    <span className="text-emerald-600 font-bold">↑ Improved</span>
                                  )}
                                  <span className={simReq.satisfied ? 'text-emerald-600' : 'text-red-500'}>
                                    {simReq.satisfied ? '✓' : '✗'}
                                    {simReq.current_level !== null ? ` ${Math.round(simReq.current_level * 100)}%` : ' No data'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-slate-400 italic">{simResult.disclaimer}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
