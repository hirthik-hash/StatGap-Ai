import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

const API_ROOT = apiClient.getBaseUrl();
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
        fetch(`${API_ROOT}/api/officer/digital-twin`, { headers }),
        fetch(`${API_ROOT}/api/officer/digital-twin/snapshots`, { headers }),
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

      const res = await fetch(`${API_ROOT}/api/officer/digital-twin/snapshot?trigger_event=OFFICER_MANUAL_CAPTURE`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) throw new Error('Failed to capture snapshot');
      const data = await res.json();
      setSnapshotMessage(`Snapshot ${data.snapshotId.substring(0, 8)}... created!`);
      // Refresh snapshots list
      const snapRes = await fetch(`${API_ROOT}/api/officer/digital-twin/snapshots`, { headers });
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

      const res = await fetch(`${API_ROOT}/api/officer/digital-twin/simulate`, {
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
      <div className="flex flex-col items-center justify-center p-12 text-[#93877D]">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-[#6B4A35]" />
        <p className="text-sm">Synthesizing Competency Digital Twin computational state...</p>
      </div>
    );
  }

  if (error || !twinData) {
    return (
      <div className="officer-card p-6 border-[#D4958F] bg-[#FBF0EF] text-[#7A2E2A]">
        <div className="flex items-center gap-3">
          <AlertOctagon className="w-6 h-6 text-[#9A4B42]" />
          <h3 className="font-bold text-lg text-[#2F2520]">Unable to load Competency Digital Twin</h3>
        </div>
        <p className="text-sm text-[#7A2E2A] mt-2">{error}</p>
        <button
          onClick={fetchTwinData}
          className="mt-4 px-4 py-2 bg-[#9A4B42] hover:bg-[#7A2E2A] text-[#FBF8F2] rounded-lg text-sm font-semibold transition"
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
      <div className="officer-card p-6 border-[#4D3628] bg-gradient-to-br from-[#2A1E19] to-[#3A2921] text-[#FBF8F2] shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#4D3628] border border-[#6B4A35] flex items-center justify-center text-[#D4A96A] shadow-inner">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge bg-[#547A5A]/30 text-[#A8C9AC] border border-[#547A5A]/50 uppercase text-[10px] tracking-wider">
                  Phase 3 Computational State
                </span>
                <span className="text-xs text-[#B8A28F]">
                  Cadre: <span className="text-[#EEE4D8] font-semibold">{identityContext.cadre}</span>
                </span>
              </div>
              <h1 className="text-2xl font-black text-[#FBF8F2] tracking-tight flex items-center gap-3">
                {identityContext.name} — Competency Digital Twin
              </h1>
              <p className="text-xs text-[#B8A28F] mt-0.5">
                Assignment: <span className="text-[#FBF8F2] font-medium">{identityContext.currentAssignment}</span> • Dept: <span className="text-[#FBF8F2] font-medium">{identityContext.department}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCaptureSnapshot}
              disabled={snapshotLoading}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#6B4A35] hover:bg-[#523625] border border-[#8A6A52] text-[#FBF8F2] text-xs font-semibold rounded-lg shadow-xs transition"
            >
              <Camera className="w-4 h-4" />
              {snapshotLoading ? 'Capturing...' : 'Capture Snapshot'}
            </button>
            <button
              onClick={fetchTwinData}
              className="p-2 bg-[#4D3628] hover:bg-[#6B4A35] border border-[#6B4A35] text-[#EEE4D8] rounded-lg text-xs transition"
              title="Refresh State"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {snapshotMessage && (
          <div className="mt-3 text-xs px-3 py-1.5 rounded bg-[#4D3628] text-[#D4A96A] border border-[#6B4A35] inline-block font-semibold">
            {snapshotMessage}
          </div>
        )}
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="officer-card p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#93877D] mb-1">Total Domains</div>
          <div className="text-2xl font-black text-[#2F2520]">{kpiSummary.totalCompetencies}</div>
          <div className="text-[11px] text-[#6E625A] mt-0.5">Active catalog</div>
        </div>
        <div className="officer-card p-4 border-[#D4958F] bg-[#FBF0EF]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#9A4B42] mb-1">Critical Gaps</div>
          <div className="text-2xl font-black text-[#7A2E2A]">{kpiSummary.criticalGaps}</div>
          <div className="text-[11px] text-[#7A2E2A]/70 mt-0.5">Deficit ≥ 0.35</div>
        </div>
        <div className="officer-card p-4 border-[#D4A96A] bg-[#FDF6EC]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#A97838] mb-1">Moderate Gaps</div>
          <div className="text-2xl font-black text-[#7A4F1E]">{kpiSummary.moderateGaps}</div>
          <div className="text-[11px] text-[#7A4F1E]/70 mt-0.5">0.15 ≤ Deficit &lt; 0.35</div>
        </div>
        <div className="officer-card p-4 border-[#A8C9AC] bg-[#EFF6EF]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#547A5A] mb-1">Competent</div>
          <div className="text-2xl font-black text-[#2E5B34]">{kpiSummary.competentDomains}</div>
          <div className="text-[11px] text-[#2E5B34]/70 mt-0.5">Deficit &lt; 0.15</div>
        </div>
        <div className="officer-card p-4 border-[#DED2C5] bg-[#F8F3EB] col-span-2 md:col-span-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6E625A] mb-1">Avg Confidence</div>
          <div className="text-2xl font-black text-[#3A2921]">{(kpiSummary.averageConfidence * 100).toFixed(0)}%</div>
          <div className="text-[11px] text-[#8A6A52] mt-0.5">3-factor calibrated</div>
        </div>
      </div>

      {/* ── Diagnostic Distinction Callout ── */}
      <div className="officer-card p-4 bg-[#F8F3EB] border-[#DED2C5] flex items-start gap-3">
        <Info className="w-5 h-5 text-[#6B4A35] shrink-0 mt-0.5" />
        <div className="text-xs text-[#2F2520] space-y-1">
          <p className="font-bold text-[#3A2921]">
            Methodological Architecture: Low Competency vs. Insufficient Evidence
          </p>
          <p className="text-[#6E625A] leading-relaxed">
            STAT-GAP AI strictly separates <span className="text-[#9A4B42] font-semibold">Low Competency</span> (established deficiency verified with high evidence confidence) from <span className="text-[#A97838] font-semibold">Insufficient Evidence</span> (sparse or divergent observations requiring further assessment). The platform never fabricates certainty when observational evidence is incomplete.
          </p>
        </div>
      </div>

      {/* ── Competency State Matrix ── */}
      <div className="officer-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-[#2F2520] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#6B4A35]" />
              Evaluated Competency State Vector
            </h2>
            <p className="text-xs text-[#6E625A] mt-0.5">
              Deterministic 4-factor scoring: Assessment (35%), Quiz (20%), Practical (30%), Experience (15%)
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {competencyStates.map((state: any) => {
            const isExpanded = expandedComp === state.competencyId;
            const bandColor =
              state.gapBand === 'red'
                ? 'border-[#D4958F] bg-[#FBF0EF] text-[#7A2E2A]'
                : state.gapBand === 'orange'
                ? 'border-[#D4A96A] bg-[#FDF6EC] text-[#7A4F1E]'
                : 'border-[#A8C9AC] bg-[#EFF6EF] text-[#2E5B34]';

            return (
              <div
                key={state.competencyId}
                className={`rounded-xl border transition p-4 ${
                  isExpanded ? 'bg-[#EEE4D8] border-[#6B4A35] shadow-xs' : 'bg-[#F8F3EB] border-[#DED2C5] hover:border-[#CBB9A7]'
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
                        <h3 className="font-bold text-sm text-[#2F2520] hover:text-[#6B4A35] transition">
                          {state.competencyName}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#EEE4D8] text-[#3A2921] border border-[#DED2C5] font-semibold">
                          {state.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#6E625A] line-clamp-1 mt-0.5">
                        {state.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs shrink-0">
                    <div className="text-right">
                      <div className="text-[11px] text-[#93877D]">Required vs Current</div>
                      <div className="font-bold text-[#2F2520]">
                        {(state.requiredLevel * 100).toFixed(0)}% <span className="text-[#93877D]">vs</span> {(state.currentLevel * 100).toFixed(0)}%
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] text-[#93877D]">Deficit Gap</div>
                      <div
                        className={`font-black ${
                          state.gapBand === 'red'
                            ? 'text-[#9A4B42]'
                            : state.gapBand === 'orange'
                            ? 'text-[#A97838]'
                            : 'text-[#547A5A]'
                        }`}
                      >
                        {(state.gap * 100).toFixed(1)} pts
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] text-[#93877D]">Evidence Confidence</div>
                      <div className="font-semibold text-[#3A2921] flex items-center gap-1 justify-end">
                        {(state.confidence * 100).toFixed(0)}%
                        {state.isInsufficientEvidence && (
                          <AlertTriangle className="w-3.5 h-3.5 text-[#A97838]" title="Insufficient observations" />
                        )}
                      </div>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#6B4A35]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#93877D]" />
                    )}
                  </div>
                </div>

                {/* ── Expanded Detail View ── */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[#DED2C5] space-y-3 animate-fadeIn">
                    {/* Diagnostic Callout for this competency */}
                    <div className="p-3 rounded-lg bg-[#FFFDFC] border border-[#DED2C5] flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[#6E625A]">Diagnostic Assessment: </span>
                        <span className="font-semibold text-[#2F2520]">{state.confidenceReason}</span>
                      </div>
                      <span className="text-[11px] text-[#93877D]">
                        {state.evidenceCount} observation(s) • Sources: {state.evidenceSources.join(', ')}
                      </span>
                    </div>

                    {/* 4-Factor Breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded bg-[#FFFDFC] border border-[#DED2C5]">
                        <div className="text-[10px] text-[#93877D]">Adaptive Assessment (35%)</div>
                        <div className="font-bold text-[#2F2520] mt-0.5">
                          {(state.factors.assessment * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded bg-[#FFFDFC] border border-[#DED2C5]">
                        <div className="text-[10px] text-[#93877D]">Diagnostic Quiz (20%)</div>
                        <div className="font-bold text-[#2F2520] mt-0.5">
                          {(state.factors.quiz * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded bg-[#FFFDFC] border border-[#DED2C5]">
                        <div className="text-[10px] text-[#93877D]">Practical / Dataset Audit (30%)</div>
                        <div className="font-bold text-[#2F2520] mt-0.5">
                          {(state.factors.practical * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded bg-[#FFFDFC] border border-[#DED2C5]">
                        <div className="text-[10px] text-[#93877D]">Civil Service Exp (15%)</div>
                        <div className="font-bold text-[#2F2520] mt-0.5">
                          {(state.factors.experience * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Prerequisites & Sub-skills */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                      {state.prerequisites && state.prerequisites.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6E625A] mb-1.5 flex items-center gap-1.5">
                            <GitFork className="w-3.5 h-3.5 text-[#6B4A35]" />
                            Prerequisites in Knowledge Graph
                          </div>
                          <ul className="space-y-1 text-[#2F2520]">
                            {state.prerequisites.map((p: any) => (
                              <li key={p.id} className="p-1.5 rounded bg-[#FFFDFC] border border-[#DED2C5] flex items-center justify-between">
                                <span>{p.name}</span>
                                <span className="text-[10px] text-[#93877D] uppercase font-semibold">{p.relationship_type}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {state.subSkills && state.subSkills.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6E625A] mb-1.5 flex items-center gap-1.5">
                            <FileCheck className="w-3.5 h-3.5 text-[#6B4A35]" />
                            Sub-skills in 4-Level Ontology
                          </div>
                          <ul className="space-y-1 text-[#2F2520]">
                            {state.subSkills.map((s: any) => (
                              <li key={s.id} className="p-1.5 rounded bg-[#FFFDFC] border border-[#DED2C5] flex items-center justify-between">
                                <span>{s.name}</span>
                                <span className="text-[10px] text-[#547A5A] font-bold">Req: {(s.requiredProficiency * 100).toFixed(0)}%</span>
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

      {/* ── What-If Simulation Sandbox ── */}
      <div className="officer-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Play className="w-5 h-5 text-[#6B4A35]" />
          <h2 className="text-base font-bold text-[#2F2520]">What-If Intervention Simulation Sandbox</h2>
        </div>
        <p className="text-xs text-[#6E625A] mb-4">
          Foundation interface modeling hypothetical post-intervention proficiency without mutating authoritative database records.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-[#6E625A] block mb-1">Target Competency</label>
            <select
              value={simCompId}
              onChange={(e) => setSimCompId(e.target.value)}
              className="w-full bg-[#FBF8F2] border border-[#CBB9A7] rounded-lg px-3 py-2 text-xs text-[#2F2520] focus:outline-none focus:ring-2 focus:ring-[#6B4A35] transition-all"
            >
              {competencyStates.map((c: any) => (
                <option key={c.competencyId} value={c.competencyId}>
                  {c.competencyName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#6E625A] block mb-1">Intervention Modality</label>
            <select
              value={simIntervention}
              onChange={(e) => setSimIntervention(e.target.value)}
              className="w-full bg-[#FBF8F2] border border-[#CBB9A7] rounded-lg px-3 py-2 text-xs text-[#2F2520] focus:outline-none focus:ring-2 focus:ring-[#6B4A35] transition-all"
            >
              <option value="NSSTA_TARGETED_WORKSHOP">NSSTA 3-Day Residential Workshop</option>
              <option value="PRACTICAL_DATASET_LAB">Field Operations Practical Dataset Lab</option>
              <option value="IGOT_ADAPTIVE_REFRESHER">iGOT Karmayogi Micro-Course & Re-Assessment</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#6E625A] block mb-1">
              Hypothetical Post-Assessment Score: {(simScore * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={simScore}
              onChange={(e) => setSimScore(parseFloat(e.target.value))}
              className="w-full h-2 bg-[#EEE4D8] rounded-lg appearance-none cursor-pointer accent-[#6B4A35] mt-2"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={handleRunSimulation}
            disabled={simulating}
            className="flex items-center gap-2 px-4 py-2 bg-[#6B4A35] hover:bg-[#523625] text-[#FBF8F2] text-xs font-bold rounded-lg shadow-xs transition"
          >
            <Play className="w-3.5 h-3.5" />
            {simulating ? 'Calculating Model...' : 'Simulate Hypothetical Impact'}
          </button>

          <span className="text-[11px] text-[#93877D] italic">
            Non-destructive model calculation
          </span>
        </div>

        {/* Simulation Output */}
        {simResult && (
          <div className="mt-4 p-4 rounded-xl bg-[#EFF6EF] border border-[#A8C9AC] animate-fadeIn space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#2E5B34]">
                Simulated Outcome for {simResult.targetCompetencyName}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#E5EEE6] text-[#2E5B34] border border-[#A8C9AC] font-bold">
                Simulation Projection
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded bg-[#FFFDFC] border border-[#DED2C5]">
                <div className="text-[10px] text-[#93877D]">Baseline Level</div>
                <div className="font-bold text-[#2F2520]">{(simResult.baseline.currentLevel * 100).toFixed(1)}%</div>
              </div>
              <div className="p-2.5 rounded bg-[#FFFDFC] border border-[#DED2C5]">
                <div className="text-[10px] text-[#93877D]">Projected Level</div>
                <div className="font-bold text-[#547A5A]">{(simResult.simulated.currentLevel * 100).toFixed(1)}%</div>
              </div>
              <div className="p-2.5 rounded bg-[#FFFDFC] border border-[#DED2C5]">
                <div className="text-[10px] text-[#93877D]">Projected Gap Reduction</div>
                <div className="font-bold text-[#6B4A35]">-{(simResult.simulated.projectedImprovement * 100).toFixed(1)} pts</div>
              </div>
              <div className="p-2.5 rounded bg-[#FFFDFC] border border-[#DED2C5]">
                <div className="text-[10px] text-[#93877D]">Projected Band</div>
                <div className="font-bold uppercase text-[#547A5A]">{simResult.simulated.gapBand}</div>
              </div>
            </div>

            {/* Scientific Disclaimer */}
            <p className="text-[11px] text-[#7A4F1E] italic bg-[#FDF6EC] p-2.5 rounded border border-[#D4A96A]">
              ⚠️ {simResult.disclaimer}
            </p>
          </div>
        )}
      </div>

      {/* ── Snapshot Ledger Timeline ── */}
      {snapshots.length > 0 && (
        <div className="officer-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-5 h-5 text-[#6B4A35]" />
            <h2 className="text-base font-bold text-[#2F2520]">Digital Twin Time-Travel Snapshots</h2>
          </div>

          <div className="space-y-2">
            {snapshots.map((s: any) => (
              <div
                key={s.snapshotId}
                className="p-3 rounded-lg bg-[#F8F3EB] border border-[#DED2C5] flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono text-[#6B4A35] font-bold">{s.snapshotId.substring(0, 8)}...</span>
                  <span className="text-[#6E625A] ml-2">Trigger: {s.triggerEvent}</span>
                </div>
                <span className="text-[#93877D]">
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
