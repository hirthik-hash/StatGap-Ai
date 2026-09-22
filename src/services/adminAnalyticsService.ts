/**
 * Admin & Supervisor Workforce Analytics Service — Phase 8
 * Bridges frontend dashboards to the STAT-GAP AI aggregate cadre intelligence and supervisor oversight APIs.
 */

const API_BASE = '/api';

export interface AdminOverview {
  total_officers: number;
  total_competency_evaluations: number;
  overall_mean_mastery: number;
  overall_verified_mastery_rate: number;
  red_gap_count: number;
  orange_gap_count: number;
  green_gap_count: number;
  task_deployment_ready_rate: number;
  active_cadres: string[];
  decay_alert_count: number;
  timestamp: string;
}

export interface HeatmapCell {
  cadre: string;
  competency_id: string;
  competency_name: string;
  officer_count: number;
  mean_mastery: number;
  verified_rate: number;
  gap_rate: number;
  red_gap_count: number;
}

export interface CadreHeatmapResponse {
  cadres: string[];
  competencies: Array<{ id: string; name: string }>;
  matrix: HeatmapCell[];
  timestamp: string;
}

export interface GapConcentrationItem {
  competency_id: string;
  competency_name: string;
  red_count: number;
  orange_count: number;
  green_count: number;
  criticality_score: number;
}

export interface GapDistributionResponse {
  total_evaluated: number;
  red_count: number;
  orange_count: number;
  green_count: number;
  red_percentage: number;
  orange_percentage: number;
  green_percentage: number;
  high_risk_competencies: GapConcentrationItem[];
  timestamp: string;
}

export interface TaskBottleneckRollup {
  task_id: string;
  task_name: string;
  total_officers_evaluated: number;
  ready_officers_count: number;
  readiness_rate: number;
  primary_bottleneck_competency_id?: string | null;
  primary_bottleneck_competency_name?: string | null;
  bottleneck_officer_count: number;
}

export interface TaskReadinessAnalyticsResponse {
  total_tasks_evaluated: number;
  average_readiness_rate: number;
  tasks: TaskBottleneckRollup[];
  timestamp: string;
}

export interface CourseDemandItem {
  course_id: string;
  title: string;
  provider: string;
  demand_count: number;
  competency_name: string;
}

export interface TrainingDemandRollupResponse {
  total_recommended_interventions: number;
  igot_demand_count: number;
  nssta_demand_count: number;
  tpac_demand_count: number;
  top_demanded_courses: CourseDemandItem[];
  timestamp: string;
}

export interface TrainingEffectivenessResponse {
  status: string;
  total_evaluated_interventions: number;
  mean_mastery_shift: number;
  insufficient_data_reason?: string | null;
  timestamp: string;
}

export interface FutureRoleComparisonResponse {
  role_id: string;
  role_title: string;
  target_cadre: string;
  description: string;
  urgency: string;
  total_cadre_officers: number;
  qualified_officers_count: number;
  readiness_rate: number;
  average_cadre_gap: number;
  critical_missing_competencies: string[];
  is_assumption_based: boolean;
}

export interface CapacityBuildingPriorityResponse {
  rank: number;
  competency_id: string;
  competency_name: string;
  priority_score: number;
  urgency: string;
  affected_officers_count: number;
  red_gap_count: number;
  recommended_provider: string;
  rationale: string;
}

export interface SupervisorOverviewResponse {
  department: string;
  team_size: number;
  team_mean_mastery: number;
  team_verified_rate: number;
  team_red_gap_count: number;
  team_task_readiness_rate: number;
  top_team_gaps: Array<{ competency_id: string; competency_name: string; red_count: number }>;
  timestamp: string;
}

export interface SubordinateOfficerSummary {
  officer_id: number;
  igot_id: string;
  name: string;
  cadre: string;
  designation: string;
  department: string;
  years_of_experience: number;
  mean_mastery: number;
  red_gaps: number;
  orange_gaps: number;
  is_deployable: boolean;
  decay_alert: boolean;
}

export interface SubordinateTeamResponse {
  department: string;
  total_subordinates: number;
  officers: SubordinateOfficerSummary[];
  timestamp: string;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('statgap_token') || sessionStorage.getItem('statgap_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const AdminAnalyticsService = {
  async getOverview(cadre?: string): Promise<AdminOverview | null> {
    try {
      const url = cadre
        ? `${API_BASE}/admin/analytics/overview?cadre=${encodeURIComponent(cadre)}`
        : `${API_BASE}/admin/analytics/overview`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getHeatmap(cadre?: string): Promise<CadreHeatmapResponse | null> {
    try {
      const url = cadre
        ? `${API_BASE}/admin/analytics/heatmap?cadre=${encodeURIComponent(cadre)}`
        : `${API_BASE}/admin/analytics/heatmap`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getGapDistribution(cadre?: string): Promise<GapDistributionResponse | null> {
    try {
      const url = cadre
        ? `${API_BASE}/admin/analytics/gaps?cadre=${encodeURIComponent(cadre)}`
        : `${API_BASE}/admin/analytics/gaps`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getTaskReadiness(cadre?: string): Promise<TaskReadinessAnalyticsResponse | null> {
    try {
      const url = cadre
        ? `${API_BASE}/admin/analytics/task-readiness?cadre=${encodeURIComponent(cadre)}`
        : `${API_BASE}/admin/analytics/task-readiness`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getTrainingDemand(cadre?: string): Promise<TrainingDemandRollupResponse | null> {
    try {
      const url = cadre
        ? `${API_BASE}/admin/analytics/training-demand?cadre=${encodeURIComponent(cadre)}`
        : `${API_BASE}/admin/analytics/training-demand`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getTrainingEffectiveness(): Promise<TrainingEffectivenessResponse | null> {
    try {
      const res = await fetch(`${API_BASE}/admin/analytics/training-effectiveness`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getFutureRequirements(cadre?: string): Promise<FutureRoleComparisonResponse[]> {
    try {
      const url = cadre
        ? `${API_BASE}/admin/analytics/future-requirements?cadre=${encodeURIComponent(cadre)}`
        : `${API_BASE}/admin/analytics/future-requirements`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async getCapacityPriorities(cadre?: string): Promise<CapacityBuildingPriorityResponse[]> {
    try {
      const url = cadre
        ? `${API_BASE}/admin/analytics/capacity-priorities?cadre=${encodeURIComponent(cadre)}`
        : `${API_BASE}/admin/analytics/capacity-priorities`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async downloadCsv(cadre?: string): Promise<void> {
    const url = cadre
      ? `${API_BASE}/admin/analytics/export?cadre=${encodeURIComponent(cadre)}`
      : `${API_BASE}/admin/analytics/export`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('CSV export failed');
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `workforce_competency_analytics_${cadre || 'all'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  async getSupervisorOverview(department?: string): Promise<SupervisorOverviewResponse | null> {
    try {
      const url = department
        ? `${API_BASE}/supervisor/analytics/overview?department=${encodeURIComponent(department)}`
        : `${API_BASE}/supervisor/analytics/overview`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getSupervisorTeam(department?: string): Promise<SubordinateTeamResponse | null> {
    try {
      const url = department
        ? `${API_BASE}/supervisor/analytics/team?department=${encodeURIComponent(department)}`
        : `${API_BASE}/supervisor/analytics/team`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },
};
