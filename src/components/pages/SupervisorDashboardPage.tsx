import React, { useState, useEffect } from 'react';
import { NavPageId } from '../common/Sidebar';
import {
  AdminAnalyticsService,
  SupervisorOverviewResponse,
  SubordinateTeamResponse,
  SubordinateOfficerSummary,
} from '../../services/adminAnalyticsService';
import {
  Users,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Briefcase,
  ShieldAlert,
  RefreshCw,
  Building,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Target,
  CheckCircle2,
} from 'lucide-react';

interface SupervisorDashboardPageProps {
  onNavigate: (page: NavPageId) => void;
  onSelectOfficer?: (officerId: number) => void;
}

export const SupervisorDashboardPage: React.FC<SupervisorDashboardPageProps> = ({
  onNavigate,
  onSelectOfficer,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<SupervisorOverviewResponse | null>(null);
  const [team, setTeam] = useState<SubordinateTeamResponse | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, teamRes] = await Promise.all([
        AdminAnalyticsService.getSupervisorOverview(),
        AdminAnalyticsService.getSupervisorTeam(),
      ]);
      setOverview(overviewRes);
      setTeam(teamRes);
    } catch (err) {
      console.error('Failed to load supervisor dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 pb-12 animate-fadeIn">
      {/* Top Header */}
      <div className="officer-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-unverified uppercase text-[10px] tracking-widest">
              <Building className="w-3.5 h-3.5 mr-1 text-[#6B4A35]" />
              Supervisor Oversight
            </span>
            <span className="text-xs text-[#93877D]">
              {overview?.department ? `${overview.department} Jurisdiction` : 'Unit-Level Command'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#2F2520] tracking-tight">
            Unit Competency & Readiness Oversight
          </h1>
          <p className="text-sm text-[#6E625A] mt-1">
            Direct supervisory monitoring of subordinate officers, skill gaps, deployment readiness, and training assignments.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F8F3EB] border border-[#DED2C5] text-[#3A2921] hover:bg-[#EEE4D8] transition text-xs font-bold shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 text-[#6B4A35] ${loading ? 'animate-spin' : ''}`} />
          Refresh Unit Data
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="officer-card p-4">
          <div className="flex items-center justify-between text-[#93877D] text-xs mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Team Strength</span>
            <Users className="w-4 h-4 text-[#6B4A35]" />
          </div>
          <div className="text-2xl font-black text-[#2F2520]">
            {overview?.team_size ?? '--'}
          </div>
          <div className="text-[10px] text-[#6E625A] mt-0.5">Assigned officers</div>
        </div>

        <div className="officer-card p-4">
          <div className="flex items-center justify-between text-[#93877D] text-xs mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Unit Mastery</span>
            <TrendingUp className="w-4 h-4 text-[#547A5A]" />
          </div>
          <div className="text-2xl font-black text-[#547A5A]">
            {overview ? `${(overview.team_mean_mastery * 100).toFixed(1)}%` : '--'}
          </div>
          <div className="text-[10px] text-[#6E625A] mt-0.5">Average unit score</div>
        </div>

        <div className="officer-card p-4">
          <div className="flex items-center justify-between text-[#93877D] text-xs mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Verified Mastery</span>
            <ShieldCheck className="w-4 h-4 text-[#6B4A35]" />
          </div>
          <div className="text-2xl font-black text-[#3A2921]">
            {overview ? `${(overview.team_verified_rate * 100).toFixed(1)}%` : '--'}
          </div>
          <div className="text-[10px] text-[#6E625A] mt-0.5">Proctored verification</div>
        </div>

        <div className="officer-card p-4 border-[#D4958F] bg-[#FBF0EF]">
          <div className="flex items-center justify-between text-[#9A4B42] text-xs mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Critical Gaps</span>
            <AlertTriangle className="w-4 h-4 text-[#9A4B42]" />
          </div>
          <div className="text-2xl font-black text-[#7A2E2A]">
            {overview?.team_red_gap_count ?? '--'}
          </div>
          <div className="text-[10px] text-[#7A2E2A]/70 mt-0.5">Red alert gaps</div>
        </div>

        <div className="officer-card p-4 border-[#D4A96A] bg-[#FDF6EC] col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-[#A97838] text-xs mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Deployability</span>
            <CheckCircle2 className="w-4 h-4 text-[#A97838]" />
          </div>
          <div className="text-2xl font-black text-[#7A4F1E]">
            {overview ? `${(overview.team_task_readiness_rate * 100).toFixed(0)}%` : '--'}
          </div>
          <div className="text-[10px] text-[#7A4F1E]/70 mt-0.5">Task qualification</div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-[#93877D]">
          <RefreshCw className="w-8 h-8 animate-spin mb-3 text-[#6B4A35]" />
          <p className="text-sm font-medium">Loading subordinate team intelligence...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subordinate Officers Table (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="officer-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#2F2520]">Subordinate Officers</h2>
                  <p className="text-xs text-[#6E625A]">
                    Individual competency health, qualification status, and decay indicators.
                  </p>
                </div>
                <span className="text-xs text-[#93877D] font-mono font-bold">
                  {team?.total_subordinates || 0} Officers
                </span>
              </div>

              <div className="space-y-3">
                {team?.officers.map((officer) => (
                  <div
                    key={officer.officer_id}
                    className="bg-[#F8F3EB] border border-[#DED2C5] rounded-xl p-4 hover:border-[#CBB9A7] transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#2F2520]">{officer.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#EEE4D8] text-[#3A2921] font-mono font-semibold">
                            {officer.cadre}
                          </span>
                          {officer.decay_alert && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#FDF6EC] text-[#7A4F1E] border border-[#D4A96A]">
                              <ShieldAlert className="w-3 h-3 mr-1 text-[#A97838]" />
                              Decay Alert
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#6E625A] mt-0.5">
                          {officer.designation} • {officer.department} • {officer.years_of_experience} yrs exp
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {officer.is_deployable ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EFF6EF] text-[#2E5B34] border border-[#A8C9AC]">
                            Deployable
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#FDF6EC] text-[#7A4F1E] border border-[#D4A96A]">
                            Needs Training
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#DED2C5] items-center text-xs">
                      <div>
                        <div className="flex justify-between text-[#6E625A] mb-1">
                          <span>Mean Mastery</span>
                          <span className="font-mono font-bold text-[#2F2520]">
                            {(officer.mean_mastery * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-[#EEE4D8] rounded-full overflow-hidden">
                          <div
                            style={{ width: `${officer.mean_mastery * 100}%` }}
                            className="h-full bg-[#547A5A]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[#6E625A] sm:justify-center">
                        <span>
                          <strong className="text-[#9A4B42] font-mono">{officer.red_gaps}</strong> Red Gaps
                        </span>
                        <span>
                          <strong className="text-[#A97838] font-mono">{officer.orange_gaps}</strong> Orange
                        </span>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            if (onSelectOfficer) onSelectOfficer(officer.officer_id);
                            onNavigate('digital_twin');
                          }}
                          className="flex items-center gap-1 text-xs text-[#6B4A35] hover:text-[#3A2921] font-bold"
                        >
                          View Twin & Plan
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Unit Top Gaps & Recommended Interventions (1 col) */}
          <div className="space-y-4">
            <div className="officer-card p-5 space-y-4">
              <h2 className="text-base font-bold text-[#2F2520]">Unit Competency Bottlenecks</h2>
              <p className="text-xs text-[#6E625A]">
                Most frequent skill gaps in your assigned unit requiring training intervention.
              </p>

              <div className="space-y-2.5">
                {overview?.top_team_gaps && overview.top_team_gaps.length > 0 ? (
                  overview.top_team_gaps.map((gap) => (
                    <div
                      key={gap.competency_id}
                      className="bg-[#F8F3EB] border border-[#DED2C5] rounded-xl p-3 flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-[#2F2520]">{gap.competency_name}</div>
                        <div className="text-[10px] text-[#93877D] font-mono">{gap.competency_id}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#FBF0EF] text-[#7A2E2A] border border-[#D4958F]">
                        {gap.red_count} Red Gaps
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[#93877D] italic py-4 text-center">
                    No critical unit gaps detected.
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#DED2C5]">
                <button
                  onClick={() => onNavigate('learning')}
                  className="w-full py-2.5 rounded-xl bg-[#6B4A35] hover:bg-[#523625] text-[#FBF8F2] text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <GraduationCap className="w-4 h-4" />
                  View Recommended Training Catalog
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
