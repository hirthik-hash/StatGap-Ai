import React, { useState } from 'react';
import { Competency } from '../../types';
import { NavPageId } from '../common/Sidebar';
import { DecayLineChart } from '../charts/DecayLineChart';
import { CompetencyService } from '../../services/competencyService';
import { VerificationApiService } from '../../services/verificationService';
import { decayToRiskCategory } from '../../utils/gapxResolver';
import {
  Clock,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Sparkles,
  TrendingDown,
  ShieldAlert,
  CheckCircle2,
  BellRing,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

interface KnowledgeDecayPageProps {
  userId: string;
  competencies: Competency[];
  onRefreshCompetencies: () => void;
  onNavigate: (page: NavPageId) => void;
}

export const KnowledgeDecayPage: React.FC<KnowledgeDecayPageProps> = ({
  userId,
  competencies,
  onRefreshCompetencies,
  onNavigate,
}) => {
  const [selectedCompetencyId, setSelectedCompetencyId] = useState<string>('comp_regression');
  const [reminderScheduled, setReminderScheduled] = useState<boolean>(false);
  const [refreshedToast, setRefreshedToast] = useState<string | null>(null);

  const selectedComp =
    competencies.find((c) => c.id === selectedCompetencyId) || competencies[2];
  const decay = selectedComp.decay;
  const riskInfo = decayToRiskCategory(
    decay.status,
    decay.currentEstimatedRetention ?? decay.current
  );

  const handleRefreshKnowledge = async () => {
    try {
      await VerificationApiService.evaluateRetention({
        competency_id: selectedComp.id,
        days_elapsed: 0,
      });
    } catch {
      // Offline / fallback handling
    }
    CompetencyService.refreshKnowledge(userId, selectedCompetencyId);
    setRefreshedToast(
      `Knowledge refreshed for ${selectedComp.name}! Retention restored to 95%, days reset to 0, and decay status updated to Retained.`
    );
    onRefreshCompetencies();
  };

  const handleScheduleReminder = () => {
    setReminderScheduled(true);
    setTimeout(() => setReminderScheduled(false), 4000);
  };

  return (
    <div className="space-y-5 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="officer-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge badge-decaying uppercase">Ebbinghaus Forgetting Model</span>
            <span className="text-[11px] text-slate-400">Continuous Decay-Watch Engine</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Knowledge Decay Monitoring
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Mathematical modeling of skill degradation over time — ensures officers stay field-ready before PLFS surveys.
          </p>
        </div>

        {/* Quick Switcher */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Select Skill:</span>
          <select
            value={selectedCompetencyId}
            onChange={(e) => setSelectedCompetencyId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {competencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.decay.currentEstimatedRetention}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notifications */}
      {refreshedToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2 text-xs font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{refreshedToast}</span>
          </div>
          <button
            onClick={() => setRefreshedToast(null)}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {reminderScheduled && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-300 text-blue-950 flex items-center gap-2.5 text-xs animate-fadeIn">
          <BellRing className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            Calendar reminder scheduled: MoSPI micro-refresher notification will trigger in 5 days via iGOT portal!
          </span>
        </div>
      )}

      {/* Section 20: Spotlight Focus Card on Selected Competency */}
      <div className={`officer-card p-5 sm:p-6 border-2 ${riskInfo.border.replace('border', 'border')}`} style={{ borderColor: riskInfo.border.includes('rose') ? '#fecdd3' : riskInfo.border.includes('amber') ? '#fde68a' : riskInfo.border.includes('orange') ? '#fdba74' : '#6ee7b7' }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{selectedComp.category}</span>
              {/* Risk Category Badge — from centralized resolver */}
              <span className={`badge ${riskInfo.color} ${riskInfo.bg} border ${riskInfo.border} font-bold`}>
                {riskInfo.label}
              </span>
            </div>

            <h2 className="text-2xl font-black text-slate-900">{selectedComp.name}</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Evaluated on {decay.lastEvaluatedDate} at {decay.initialScore}%. Without continuous practice, retention has degraded to {decay.currentEstimatedRetention}%.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <button
              onClick={handleRefreshKnowledge}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-amber-300" />
              <span>Refresh Knowledge (5m Quiz)</span>
            </button>

            <button
              onClick={handleScheduleReminder}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-300 transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-slate-600" />
              <span>Schedule Reminder</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Pills (Section 20) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Score on {decay.lastEvaluatedDate}
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {decay.initialScore}%
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Verified peak level</div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200">
            <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">
              Current Estimated Score
            </span>
            <div className="text-2xl font-black text-rose-700 font-mono mt-1">
              {decay.currentEstimatedRetention}%
            </div>
            <div className="text-[11px] text-rose-600 mt-0.5">
              4 percentage points below 75% threshold
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Days Since Last Practice
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {decay.daysSinceLastPractice} days
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">No refresher submitted</div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
              Next Refresh Required
            </span>
            <div className="text-2xl font-black text-amber-800 font-mono mt-1">
              {decay.nextRefreshDays} days
            </div>
            <div className="text-[11px] text-amber-700 mt-0.5">Recommended interval</div>
          </div>
        </div>
      </div>

      {/* Section 21: Ebbinghaus Forgetting Curve Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Retention Trajectory & Prediction Curve
            </h3>
            <p className="text-xs text-slate-500">
              Calculated via Ebbinghaus retention law:{' '}
              <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-blue-900">
                R(t) = e^(-t / S)
              </code>
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-rose-600 font-bold">
              <span className="w-2.5 h-0.5 bg-rose-600 inline-block"></span>
              75% MoSPI Threshold
            </span>
            <span className="flex items-center gap-1.5 text-blue-900 font-bold">
              <span className="w-2.5 h-0.5 bg-blue-900 inline-block"></span>
              Officer Retention Curve
            </span>
          </div>
        </div>

        {/* Decay Line Chart */}
        <DecayLineChart
          dataPoints={decay.curvePoints}
          currentDay={decay.daysSinceLastPractice}
          currentRetention={decay.currentEstimatedRetention}
        />

        {/* Alert Callout when < 75% (Section 21) */}
        {decay.currentEstimatedRetention < 75 && (
          <div className="mt-6 p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-rose-900 block">
                  CRITICAL DECAY ALERT: Retention Dropped Below 75% MoSPI Standard
                </span>
                <span>
                  Estimated retention ({decay.currentEstimatedRetention}%) is in danger zone. Take a 5-minute refresher quiz now to avoid field survey bias.
                </span>
              </div>
            </div>

            <button
              onClick={handleRefreshKnowledge}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              Take 5-min Refresher Now
            </button>
          </div>
        )}
      </div>

      {/* Cross-System Decay Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
          Decay Status Across Statistical Systems
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {competencies.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedCompetencyId(c.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                c.id === selectedCompetencyId
                  ? 'bg-blue-50/50 border-blue-600 shadow-xs ring-1 ring-blue-600/30'
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                  {c.category}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    c.decay.status === 'Retained'
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-rose-50 text-rose-800'
                  }`}
                >
                  {c.decay.status}
                </span>
              </div>

              <h4 className="text-xs font-bold text-slate-900">{c.name}</h4>

              <div className="flex items-baseline justify-between mt-3 text-xs">
                <span className="text-slate-500">Estimated Retention:</span>
                <span className="font-mono font-bold text-slate-900">
                  {c.decay.currentEstimatedRetention}%
                </span>
              </div>

              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    c.decay.currentEstimatedRetention >= 75 ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${c.decay.currentEstimatedRetention}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                <span>{c.decay.daysSinceLastPractice} days since practice</span>
                <span className="text-blue-600 font-medium">Inspect &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
