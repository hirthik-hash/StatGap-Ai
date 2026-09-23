import React, { useState } from 'react';
import { User, Competency } from '../../types';
import { NavPageId } from '../common/Sidebar';
import { IgotApiService } from '../../services/igotService';
import {
  Link2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  GraduationCap,
  Layers,
} from 'lucide-react';

interface IgotIntegrationPageProps {
  user: User;
  competencies: Competency[];
  onNavigate: (page: NavPageId) => void;
}

export const IgotIntegrationPage: React.FC<IgotIntegrationPageProps> = ({
  user,
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
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-[#FFFDFC] rounded-2xl border border-[#DED2C5] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#547A5A] bg-[#EFF6EF] border border-[#A8C9AC] px-2.5 py-0.5 rounded-md">
              GovTech Interoperability
            </span>
            <span className="text-xs text-[#6E625A] font-mono">Mission Karmayogi Bharat API</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2F2520] tracking-tight">
            iGOT Karmayogi Integration
          </h1>
          <p className="text-sm text-[#6E625A] mt-1">
            Seamless synchronization between India's civil service LMS and STAT-GAP AI's competency layer.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6B4A35] hover:bg-[#523625] active:scale-98 text-[#FBF8F2] text-xs font-bold shadow-xs transition-all cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Synchronizing LMS Course Records...' : 'Sync with iGOT Karmayogi'}</span>
        </button>
      </div>

      {/* ── Integration Staging Badge ──────────────────── */}
      <div className="p-3.5 rounded-xl bg-[#FDF6EC] border border-[#D4A96A] flex items-center gap-3 text-xs">
        <AlertTriangle className="w-4 h-4 text-[#A97838] shrink-0" />
        <div>
          <span className="font-bold text-[#7A4F1E]">Demo Environment — Mock-iGOT Adapter Active</span>
          <span className="text-[#7A4F1E] ml-2">
            Live iGOT Karmayogi integration requires authorized OAuth credentials from MoSPI/DoPT.
            This demo uses the mock adapter which simulates the same JSON schema and data flow.
          </span>
        </div>
      </div>

      {/* ── Integration Topology Diagram ───────────────── */}
      <div className="officer-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-[#6B4A35]" />
          <h3 className="text-sm font-bold text-[#2F2520] uppercase tracking-wide">Integration Topology</h3>
          <span className="text-[10px] text-[#6E625A] ml-1">— Data flow architecture</span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-0">
          {[
            {
              label: 'iGOT Karmayogi',
              sub: 'Mission Karmayogi LMS',
              bg: 'bg-[#3A2921]',
              textColor: 'text-[#FBF8F2]',
              border: 'border-[#2A1E19]',
            },
            { arrow: true },
            {
              label: 'iGOT Adapter',
              sub: 'Mock / OAuth connector',
              bg: 'bg-[#FDF6EC]',
              textColor: 'text-[#7A4F1E]',
              border: 'border-[#D4A96A]',
              note: 'MOCK',
            },
            { arrow: true },
            {
              label: 'Normalized Evidence',
              sub: 'Course records, completion',
              bg: 'bg-[#F8F3EB]',
              textColor: 'text-[#2F2520]',
              border: 'border-[#DED2C5]',
            },
            { arrow: true },
            {
              label: 'STAT-GAP AI',
              sub: 'Competency Intelligence',
              bg: 'bg-[#6B4A35]',
              textColor: 'text-[#FBF8F2]',
              border: 'border-[#523625]',
            },
            { arrow: true },
            {
              label: 'Officer Profile',
              sub: 'Verified skills & gaps',
              bg: 'bg-[#547A5A]',
              textColor: 'text-[#FBF8F2]',
              border: 'border-[#436348]',
            },
          ].map((node, idx) => {
            if ('arrow' in node) {
              return (
                <div key={idx} className="text-[#CBB9A7] font-bold text-lg text-center sm:text-left sm:px-1">
                  <span className="hidden sm:block">›</span>
                  <span className="sm:hidden block text-center">↓</span>
                </div>
              );
            }
            return (
              <div key={idx} className={`flex-1 p-3 rounded-lg border ${node.bg} ${node.border} text-center relative`}>
                {node.note && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-black bg-[#A97838] text-[#FFFDFC] px-1.5 py-0.5 rounded shadow-xs">
                    {node.note}
                  </span>
                )}
                <div className={`text-[11px] font-black ${node.textColor}`}>{node.label}</div>
                <div className={`text-[9px] mt-0.5 ${node.textColor} opacity-80`}>{node.sub}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {[
            { label: 'Sync Mode', value: 'Mock-iGOT Adapter', color: 'text-[#A97838]' },
            { label: 'Officer iGOT ID', value: user.iGotId || 'Not configured', color: 'text-[#2F2520]' },
            { label: 'Last Sync', value: lastSyncTime, color: 'text-[#2F2520]' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#F8F3EB] border border-[#DED2C5] rounded-lg p-3">
              <div className="text-[9px] font-bold uppercase tracking-wider text-[#6E625A] mb-0.5">{stat.label}</div>
              <div className={`font-bold font-mono truncate ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#EFF6EF] border border-[#A8C9AC] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#547A5A] text-[#FFFDFC] flex items-center justify-center font-bold shrink-0">
            <Link2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-[#1F5E2A] flex items-center gap-2">
              <span>Integration Status:</span>
              <span className="bg-[#C8DEC8] text-[#0E3C14] px-2 py-0.5 rounded text-[11px] font-semibold">
                Active &amp; Connected
              </span>
            </div>
            <div className="text-[#6E625A] text-[11px] mt-0.5">
              Secure OAuth Handshake authenticated for officer ID: <strong className="font-mono text-[#2F2520]">{user.iGotId}</strong>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-[#6E625A] font-mono shrink-0">
          Last Synced: <span className="font-bold text-[#2F2520]">{lastSyncTime}</span>
        </div>
      </div>

      {/* The Central Discrepancy Spotlight Card */}
      <div className="bg-[#FFFDFC] rounded-2xl border-2 border-[#D4A96A] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#EEE4D8]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7A4F1E] bg-[#EDD8B4] px-2.5 py-0.5 rounded">
              LMS vs. Competency Duality
            </span>
          </div>
          <span className="text-xs font-mono text-[#93877D]">National Course ID: MOSPI-REG-2026</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: What iGOT Records */}
          <div className="p-5 rounded-xl bg-[#F8F3EB] border border-[#DED2C5] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6E625A] flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-[#6B4A35]" />
                iGOT Karmayogi Training Record
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#EFF6EF] text-[#2E5B34] border border-[#A8C9AC] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Completed
              </span>
            </div>

            <h3 className="text-lg font-bold text-[#2F2520]">
              Statistical Inference &amp; Regression Analysis
            </h3>

            <div className="space-y-1.5 text-xs text-[#6E625A] font-mono pt-1">
              <div>&bull; Officer: <strong className="text-[#2F2520]">{user.name}</strong></div>
              <div>&bull; Ministry: <strong className="text-[#2F2520]">MoSPI (NSSTA)</strong></div>
              <div>&bull; Video Hours Watched: <strong className="text-[#2F2520]">14.5 / 14.5 hrs</strong></div>
              <div>&bull; Certificate Issued: <strong className="text-[#2E5B34] font-bold">Yes (KARM-2026-994)</strong></div>
            </div>

            <div className="p-3 bg-[#FFFDFC] rounded-lg border border-[#DED2C5] text-xs text-[#6E625A] italic">
              "Standard LMS registers 100% completion simply because video modules and quizzes were submitted."
            </div>
          </div>

          {/* Right: What STAT-GAP AI Uncovers */}
          <div className="p-5 rounded-xl bg-[#FBF0EF] border-2 border-[#D4958F] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#7A2E2A] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[#9A4B42]" />
                STAT-GAP AI Competency Audit
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#E8C8C4] text-[#4A1510]">
                Critical Gap Uncovered
              </span>
            </div>

            <h3 className="text-lg font-bold text-[#7A2E2A]">
              Regression Interpretation: 61% (Moderate Gap)
            </h3>

            <div className="space-y-1.5 text-xs text-[#7A2E2A] font-mono pt-1">
              <div>&bull; Identified Root Cause: <strong>Regression Coefficient Misinterpretation</strong></div>
              <div>&bull; Assessment Diagnostic: <strong>4/6 incorrect on marginal elasticity items</strong></div>
              <div>&bull; Confidence Pattern: <strong>High confidence in false assumption</strong></div>
              <div>&bull; Field Survey Risk: <strong>High risk of distorted PLFS wage analyses</strong></div>
            </div>

            <div className="p-3 bg-[#FFFDFC] rounded-lg border border-[#D4958F] text-xs text-[#7A2E2A] font-semibold">
              "STAT-GAP AI proves that training completion does NOT equal verified competency."
            </div>
          </div>
        </div>

        {/* Action button to remedy */}
        <div className="pt-4 border-t border-[#EEE4D8] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#6E625A]">
            Push remediation recommendations directly to officer's iGOT Karmayogi learning feed?
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('why-gap')}
              className="px-4 py-2 bg-[#6B4A35] hover:bg-[#523625] text-[#FBF8F2] text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Examine Why-Gap Diagnosis
            </button>
            <button
              onClick={() => onNavigate('learning')}
              className="px-4 py-2 bg-[#EEE4D8] hover:bg-[#DED2C5] text-[#3A2921] text-xs font-semibold rounded-xl border border-[#CBB9A7] cursor-pointer"
            >
              Start 15-min Remediation
            </button>
          </div>
        </div>
      </div>

      {/* Sync Log History */}
      <div className="bg-[#FFFDFC] rounded-2xl border border-[#DED2C5] p-6 shadow-xs">
        <h3 className="text-base font-bold text-[#2F2520] mb-4 pb-3 border-b border-[#EEE4D8]">
          iGOT Karmayogi Webhook Activity Log
        </h3>

        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-[#F8F3EB] border border-[#DED2C5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#547A5A]"></span>
              <span className="font-bold text-[#2F2520]">COURSE_COMPLETION_EVENT</span>
              <span className="text-[#6E625A] text-[11px]">MOSPI-REG-2026 received</span>
            </div>
            <span className="text-[#93877D] text-[11px]">March 1, 2026 &bull; 14:22 IST</span>
          </div>

          <div className="p-3 rounded-lg bg-[#F8F3EB] border border-[#DED2C5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#6B4A35]"></span>
              <span className="font-bold text-[#2F2520]">DIAGNOSTIC_EVIDENCE_EXTRACTED</span>
              <span className="text-[#6E625A] text-[11px]">4 incorrect distractor patterns parsed</span>
            </div>
            <span className="text-[#93877D] text-[11px]">March 2, 2026 &bull; 09:15 IST</span>
          </div>

          <div className="p-3 rounded-lg bg-[#F8F3EB] border border-[#DED2C5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#A97838]"></span>
              <span className="font-bold text-[#2F2520]">WHY_GAP_TRIGGERED</span>
              <span className="text-[#6E625A] text-[11px]">Regression Misconception flagged</span>
            </div>
            <span className="text-[#93877D] text-[11px]">March 2, 2026 &bull; 09:16 IST</span>
          </div>
        </div>
      </div>
    </div>
  );
};
