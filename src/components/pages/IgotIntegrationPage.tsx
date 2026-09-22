import React, { useState } from 'react';
import { User, Competency } from '../../types';
import { NavPageId } from '../common/Sidebar';
import { IgotApiService } from '../../services/igotService';
import {
  Link2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
  GraduationCap,
  ExternalLink,
  Layers,
} from 'lucide-react';

interface IgotIntegrationPageProps {
  user: User;
  competencies: Competency[];
  onNavigate: (page: NavPageId) => void;
}

export const IgotIntegrationPage: React.FC<IgotIntegrationPageProps> = ({
  user,
  competencies,
  onNavigate,
}) => {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now (10:14 AM IST)');

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await IgotApiService.importRecords();
      setLastSyncTime(`Just now (Imported: ${res.imported_count}, Skipped: ${res.skipped_count})`);
    } catch {
      setLastSyncTime('Just now (Offline Simulation)');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
              GovTech Interoperability
            </span>
            <span className="text-xs text-slate-400 font-mono">Mission Karmayogi Bharat API</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            iGOT Karmayogi Integration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Seamless synchronization between India's civil service LMS and STAT-GAP AI's competency layer.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 active:scale-98 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Synchronizing LMS Course Records...' : 'Sync with iGOT Karmayogi'}</span>
        </button>
      </div>

      {/* ── Integration Staging Badge ──────────────────── */}
      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <div>
          <span className="font-bold text-amber-900">Demo Environment — Mock-iGOT Adapter Active</span>
          <span className="text-amber-700 ml-2">
            Live iGOT Karmayogi integration requires authorized OAuth credentials from MoSPI/DoPT.
            This demo uses the mock adapter which simulates the same JSON schema and data flow.
          </span>
        </div>
      </div>

      {/* ── Integration Topology Diagram ───────────────── */}
      <div className="officer-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-blue-700" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Integration Topology</h3>
          <span className="text-[10px] text-slate-400 ml-1">— Data flow architecture</span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-0">
          {[
            {
              label: 'iGOT Karmayogi',
              sub: 'Mission Karmayogi LMS',
              bg: 'bg-blue-900',
              textColor: 'text-white',
              border: 'border-blue-800',
            },
            { arrow: true },
            {
              label: 'iGOT Adapter',
              sub: 'Mock / OAuth connector',
              bg: 'bg-amber-50',
              textColor: 'text-amber-900',
              border: 'border-amber-200',
              note: 'MOCK',
            },
            { arrow: true },
            {
              label: 'Normalized Evidence',
              sub: 'Course records, completion',
              bg: 'bg-slate-50',
              textColor: 'text-slate-800',
              border: 'border-slate-200',
            },
            { arrow: true },
            {
              label: 'STAT-GAP AI',
              sub: 'Competency Intelligence',
              bg: 'bg-emerald-700',
              textColor: 'text-white',
              border: 'border-emerald-800',
            },
            { arrow: true },
            {
              label: 'Officer Profile',
              sub: 'Verified skills & gaps',
              bg: 'bg-violet-900',
              textColor: 'text-white',
              border: 'border-violet-800',
            },
          ].map((node, idx) => {
            if ('arrow' in node) {
              return (
                <div key={idx} className="text-slate-300 font-bold text-lg text-center sm:text-left sm:px-1">
                  <span className="hidden sm:block">›</span>
                  <span className="sm:hidden block text-center">↓</span>
                </div>
              );
            }
            return (
              <div key={idx} className={`flex-1 p-3 rounded-lg border ${node.bg} ${node.border} text-center relative`}>
                {node.note && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded">
                    {node.note}
                  </span>
                )}
                <div className={`text-[11px] font-black ${node.textColor}`}>{node.label}</div>
                <div className={`text-[9px] mt-0.5 ${node.textColor} opacity-70`}>{node.sub}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {[
            { label: 'Sync Mode', value: 'Mock-iGOT Adapter', color: 'text-amber-700' },
            { label: 'Officer iGOT ID', value: user.iGotId || 'Not configured', color: 'text-slate-800' },
            { label: 'Last Sync', value: lastSyncTime, color: 'text-slate-800' },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{stat.label}</div>
              <div className={`font-bold font-mono truncate ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-emerald-950 flex items-center gap-2">
              <span>Integration Status:</span>
              <span className="bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded text-[11px]">
                Active & Connected
              </span>
            </div>
            <div className="text-slate-600 text-[11px] mt-0.5">
              Secure OAuth Handshake authenticated for officer ID: <strong className="font-mono text-slate-900">{user.iGotId}</strong>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono shrink-0">
          Last Synced: <span className="font-bold text-slate-800">{lastSyncTime}</span>
        </div>
      </div>

      {/* The Central Discrepancy Spotlight Card (Section 22) */}
      <div className="bg-white rounded-2xl border-2 border-amber-300 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded">
              LMS vs. Competency Duality
            </span>
          </div>
          <span className="text-xs font-mono text-slate-400">National Course ID: MOSPI-REG-2026</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: What iGOT Records */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-900" />
                iGOT Karmayogi Training Record
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Completed
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              Statistical Inference & Regression Analysis
            </h3>

            <div className="space-y-1.5 text-xs text-slate-600 font-mono pt-1">
              <div>&bull; Officer: <strong className="text-slate-900">{user.name}</strong></div>
              <div>&bull; Ministry: <strong className="text-slate-900">MoSPI (NSSTA)</strong></div>
              <div>&bull; Video Hours Watched: <strong className="text-slate-900">14.5 / 14.5 hrs</strong></div>
              <div>&bull; Certificate Issued: <strong className="text-emerald-700 font-bold">Yes (KARM-2026-994)</strong></div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-500 italic">
              "Standard LMS registers 100% completion simply because video modules and quizzes were submitted."
            </div>
          </div>

          {/* Right: What STAT-GAP AI Uncovers */}
          <div className="p-5 rounded-xl bg-rose-50/70 border-2 border-rose-300 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                STAT-GAP AI Competency Audit
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                Critical Gap Uncovered
              </span>
            </div>

            <h3 className="text-lg font-bold text-rose-950">
              Regression Interpretation: 61% (Moderate Gap)
            </h3>

            <div className="space-y-1.5 text-xs text-rose-900 font-mono pt-1">
              <div>&bull; Identified Root Cause: <strong>Regression Coefficient Misinterpretation</strong></div>
              <div>&bull; Assessment Diagnostic: <strong>4/6 incorrect on marginal elasticity items</strong></div>
              <div>&bull; Confidence Pattern: <strong>High confidence in false assumption</strong></div>
              <div>&bull; Field Survey Risk: <strong>High risk of distorted PLFS wage analyses</strong></div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-rose-200 text-xs text-rose-800 font-semibold">
              "STAT-GAP AI proves that training completion does NOT equal verified competency."
            </div>
          </div>
        </div>

        {/* Action button to remedy */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            Push remediation recommendations directly to officer's iGOT Karmayogi learning feed?
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('why-gap')}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Examine Why-Gap Diagnosis
            </button>
            <button
              onClick={() => onNavigate('learning')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-300 cursor-pointer"
            >
              Start 15-min Remediation
            </button>
          </div>
        </div>
      </div>

      {/* Sync Log History */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
          iGOT Karmayogi Webhook Activity Log
        </h3>

        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-bold text-slate-800">COURSE_COMPLETION_EVENT</span>
              <span className="text-slate-500 text-[11px]">MOSPI-REG-2026 received</span>
            </div>
            <span className="text-slate-400 text-[11px]">March 1, 2026 &bull; 14:22 IST</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="font-bold text-slate-800">DIAGNOSTIC_EVIDENCE_EXTRACTED</span>
              <span className="text-slate-500 text-[11px]">4 incorrect distractor patterns parsed</span>
            </div>
            <span className="text-slate-400 text-[11px]">March 2, 2026 &bull; 09:15 IST</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="font-bold text-slate-800">WHY_GAP_TRIGGERED</span>
              <span className="text-slate-500 text-[11px]">Regression Misconception flagged</span>
            </div>
            <span className="text-slate-400 text-[11px]">March 2, 2026 &bull; 09:16 IST</span>
          </div>
        </div>
      </div>
    </div>
  );
};
