import React, { useState, useEffect } from 'react';
import {
  Activity,
  Shield,
  Layers,
  Camera,
  Play,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  RefreshCw,
  GitFork,
  FileCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { NavPageId } from '../common/Sidebar';

interface DigitalTwinPageProps {
  onNavigate: (page: NavPageId) => void;
  onSelectCompetency?: (id: string) => void;
}

export const DigitalTwinPage: React.FC<DigitalTwinPageProps> = ({
  onNavigate,
  onSelectCompetency,
}) => {
  const [twinData, setTwinData] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedComp, setExpandedComp] = useState<string | null>(null);

  // What-If Simulation State
  const [simCompId, setSimCompId] = useState<string>('');
  const [simIntervention, setSimIntervention] = useState('NSSTA_TARGETED_WORKSHOP');
  const [simScore, setSimScore] = useState<number>(0.85);
  const [simResult, setSimResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null);

  const getHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('stat_gap_auth_token') || localStorage.getItem('statgap_token') || sessionStorage.getItem('stat_gap_auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchTwinData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getHeaders();

      const [twinRes, snapRes] = await Promise.all([
        fetch('http://localhost:8000/api/officer/digital-twin', { headers }),
        fetch('http://localhost:8000/api/officer/digital-twin/snapshots', { headers }),
      ]);

      if (!twinRes.ok) {
        throw new Error(`Failed to load Digital Twin: ${twinRes.statusText}`);
      }

      const twinJson = await twinRes.json();
      setTwinData(twinJson);
      if (twinJson.competencyStates && twinJson.competencyStates.length > 0) {
        setSimCompId(twinJson.competencyStates[0].competencyId);
      }

      if (snapRes.ok) {
        const snapJson = await snapRes.json();
        setSnapshots(snapJson);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching Competency Digital Twin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTwinData();
  }, []);

  const handleCaptureSnapshot = async () => {
    setSnapshotLoading(true);
    setSnapshotMessage(null);
    try {
      const headers = getHeaders();

      const res = await fetch('http://localhost:8000/api/officer/digital-twin/snapshot?trigger_event=OFFICER_MANUAL_CAPTURE', {
        method: 'POST',
        headers,
      });

      if (!res.ok) throw new Error('Failed to capture snapshot');
      const data = await res.json();
      setSnapshotMessage(`Snapshot ${data.snapshotId.substring(0, 8)}... created!`);
      // Refresh snapshots list
      const snapRes = await fetch('http://localhost:8000/api/officer/digital-twin/snapshots', { headers });
      if (snapRes.ok) setSnapshots(await snapRes.json());
    } catch (err: any) {
      setSnapshotMessage(`Failed: ${err.message}`);
    } finally {
      setSnapshotLoading(false);
    }
  };

  const handleRunSimulation = async () => {
    if (!simCompId) return;
    setSimulating(true);
    setSimResult(null);
    try {
      const headers = getHeaders();

      const res = await fetch('http://localhost:8000/api/officer/digital-twin/simulate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetCompetencyId: simCompId,
          interventionType: simIntervention,
          hypotheticalScore: simScore,
        }),
      });

      if (!res.ok) throw new Error('Simulation calculation failed');
      const data = await res.json();
      setSimResult(data);
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-sky-400" />
        <p className="text-sm">Synthesizing Competency Digital Twin computational state...</p>
      </div>
    );
  }

  if (error || !twinData) {
    return (
      <div className="officer-card p-6 border-red-500/30 bg-red-950/20 text-red-300">
        <div className="flex items-center gap-3">
          <AlertOctagon className="w-6 h-6 text-red-400" />
          <h3 className="font-bold text-lg">Unable to load Competency Digital Twin</h3>
        </div>
        <p className="text-sm text-red-400/80 mt-2">{error}</p>
        <button
          onClick={fetchTwinData}
          className="mt-4 px-4 py-2 bg-red-600/30 hover:bg-red-600/40 text-red-200 rounded-lg text-sm transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { identityContext, kpiSummary, competencyStates } = twinData;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* ── Top Computational Identity Context Banner ── */}
      <div className="officer-card p-6 border-sky-500/30 bg-gradient-to-r from-[#0d1e38] via-[#091527] to-[#0d1e38]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-inner">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge badge-verified uppercase text-[10px] tracking-wider">
                  Phase 3 Computational State
                </span>
                <span className="text-xs text-slate-400">
                  Cadre: <span className="text-sky-300 font-semibold">{identityContext.cadre}</span>
                </span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                {identityContext.name} — Competency Digital Twin
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Assignment: <span className="text-slate-200">{identityContext.currentAssignment}</span> • Dept: <span className="text-slate-200">{identityContext.department}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCaptureSnapshot}
              disabled={snapshotLoading}
              className="flex items-center gap-2 px-3.5 py-2 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-400/30 text-sky-300 text-xs font-semibold rounded-lg transition"
            >
              <Camera className="w-4 h-4" />
              {snapshotLoading ? 'Capturing...' : 'Capture Snapshot'}
            </button>
            <button
              onClick={fetchTwinData}
              className="p-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs transition"
              title="Refresh State"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {snapshotMessage && (
          <div className="mt-3 text-xs px-3 py-1.5 rounded bg-sky-500/20 text-sky-200 border border-sky-400/30 inline-block">
            {snapshotMessage}
          </div>
        )}
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="officer-card p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Domains</div>
          <div className="text-2xl font-black text-white">{kpiSummary.totalCompetencies}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Active catalog</div>
        </div>
        <div className="officer-card p-4 border-red-500/30 bg-red-950/10">
          <div className="text-[11px] font-bold uppercase tracking-wider text-red-400 mb-1">Critical Gaps</div>
          <div className="text-2xl font-black text-red-400">{kpiSummary.criticalGaps}</div>
          <div className="text-[11px] text-red-400/70 mt-0.5">Deficit ≥ 0.35</div>
        </div>
        <div className="officer-card p-4 border-amber-500/30 bg-amber-950/10">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">Moderate Gaps</div>
          <div className="text-2xl font-black text-amber-400">{kpiSummary.moderateGaps}</div>
          <div className="text-[11px] text-amber-400/70 mt-0.5">0.15 ≤ Deficit &lt; 0.35</div>
        </div>
        <div className="officer-card p-4 border-emerald-500/30 bg-emerald-950/10">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1">Competent</div>
          <div className="text-2xl font-black text-emerald-400">{kpiSummary.competentDomains}</div>
          <div className="text-[11px] text-emerald-400/70 mt-0.5">Deficit &lt; 0.15</div>
        </div>
        <div className="officer-card p-4 border-sky-500/30 bg-sky-950/10 col-span-2 md:col-span-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400 mb-1">Avg Confidence</div>
          <div className="text-2xl font-black text-sky-300">{(kpiSummary.averageConfidence * 100).toFixed(0)}%</div>
          <div className="text-[11px] text-sky-400/70 mt-0.5">3-factor calibrated</div>
        </div>
      </div>

      {/* ── Diagnostic Distinction Callout ── */}
      <div className="officer-card p-4 bg-slate-900/60 border-slate-700/60 flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-slate-200">
            Methodological Architecture: Low Competency vs. Insufficient Evidence
          </p>
          <p className="text-slate-400 leading-relaxed">
            STAT-GAP AI strictly separates <span className="text-red-300 font-semibold">Low Competency</span> (established deficiency verified with high evidence confidence) from <span className="text-amber-300 font-semibold">Insufficient Evidence</span> (sparse or divergent observations requiring further assessment). The platform never fabricates certainty when observational evidence is incomplete.
          </p>
        </div>
      </div>

      {/* ── Competency State Matrix ── */}
      <div className="officer-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-400" />
              Evaluated Competency State Vector
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic 4-factor scoring: Assessment (35%), Quiz (20%), Practical (30%), Experience (15%)
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {competencyStates.map((state: any) => {
            const isExpanded = expandedComp === state.competencyId;
            const bandColor =
              state.gapBand === 'red'
                ? 'border-red-500/40 bg-red-950/20 text-red-300'
                : state.gapBand === 'orange'
                ? 'border-amber-500/40 bg-amber-950/20 text-amber-300'
                : 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300';

            return (
              <div
                key={state.competencyId}
                className={`rounded-xl border transition p-4 ${
                  isExpanded ? 'bg-slate-800/40 border-slate-600' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className="flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer"
                  onClick={() => setExpandedComp(isExpanded ? null : state.competencyId)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 ${bandColor}`}
                    >
                      {(state.currentLevel * 100).toFixed(0)}%
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-white hover:text-sky-300 transition">
                          {state.competencyName}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {state.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {state.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs shrink-0">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">Required vs Current</div>
                      <div className="font-bold text-slate-200">
                        {(state.requiredLevel * 100).toFixed(0)}% <span className="text-slate-500">vs</span> {(state.currentLevel * 100).toFixed(0)}%
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">Deficit Gap</div>
                      <div
                        className={`font-black ${
                          state.gapBand === 'red'
                            ? 'text-red-400'
                            : state.gapBand === 'orange'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {(state.gap * 100).toFixed(1)} pts
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">Evidence Confidence</div>
                      <div className="font-semibold text-sky-300 flex items-center gap-1 justify-end">
                        {(state.confidence * 100).toFixed(0)}%
                        {state.isInsufficientEvidence && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" title="Insufficient observations" />
                        )}
                      </div>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* ── Expanded Detail View ── */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 animate-fadeIn">
                    {/* Diagnostic Callout for this competency */}
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400">Diagnostic Assessment: </span>
                        <span className="font-semibold text-slate-200">{state.confidenceReason}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {state.evidenceCount} observation(s) • Sources: {state.evidenceSources.join(', ')}
                      </span>
                    </div>

                    {/* 4-Factor Breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded bg-slate-800/40 border border-slate-700/50">
                        <div className="text-[10px] text-slate-400">Adaptive Assessment (35%)</div>
                        <div className="font-bold text-slate-200 mt-0.5">
                          {(state.factors.assessment * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded bg-slate-800/40 border border-slate-700/50">
                        <div className="text-[10px] text-slate-400">Diagnostic Quiz (20%)</div>
                        <div className="font-bold text-slate-200 mt-0.5">
                          {(state.factors.quiz * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded bg-slate-800/40 border border-slate-700/50">
                        <div className="text-[10px] text-slate-400">Practical / Dataset Audit (30%)</div>
                        <div className="font-bold text-slate-200 mt-0.5">
                          {(state.factors.practical * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded bg-slate-800/40 border border-slate-700/50">
                        <div className="text-[10px] text-slate-400">Civil Service Exp (15%)</div>
                        <div className="font-bold text-slate-200 mt-0.5">
                          {(state.factors.experience * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Prerequisites & Sub-skills */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                      {state.prerequisites && state.prerequisites.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                            <GitFork className="w-3.5 h-3.5 text-sky-400" />
                            Prerequisites in Knowledge Graph
                          </div>
                          <ul className="space-y-1 text-slate-300">
                            {state.prerequisites.map((p: any) => (
                              <li key={p.id} className="p-1.5 rounded bg-slate-800/30 border border-slate-700/40 flex items-center justify-between">
                                <span>{p.name}</span>
                                <span className="text-[10px] text-slate-400 uppercase">{p.relationship_type}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {state.subSkills && state.subSkills.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                            <FileCheck className="w-3.5 h-3.5 text-sky-400" />
                            Sub-skills in 4-Level Ontology
                          </div>
                          <ul className="space-y-1 text-slate-300">
                            {state.subSkills.map((s: any) => (
                              <li key={s.id} className="p-1.5 rounded bg-slate-800/30 border border-slate-700/40 flex items-center justify-between">
                                <span>{s.name}</span>
                                <span className="text-[10px] text-sky-300 font-semibold">Req: {(s.requiredProficiency * 100).toFixed(0)}%</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── What-If Simulation Sandbox (Data Contract Foundation) ── */}
      <div className="officer-card p-5 border-violet-500/30 bg-gradient-to-br from-[#0c1626] to-[#121b2d]">
        <div className="flex items-center gap-2 mb-1">
          <Play className="w-5 h-5 text-violet-400" />
          <h2 className="text-base font-bold text-white">What-If Intervention Simulation Sandbox</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Foundation interface modeling hypothetical post-intervention proficiency without mutating authoritative database records.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Target Competency</label>
            <select
              value={simCompId}
              onChange={(e) => setSimCompId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-400"
            >
              {competencyStates.map((c: any) => (
                <option key={c.competencyId} value={c.competencyId}>
                  {c.competencyName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Intervention Modality</label>
            <select
              value={simIntervention}
              onChange={(e) => setSimIntervention(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-400"
            >
              <option value="NSSTA_TARGETED_WORKSHOP">NSSTA 3-Day Residential Workshop</option>
              <option value="PRACTICAL_DATASET_LAB">Field Operations Practical Dataset Lab</option>
              <option value="IGOT_ADAPTIVE_REFRESHER">iGOT Karmayogi Micro-Course & Re-Assessment</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Hypothetical Post-Assessment Score: {(simScore * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={simScore}
              onChange={(e) => setSimScore(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-400 mt-2"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={handleRunSimulation}
            disabled={simulating}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg transition"
          >
            <Play className="w-3.5 h-3.5" />
            {simulating ? 'Calculating Model...' : 'Simulate Hypothetical Impact'}
          </button>

          <span className="text-[11px] text-slate-500 italic">
            Non-destructive model calculation
          </span>
        </div>

        {/* Simulation Output */}
        {simResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-violet-500/40 animate-fadeIn space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-violet-300">
                Simulated Outcome for {simResult.targetCompetencyName}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-violet-950 text-violet-300 border border-violet-700">
                Simulation Projection
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">Baseline Level</div>
                <div className="font-bold text-slate-200">{(simResult.baseline.currentLevel * 100).toFixed(1)}%</div>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">Projected Level</div>
                <div className="font-bold text-emerald-300">{(simResult.simulated.currentLevel * 100).toFixed(1)}%</div>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">Projected Gap Reduction</div>
                <div className="font-bold text-sky-300">-{(simResult.simulated.projectedImprovement * 100).toFixed(1)} pts</div>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400">Projected Band</div>
                <div className="font-bold uppercase text-emerald-400">{simResult.simulated.gapBand}</div>
              </div>
            </div>

            {/* Scientific Disclaimer */}
            <p className="text-[11px] text-slate-400 italic bg-slate-900/60 p-2.5 rounded border border-slate-800">
              ⚠️ {simResult.disclaimer}
            </p>
          </div>
        )}
      </div>

      {/* ── Snapshot Ledger Timeline ── */}
      {snapshots.length > 0 && (
        <div className="officer-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">Digital Twin Time-Travel Snapshots</h2>
          </div>

          <div className="space-y-2">
            {snapshots.map((s: any) => (
              <div
                key={s.snapshotId}
                className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono text-sky-300 font-bold">{s.snapshotId.substring(0, 8)}...</span>
                  <span className="text-slate-400 ml-2">Trigger: {s.triggerEvent}</span>
                </div>
                <span className="text-slate-500">
                  {new Date(s.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
