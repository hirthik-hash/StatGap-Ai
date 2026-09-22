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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Building className="w-3.5 h-3.5 mr-1" />
              Supervisor Oversight
            </span>
            <span className="text-xs text-slate-400">
              {overview?.department ? `${overview.department} Jurisdiction` : 'Unit-Level Command'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-slate-200 to-blue-300 bg-clip-text text-transparent">
            Unit Competency & Readiness Oversight
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Direct supervisory monitoring of subordinate officers, skill gaps, deployment readiness, and training assignments.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Unit Data
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Team Strength</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {overview?.team_size ?? '--'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Assigned officers</div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Unit Mastery</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {overview ? `${(overview.team_mean_mastery * 100).toFixed(1)}%` : '--'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Average unit score</div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Verified Mastery</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {overview ? `${(overview.team_verified_rate * 100).toFixed(1)}%` : '--'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Proctored verification</div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Critical Gaps</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">
            {overview?.team_red_gap_count ?? '--'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Red alert gaps</div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl p-4 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Deployability</span>
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {overview ? `${(overview.team_task_readiness_rate * 100).toFixed(0)}%` : '--'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Task qualification</div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mb-3 text-blue-400" />
          <p className="text-sm">Loading subordinate team intelligence...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subordinate Officers Table (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Subordinate Officers</h2>
                  <p className="text-xs text-slate-400">
                    Individual competency health, qualification status, and decay indicators.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {team?.total_subordinates || 0} Officers
                </span>
              </div>

              <div className="space-y-3">
                {team?.officers.map((officer) => (
                  <div
                    key={officer.officer_id}
                    className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{officer.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            {officer.cadre}
                          </span>
                          {officer.decay_alert && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              <ShieldAlert className="w-3 h-3 mr-1" />
                              Decay Alert
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {officer.designation} • {officer.department} • {officer.years_of_experience} yrs exp
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {officer.is_deployable ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Deployable
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Needs Training
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 items-center text-xs">
                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Mean Mastery</span>
                          <span className="font-mono text-slate-200">
                            {(officer.mean_mastery * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${officer.mean_mastery * 100}%` }}
                            className="h-full bg-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-slate-400 sm:justify-center">
                        <span>
                          <strong className="text-rose-400 font-mono">{officer.red_gaps}</strong> Red Gaps
                        </span>
                        <span>
                          <strong className="text-amber-400 font-mono">{officer.orange_gaps}</strong> Orange
                        </span>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            if (onSelectOfficer) onSelectOfficer(officer.officer_id);
                            onNavigate('digital_twin');
                          }}
                          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
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
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-lg font-semibold text-white">Unit Competency Bottlenecks</h2>
              <p className="text-xs text-slate-400">
                Most frequent skill gaps in your assigned unit requiring training intervention.
              </p>

              <div className="space-y-2.5">
                {overview?.top_team_gaps && overview.top_team_gaps.length > 0 ? (
                  overview.top_team_gaps.map((gap) => (
                    <div
                      key={gap.competency_id}
                      className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-slate-200">{gap.competency_name}</div>
                        <div className="text-xs text-slate-500 font-mono">{gap.competency_id}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {gap.red_count} Red Gaps
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 italic py-4 text-center">
                    No critical unit gaps detected.
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => onNavigate('learning')}
                  className="w-full py-2.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 text-xs font-semibold flex items-center justify-center gap-2 transition"
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
