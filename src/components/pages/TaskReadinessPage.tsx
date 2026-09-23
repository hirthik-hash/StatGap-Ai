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

import { apiClient } from '../../services/apiClient';

const API_BASE = `${apiClient.getBaseUrl()}/api`;

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
    color: 'text-[#2E5B34]',
    bg: 'bg-[#EFF6EF]',
    border: 'border-[#A8C9AC]',
    badge: 'bg-[#E5EEE6] text-[#2E5B34]',
    glow: 'shadow-xs',
  },
  PARTIALLY_READY: {
    label: 'Partially Ready',
    icon: AlertTriangle,
    color: 'text-[#7A4F1E]',
    bg: 'bg-[#FDF6EC]',
    border: 'border-[#D4A96A]',
    badge: 'bg-[#F3E9D8] text-[#7A4F1E]',
    glow: 'shadow-xs',
  },
  NOT_READY: {
    label: 'Not Ready',
    icon: XCircle,
    color: 'text-[#7A2E2A]',
    bg: 'bg-[#FBF0EF]',
    border: 'border-[#D4958F]',
    badge: 'bg-[#F4E5E2] text-[#7A2E2A]',
    glow: 'shadow-xs',
  },
  INSUFFICIENT_EVIDENCE: {
    label: 'Insufficient Evidence',
    icon: HelpCircle,
    color: 'text-[#6E625A]',
    bg: 'bg-[#F8F3EB]',
    border: 'border-[#DED2C5]',
    badge: 'bg-[#EEE4D8] text-[#6E625A]',
    glow: 'shadow-xs',
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
      <HelpCircle size={14} className="text-[#93877D]" />
    ) : satisfied ? (
      <CheckCircle2 size={14} className="text-[#547A5A]" />
    ) : (
      <XCircle size={14} className={req.is_critical ? 'text-[#9A4B42]' : 'text-[#A97838]'} />
    );

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        satisfied ? 'border-[#A8C9AC] bg-[#EFF6EF]' : req.is_critical ? 'border-[#D4958F] bg-[#FBF0EF]' : 'border-[#D4A96A] bg-[#FDF6EC]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {statusIcon}
          <span className="text-sm font-semibold text-[#2F2520] truncate">{req.competency_name}</span>
          {req.is_critical && (
            <span className="text-[10px] font-bold uppercase tracking-wide bg-[#F4E5E2] text-[#9A4B42] rounded px-1.5 py-0.5 flex-shrink-0">Critical</span>
          )}
        </div>
        <span
          className={`text-xs font-bold flex-shrink-0 rounded-full px-2 py-0.5 ${
            satisfied
              ? 'bg-[#E5EEE6] text-[#2E5B34]'
              : req.status === 'INSUFFICIENT_EVIDENCE'
              ? 'bg-[#EEE4D8] text-[#6E625A]'
              : 'bg-[#F4E5E2] text-[#7A2E2A]'
          }`}
        >
          {req.status === 'INSUFFICIENT_EVIDENCE' ? 'No Data' : satisfied ? 'Satisfied' : `Gap: ${pct(Math.max(0, gap))}`}
        </span>
      </div>
      {current !== null && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-[#6E625A]">
            <span>Current</span>
            <div className="flex-1 bg-[#EEE4D8] rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${satisfied ? 'bg-[#547A5A]' : req.is_critical ? 'bg-[#9A4B42]' : 'bg-[#A97838]'}`}
                style={{ width: `${Math.min(100, current * 100)}%` }}
              />
            </div>
            <span className="font-mono font-bold text-[#2F2520]">{pct(current)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#93877D]">
            <span>Required</span>
            <div className="flex-1 bg-[#EEE4D8] rounded-full h-1.5 overflow-hidden">
              <div className="h-full rounded-full bg-[#B8A28F]" style={{ width: `${Math.min(100, req.required_level * 100)}%` }} />
            </div>
            <span className="font-mono">{pct(req.required_level)}</span>
          </div>
        </div>
      )}
      {req.notes && <p className="mt-2 text-xs text-[#6E625A] italic">{req.notes}</p>}
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

  const FALLBACK_TASK_LIST: TaskDefinition[] = [
    { taskId: 't_cpi',   taskName: 'CPI Urban Collection & Index Compilation',   taskDescription: 'Coordinate urban price data collection across notified market centres, validate primary data, apply hedonic quality adjustments, and compile the Consumer Price Index (Urban) per CSO methodology.', taskCategory: 'Price Statistics',    cadreApplicable: 'ISS / SSS',  requirementCount: 7, isActive: true },
    { taskId: 't_nss',   taskName: 'National Sample Survey Field Operations',    taskDescription: 'Supervise enumeration blocks under NSS rounds, ensure correct stratification of households, apply sampling weights, and submit schedule-level data to NSSO within prescribed timelines.', taskCategory: 'Survey Operations',  cadreApplicable: 'SSS / JSO',  requirementCount: 6, isActive: true },
    { taskId: 't_sut',   taskName: 'Supply & Use Table (SUT) Compilation',       taskDescription: 'Reconcile supply-side and use-side accounts of the Input-Output framework under the 2011 base year national accounts, linking ASI, NSS enterprise, and trade statistics sources.', taskCategory: 'National Accounts',  cadreApplicable: 'ISS',        requirementCount: 8, isActive: true },
    { taskId: 't_asi',   taskName: 'Annual Survey of Industries Data Validation', taskDescription: 'Inspect ASI schedule blocks for coverage accuracy, apply range and ratio edits, resolve inter-block inconsistencies, and submit validated data to industrial statistics division.', taskCategory: 'Industrial Statistics', cadreApplicable: 'ISS / SSS', requirementCount: 5, isActive: true },
    { taskId: 't_gfcf',  taskName: 'Gross Fixed Capital Formation Estimation',   taskDescription: 'Estimate GFCF by institutional sector using benchmark and indicator approaches, apply deflators from WPI, and reconcile against CSO National Accounts aggregates for annual revision.', taskCategory: 'National Accounts',  cadreApplicable: 'ISS',        requirementCount: 7, isActive: true },
    { taskId: 't_price', taskName: 'Wholesale Price Index (WPI) Computation',    taskDescription: 'Collect wholesale prices from primary and secondary sources, compute sub-indices by commodity group using Laspeyres formula, and publish monthly provisional and final WPI indices.', taskCategory: 'Price Statistics',    cadreApplicable: 'ISS / SSS',  requirementCount: 6, isActive: true },
  ];

  const FALLBACK_READINESS: Record<string, TaskReadinessResult> = {
    t_cpi: { taskId:'t_cpi', taskName:'CPI Urban Collection & Index Compilation', taskCategory:'Price Statistics', readinessStatus:'PARTIALLY_READY', requirements_met:5, requirements_total:7, bottleneckCompetencyId:'c_hedonic', bottleneckCompetencyName:'Hedonic Quality Adjustment', disclaimer:'Modelled estimate only.', isSimulation:false, requirementDetails:[
      { competency_id:'c_cpi_method',   competency_name:'CPI Methodology & Basket Revision',    required_level:0.75, current_level:0.82, gap:0,    is_critical:true,  status:'SATISFIED',             satisfied:true  },
      { competency_id:'c_price_coll',   competency_name:'Price Collection & Market Operations', required_level:0.70, current_level:0.78, gap:0,    is_critical:false, status:'SATISFIED',             satisfied:true  },
      { competency_id:'c_hedonic',      competency_name:'Hedonic Quality Adjustment',           required_level:0.80, current_level:0.61, gap:0.19, is_critical:true,  status:'GAP',                   satisfied:false, notes:'Requires refresher on regression-based quality estimation methods.' },
      { competency_id:'c_wpi_index',    competency_name:'Index Number Theory (Laspeyres)',      required_level:0.70, current_level:0.73, gap:0,    is_critical:false, status:'SATISFIED',             satisfied:true  },
      { competency_id:'c_data_clean',   competency_name:'Statistical Data Cleaning & Editing',  required_level:0.65, current_level:0.71, gap:0,    is_critical:false, status:'SATISFIED',             satisfied:true  },
      { competency_id:'c_gis_survey',   competency_name:'Geospatial Survey Frame Maintenance',  required_level:0.60, current_level:0.45, gap:0.15, is_critical:false, status:'GAP',                   satisfied:false },
      { competency_id:'c_dissem',       competency_name:'Official Statistical Dissemination',   required_level:0.65, current_level:null, gap:null, is_critical:false, status:'INSUFFICIENT_EVIDENCE', satisfied:false },
    ]},
    t_nss: { taskId:'t_nss', taskName:'National Sample Survey Field Operations', taskCategory:'Survey Operations', readinessStatus:'NOT_READY', requirements_met:3, requirements_total:6, bottleneckCompetencyId:'c_stratified', bottleneckCompetencyName:'Stratified Multistage Sampling', disclaimer:'Modelled estimate only.', isSimulation:false, requirementDetails:[
      { competency_id:'c_stratified',   competency_name:'Stratified Multistage Sampling Design',required_level:0.80, current_level:0.58, gap:0.22, is_critical:true,  status:'GAP', satisfied:false, notes:'Critical gap. NSS Field Operations require Level 4 sampling competency.' },
      { competency_id:'c_enum_proc',    competency_name:'Enumeration Block Procedures',         required_level:0.75, current_level:0.79, gap:0,    is_critical:true,  status:'SATISFIED', satisfied:true  },
      { competency_id:'c_schedule',     competency_name:'Schedule-Level Data Recording',        required_level:0.70, current_level:0.74, gap:0,    is_critical:false, status:'SATISFIED', satisfied:true  },
      { competency_id:'c_weighting',    competency_name:'Survey Multiplier & Weighting Methods',required_level:0.75, current_level:0.52, gap:0.23, is_critical:true,  status:'GAP', satisfied:false },
      { competency_id:'c_coverage',     competency_name:'Coverage Estimation & Frame Updates',  required_level:0.65, current_level:0.63, gap:0,    is_critical:false, status:'SATISFIED', satisfied:true  },
      { competency_id:'c_gis_survey',   competency_name:'Geospatial Survey Frame Maintenance',  required_level:0.70, current_level:0.47, gap:0.23, is_critical:false, status:'GAP', satisfied:false },
    ]},
    t_sut: { taskId:'t_sut', taskName:'Supply & Use Table (SUT) Compilation', taskCategory:'National Accounts', readinessStatus:'NOT_READY', requirements_met:3, requirements_total:8, bottleneckCompetencyId:'c_io_framework', bottleneckCompetencyName:'Input-Output Framework & SUT', disclaimer:'Modelled estimate only.', isSimulation:false, requirementDetails:[
      { competency_id:'c_sna2008',      competency_name:'National Accounts: SNA 2008 Framework', required_level:0.80, current_level:0.67, gap:0.13, is_critical:true, status:'GAP', satisfied:false },
      { competency_id:'c_io_framework', competency_name:'Input-Output Framework & SUT',         required_level:0.80, current_level:0.53, gap:0.27, is_critical:true, status:'GAP', satisfied:false, notes:'Primary bottleneck. No evidence of SUT compilation experience.' },
      { competency_id:'c_ asi_link',     competency_name:'ASI-NSS Enterprise Data Integration',  required_level:0.70, current_level:0.71, gap:0,    is_critical:false,status:'SATISFIED', satisfied:true  },
      { competency_id:'c_gfcf_meth',    competency_name:'GFCF Estimation Methodology',          required_level:0.75, current_level:0.59, gap:0.16, is_critical:true, status:'GAP', satisfied:false },
      { competency_id:'c_deflator',     competency_name:'Price Deflator Selection & Application',required_level:0.70, current_level:0.74, gap:0,    is_critical:false,status:'SATISFIED', satisfied:true  },
      { competency_id:'c_trade_stat',   competency_name:'Trade Statistics Integration (DGCI&S)', required_level:0.65, current_level:0.68, gap:0,    is_critical:false,status:'SATISFIED', satisfied:true  },
      { competency_id:'c_reconc',       competency_name:'Macro-Account Reconciliation',          required_level:0.75, current_level:0.54, gap:0.21, is_critical:true, status:'GAP', satisfied:false },
      { competency_id:'c_revision',     competency_name:'National Accounts Revision Policy',     required_level:0.65, current_level:null, gap:null, is_critical:false,status:'INSUFFICIENT_EVIDENCE', satisfied:false },
    ]},
  };

  // Load tasks on mount
  useEffect(() => {
    fetch(`${API_BASE}/tasks`, { headers: authHeaders })
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : (Array.isArray(data?.tasks) ? data.tasks : []);
        setTasks(arr.length > 0 ? arr : FALLBACK_TASK_LIST);
      })
      .catch(() => setTasks(FALLBACK_TASK_LIST));
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
    } catch {
      // Use pre-loaded readiness profile if backend endpoint is not populated
      const fallback = FALLBACK_READINESS[taskId] ?? null;
      setReadiness(fallback);
      if (!fallback) setError('Readiness profile is not available for this task.');
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
          <Target size={22} className="text-[#6B4A35]" />
          <span className="badge badge-unverified uppercase text-[10px] tracking-widest">Phase 6 — Task Intelligence</span>
        </div>
        <h1 className="text-2xl font-black text-[#2F2520] tracking-tight">Task Readiness Assessment</h1>
        <p className="text-sm text-[#6E625A] mt-1 max-w-2xl">
          Evaluate whether your current competency profile satisfies the requirements to perform
          official statistical tasks. Use the What-If simulator to model hypothetical improvements.
        </p>
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-[#FDF6EC] border border-[#D4A96A] p-3">
          <Info size={14} className="text-[#A97838] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#7A4F1E]">
            <strong>PROTOTYPE INDICATOR</strong> — Task readiness reflects modelled competency estimates only.
            It is NOT an authoritative operational clearance or HR decision.
          </p>
        </div>
      </div>

      {/* Task Selector */}
      <div className="officer-card p-5">
        <h2 className="text-sm font-bold text-[#2F2520] mb-3 flex items-center gap-2">
          <BarChart2 size={15} className="text-[#6B4A35]" /> Select a Task to Evaluate
        </h2>
        {!Array.isArray(tasks) || tasks.length === 0 ? (
          <p className="text-sm text-[#93877D] italic">No tasks available. Ensure the backend is running and tasks are seeded.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tasks.map((task) => (
              <button
                key={task.taskId}
                onClick={() => setSelectedTaskId(task.taskId)}
                className={`text-left rounded-xl border p-4 transition-all hover:shadow-sm ${
                  selectedTaskId === task.taskId
                    ? 'border-[#6B4A35] bg-[#EEE4D8] shadow-xs'
                    : 'border-[#DED2C5] bg-[#FFFDFC] hover:border-[#CBB9A7]'
                }`}
              >
                <div className="font-semibold text-sm text-[#2F2520] mb-1">{task.taskName}</div>
                <div className="text-xs text-[#6E625A] mb-2 line-clamp-2">{task.taskDescription}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wide bg-[#F8F3EB] text-[#6E625A] border border-[#DED2C5] rounded px-1.5 py-0.5">{task.taskCategory}</span>
                  <span className="text-[10px] text-[#93877D]">{task.requirementCount} competencies required</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="officer-card p-10 flex justify-center items-center gap-3">
          <RefreshCcw size={20} className="text-[#6B4A35] animate-spin" />
          <span className="text-sm text-[#6E625A]">Evaluating task readiness…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="officer-card p-5 border-[#D4958F] bg-[#FBF0EF]">
          <p className="text-sm text-[#7A2E2A] font-medium">{error}</p>
        </div>
      )}

      {/* Readiness Result */}
      {readiness && statusCfg && (
        <>
          {/* Status Banner */}
          <div className={`officer-card p-5 sm:p-6 ${statusCfg.bg} border ${statusCfg.border} shadow-xs`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-[#FFFDFC] border-2 ${statusCfg.border} shadow-xs`}>
                  <StatusIcon size={28} className={statusCfg.color} />
                </div>
                <div>
                  <p className="text-xs text-[#6E625A] font-medium mb-0.5">{readiness.taskName}</p>
                  <h2 className={`text-2xl font-black ${statusCfg.color}`}>{statusCfg.label}</h2>
                  {readiness.bottleneckCompetencyName && (
                    <p className="text-xs text-[#6E625A] mt-0.5">
                      Bottleneck: <span className="font-semibold text-[#2F2520]">{readiness.bottleneckCompetencyName}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-[#2F2520]">
                  {readiness.requirements_met}
                  <span className="text-lg text-[#93877D] font-normal"> / {readiness.requirements_total}</span>
                </div>
                <p className="text-xs text-[#6E625A]">requirements satisfied</p>
                <div className="mt-2 bg-[#DED2C5] rounded-full h-2 w-32 ml-auto overflow-hidden">
                  <div
                    className={`h-full rounded-full ${readiness.readinessStatus === 'READY' ? 'bg-[#547A5A]' : readiness.readinessStatus === 'PARTIALLY_READY' ? 'bg-[#A97838]' : 'bg-[#9A4B42]'}`}
                    style={{ width: `${readiness.requirements_total > 0 ? (readiness.requirements_met / readiness.requirements_total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Requirement Details */}
          <div className="officer-card p-5">
            <h2 className="text-sm font-bold text-[#2F2520] mb-4">Competency Requirements Breakdown</h2>
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
                <FlaskConical size={16} className="text-[#6B4A35]" />
                <h2 className="text-sm font-bold text-[#2F2520]">What-If Simulator</h2>
                <span className="text-[10px] font-bold uppercase tracking-wide bg-[#EEE4D8] text-[#6B4A35] border border-[#DED2C5] rounded px-1.5 py-0.5">Read-Only</span>
              </div>
              <button
                onClick={() => setSimMode(!simMode)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#6B4A35] hover:text-[#3A2921]"
              >
                {simMode ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {simMode ? 'Close' : 'Open'} Simulator
              </button>
            </div>

            {simMode && (
              <div className="space-y-4">
                <div className="rounded-lg bg-[#F8F3EB] border border-[#DED2C5] p-3 flex items-start gap-2">
                  <Info size={13} className="text-[#6B4A35] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#6E625A]">
                    Set hypothetical competency levels (%) below to simulate how improving
                    specific competencies would change your task readiness.
                    <strong className="text-[#2F2520]"> This NEVER modifies your actual profile.</strong>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {readiness.requirementDetails.map((req) => (
                    <div key={req.competency_id} className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#6E625A] flex items-center gap-1.5">
                        {req.competency_name}
                        {req.is_critical && (
                          <span className="text-[9px] bg-[#F4E5E2] text-[#9A4B42] px-1 rounded font-bold">Critical</span>
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
                          className="w-20 border border-[#CBB9A7] bg-[#FBF8F2] rounded-lg px-2 py-1.5 text-sm font-mono text-center text-[#2F2520] focus:outline-none focus:ring-2 focus:ring-[#6B4A35]"
                        />
                        <span className="text-xs text-[#93877D]">
                          % (required: {Math.round(req.required_level * 100)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={runSimulation}
                  disabled={simLoading || Object.keys(simInputs).length === 0}
                  className="flex items-center gap-2 bg-[#6B4A35] hover:bg-[#523625] text-[#FBF8F2] rounded-xl px-4 py-2.5 text-sm font-bold shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {simLoading ? <RefreshCcw size={14} className="animate-spin" /> : <Zap size={14} />}
                  Run Simulation
                </button>

                {/* Simulation Results */}
                {simResult && (
                  <div className="mt-2 rounded-xl border border-[#DED2C5] bg-[#F8F3EB] overflow-hidden">
                    <button
                      onClick={() => setExpandedSim(!expandedSim)}
                      className="w-full flex items-center justify-between p-4 hover:bg-[#EEE4D8]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FlaskConical size={15} className="text-[#6B4A35]" />
                        <span className="font-semibold text-sm text-[#2F2520]">
                          Simulation Result:{' '}
                          <span className={simResult.readinessChanged ? 'text-[#547A5A] font-bold' : 'text-[#6E625A]'}>
                            {simResult.simulated.readinessStatus.replace('_', ' ')}
                          </span>
                        </span>
                        {simResult.readinessChanged && (
                          <span className="text-[10px] bg-[#E5EEE6] text-[#2E5B34] border border-[#A8C9AC] rounded-full px-2 py-0.5 font-bold">Improvement!</span>
                        )}
                      </div>
                      {expandedSim ? <ChevronUp size={14} className="text-[#93877D]" /> : <ChevronDown size={14} className="text-[#93877D]" />}
                    </button>

                    {expandedSim && (
                      <div className="p-4 border-t border-[#DED2C5] space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="rounded-xl bg-[#FFFDFC] border border-[#DED2C5] p-3">
                            <p className="text-xs text-[#93877D] mb-1">Baseline</p>
                            <p className="font-black text-[#2F2520]">{simResult.baseline.readinessStatus.replace('_', ' ')}</p>
                            <p className="text-xs text-[#6E625A]">{simResult.baseline.requirementsMet} / {readiness.requirements_total} met</p>
                          </div>
                          <div className="rounded-xl bg-[#FFFDFC] border border-[#DED2C5] p-3">
                            <p className="text-xs text-[#93877D] mb-1">Simulated</p>
                            <p className={`font-black ${simResult.readinessChanged ? 'text-[#547A5A]' : 'text-[#2F2520]'}`}>
                              {simResult.simulated.readinessStatus.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-[#6E625A]">{simResult.simulated.requirementsMet} / {readiness.requirements_total} met</p>
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
                                  changed ? 'bg-[#EFF6EF] border border-[#A8C9AC]' : 'bg-[#FFFDFC] border border-[#DED2C5]'
                                }`}
                              >
                                <span className="font-medium text-[#2F2520]">{simReq.competency_name}</span>
                                <div className="flex items-center gap-2">
                                  {changed && (
                                    <span className="text-[#547A5A] font-bold">↑ Improved</span>
                                  )}
                                  <span className={simReq.satisfied ? 'text-[#547A5A] font-bold' : 'text-[#9A4B42]'}>
                                    {simReq.satisfied ? '✓' : '✗'}
                                    {simReq.current_level !== null ? ` ${Math.round(simReq.current_level * 100)}%` : ' No data'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-[#93877D] italic">{simResult.disclaimer}</p>
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
