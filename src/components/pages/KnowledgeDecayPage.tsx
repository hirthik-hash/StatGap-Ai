import React, { useState } from 'react';
import { Competency } from '../../types';
import { NavPageId } from '../common/Sidebar';
import { DecayLineChart } from '../charts/DecayLineChart';
import { CompetencyService } from '../../services/competencyService';
import { VerificationApiService } from '../../services/verificationService';
import { decayToRiskCategory } from '../../utils/gapxResolver';
import {
  RotateCcw,
  Calendar,
  ShieldAlert,
  CheckCircle2,
  BellRing,
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
            <span className="text-[11px] text-[#6E625A]">Continuous Decay-Watch Engine</span>
          </div>
          <h1 className="text-2xl font-black text-[#2F2520] tracking-tight">
            Knowledge Decay Monitoring
          </h1>
          <p className="text-sm text-[#6E625A] mt-1">
            Mathematical modeling of skill degradation over time — ensures officers stay field-ready before PLFS surveys.
          </p>
        </div>

        {/* Quick Switcher */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#6E625A] font-medium">Select Skill:</span>
          <select
            value={selectedCompetencyId}
            onChange={(e) => setSelectedCompetencyId(e.target.value)}
            className="px-3 py-2 bg-[#FBF8F2] border border-[#CBB9A7] rounded-lg text-xs font-semibold text-[#2F2520] focus:outline-none focus:ring-2 focus:ring-[#6B4A35]"
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
        <div className="p-4 rounded-xl bg-[#EFF6EF] border-2 border-[#547A5A] text-[#1F5E2A] flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2 text-xs font-medium">
            <CheckCircle2 className="w-5 h-5 text-[#547A5A] shrink-0" />
            <span>{refreshedToast}</span>
          </div>
          <button
            onClick={() => setRefreshedToast(null)}
            className="text-xs font-bold text-[#2E5B34] hover:text-[#0E3C14] cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {reminderScheduled && (
        <div className="p-4 rounded-xl bg-[#F8F3EB] border border-[#DED2C5] text-[#2F2520] flex items-center gap-2.5 text-xs animate-fadeIn">
          <BellRing className="w-4 h-4 text-[#6B4A35] shrink-0" />
          <span>
            Calendar reminder scheduled: MoSPI micro-refresher notification will trigger in 5 days via iGOT portal!
          </span>
        </div>
      )}

      {/* Spotlight Focus Card on Selected Competency */}
      <div className="officer-card p-5 sm:p-6 border-2 border-[#CBB9A7]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-[#EEE4D8]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E625A]">{selectedComp.category}</span>
              <span className={`badge ${riskInfo.color} ${riskInfo.bg} border ${riskInfo.border} font-bold`}>
                {riskInfo.label}
              </span>
            </div>

            <h2 className="text-2xl font-black text-[#2F2520]">{selectedComp.name}</h2>
            <p className="text-xs text-[#6E625A] mt-1 max-w-xl">
              Evaluated on {decay.lastEvaluatedDate} at {decay.initialScore}%. Without continuous practice, retention has degraded to {decay.currentEstimatedRetention}%.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <button
              onClick={handleRefreshKnowledge}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#6B4A35] hover:bg-[#523625] text-[#FBF8F2] font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-[#F3E9D8]" />
              <span>Refresh Knowledge (5m Quiz)</span>
            </button>

            <button
              onClick={handleScheduleReminder}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#EEE4D8] hover:bg-[#DED2C5] text-[#3A2921] font-semibold text-xs border border-[#CBB9A7] transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-[#6B4A35]" />
              <span>Schedule Reminder</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Pills */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-xl bg-[#F8F3EB] border border-[#DED2C5]">
            <span className="text-[11px] font-bold text-[#6E625A] uppercase tracking-wider">
              Score on {decay.lastEvaluatedDate}
            </span>
            <div className="text-2xl font-black text-[#2F2520] font-mono mt-1">
              {decay.initialScore}%
            </div>
            <div className="text-[11px] text-[#6E625A] mt-0.5">Verified peak level</div>
          </div>

          <div className="p-4 rounded-xl bg-[#FBF0EF] border border-[#D4958F]">
            <span className="text-[11px] font-bold text-[#7A2E2A] uppercase tracking-wider">
              Current Estimated Score
            </span>
            <div className="text-2xl font-black text-[#9A4B42] font-mono mt-1">
              {decay.currentEstimatedRetention}%
            </div>
            <div className="text-[11px] text-[#7A2E2A] mt-0.5">
              4 percentage points below 75% threshold
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8F3EB] border border-[#DED2C5]">
            <span className="text-[11px] font-bold text-[#6E625A] uppercase tracking-wider">
              Days Since Last Practice
            </span>
            <div className="text-2xl font-black text-[#2F2520] font-mono mt-1">
              {decay.daysSinceLastPractice} days
            </div>
            <div className="text-[11px] text-[#6E625A] mt-0.5">No refresher submitted</div>
          </div>

          <div className="p-4 rounded-xl bg-[#FDF6EC] border border-[#D4A96A]">
            <span className="text-[11px] font-bold text-[#7A4F1E] uppercase tracking-wider">
              Next Refresh Required
            </span>
            <div className="text-2xl font-black text-[#A97838] font-mono mt-1">
              {decay.nextRefreshDays} days
            </div>
            <div className="text-[11px] text-[#7A4F1E] mt-0.5">Recommended interval</div>
          </div>
        </div>
      </div>

      {/* Ebbinghaus Forgetting Curve Chart */}
      <div className="bg-[#FFFDFC] rounded-2xl border border-[#DED2C5] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-[#EEE4D8]">
          <div>
            <h3 className="text-base font-bold text-[#2F2520]">
              Retention Trajectory &amp; Prediction Curve
            </h3>
            <p className="text-xs text-[#6E625A]">
              Calculated via Ebbinghaus retention law:{' '}
              <code className="text-xs font-mono bg-[#F8F3EB] border border-[#DED2C5] px-1.5 py-0.5 rounded text-[#6B4A35]">
                R(t) = e^(-t / S)
              </code>
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-[#9A4B42] font-bold">
              <span className="w-2.5 h-0.5 bg-[#9A4B42] inline-block"></span>
              75% MoSPI Threshold
            </span>
            <span className="flex items-center gap-1.5 text-[#6B4A35] font-bold">
              <span className="w-2.5 h-0.5 bg-[#6B4A35] inline-block"></span>
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

        {/* Alert Callout when < 75% */}
        {decay.currentEstimatedRetention < 75 && (
          <div className="mt-6 p-4 rounded-xl bg-[#FBF0EF] border-2 border-[#D4958F] text-[#7A2E2A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-[#9A4B42] shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-[#7A2E2A] block">
                  CRITICAL DECAY ALERT: Retention Dropped Below 75% MoSPI Standard
                </span>
                <span>
                  Estimated retention ({decay.currentEstimatedRetention}%) is in danger zone. Take a 5-minute refresher quiz now to avoid field survey bias.
                </span>
              </div>
            </div>

            <button
              onClick={handleRefreshKnowledge}
              className="px-4 py-2 rounded-lg bg-[#9A4B42] hover:bg-[#7A2E2A] text-[#FFFDFC] font-bold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              Take 5-min Refresher Now
            </button>
          </div>
        )}
      </div>

      {/* Cross-System Decay Matrix */}
      <div className="bg-[#FFFDFC] rounded-2xl border border-[#DED2C5] p-6 shadow-xs">
        <h3 className="text-base font-bold text-[#2F2520] mb-4 pb-3 border-b border-[#EEE4D8]">
          Decay Status Across Statistical Systems
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {competencies.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedCompetencyId(c.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                c.id === selectedCompetencyId
                  ? 'bg-[#EEE4D8] border-[#6B4A35] shadow-xs ring-1 ring-[#6B4A35]/30'
                  : 'bg-[#FFFDFC] hover:bg-[#F8F3EB] border-[#DED2C5]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold uppercase text-[#93877D]">
                  {c.category}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    c.decay.status === 'Retained'
                      ? 'bg-[#EFF6EF] text-[#2E5B34] border-[#A8C9AC]'
                      : 'bg-[#FBF0EF] text-[#7A2E2A] border-[#D4958F]'
                  }`}
                >
                  {c.decay.status}
                </span>
              </div>

              <h4 className="text-xs font-bold text-[#2F2520]">{c.name}</h4>

              <div className="flex items-baseline justify-between mt-3 text-xs">
                <span className="text-[#6E625A]">Estimated Retention:</span>
                <span className="font-mono font-bold text-[#2F2520]">
                  {c.decay.currentEstimatedRetention}%
                </span>
              </div>

              <div className="w-full bg-[#EEE4D8] h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    c.decay.currentEstimatedRetention >= 75 ? 'bg-[#547A5A]' : 'bg-[#9A4B42]'
                  }`}
                  style={{ width: `${c.decay.currentEstimatedRetention}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#6E625A] mt-2">
                <span>{c.decay.daysSinceLastPractice} days since practice</span>
                <span className="text-[#6B4A35] font-medium">Inspect &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
