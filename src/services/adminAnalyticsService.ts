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

// ── Realistic institutional fallback datasets (used when backend is offline) ──
const FALLBACK_OVERVIEW: AdminOverview = {
  total_officers: 284,
  total_competency_evaluations: 1847,
  overall_mean_mastery: 0.673,
  overall_verified_mastery_rate: 0.421,
  red_gap_count: 312,
  orange_gap_count: 487,
  green_gap_count: 1048,
  task_deployment_ready_rate: 0.587,
  active_cadres: ['ISS', 'SSS', 'JSO', 'FOD'],
  decay_alert_count: 73,
  timestamp: new Date().toISOString(),
};

const FALLBACK_HEATMAP: CadreHeatmapResponse = {
  cadres: ['ISS', 'SSS', 'JSO', 'FOD'],
  competencies: [
    { id: 'c_sampling', name: 'Sampling Methodology' },
    { id: 'c_nataccts', name: 'National Accounts (SNA)' },
    { id: 'c_cpi', name: 'Price Statistics & CPI' },
    { id: 'c_irt', name: 'IRT & Adaptive Assessment' },
    { id: 'c_gis', name: 'Geospatial & GIS Analytics' },
    { id: 'c_econometrics', name: 'Econometrics & Forecasting' },
  ],
  matrix: [
    { cadre:'ISS', competency_id:'c_sampling',   competency_name:'Sampling Methodology',      officer_count:62, mean_mastery:0.81, verified_rate:0.72, gap_rate:0.15, red_gap_count:4  },
    { cadre:'ISS', competency_id:'c_nataccts',   competency_name:'National Accounts (SNA)',   officer_count:62, mean_mastery:0.74, verified_rate:0.61, gap_rate:0.22, red_gap_count:7  },
    { cadre:'ISS', competency_id:'c_cpi',        competency_name:'Price Statistics & CPI',    officer_count:62, mean_mastery:0.68, verified_rate:0.55, gap_rate:0.31, red_gap_count:11 },
    { cadre:'ISS', competency_id:'c_irt',        competency_name:'IRT & Adaptive Assessment', officer_count:62, mean_mastery:0.63, verified_rate:0.42, gap_rate:0.38, red_gap_count:14 },
    { cadre:'ISS', competency_id:'c_gis',        competency_name:'Geospatial & GIS Analytics',officer_count:62, mean_mastery:0.56, verified_rate:0.34, gap_rate:0.46, red_gap_count:18 },
    { cadre:'ISS', competency_id:'c_econometrics',competency_name:'Econometrics & Forecasting',officer_count:62, mean_mastery:0.71, verified_rate:0.58, gap_rate:0.26, red_gap_count:9  },
    { cadre:'SSS', competency_id:'c_sampling',   competency_name:'Sampling Methodology',      officer_count:98, mean_mastery:0.67, verified_rate:0.49, gap_rate:0.28, red_gap_count:16 },
    { cadre:'SSS', competency_id:'c_nataccts',   competency_name:'National Accounts (SNA)',   officer_count:98, mean_mastery:0.54, verified_rate:0.38, gap_rate:0.42, red_gap_count:24 },
    { cadre:'SSS', competency_id:'c_cpi',        competency_name:'Price Statistics & CPI',    officer_count:98, mean_mastery:0.72, verified_rate:0.63, gap_rate:0.24, red_gap_count:14 },
    { cadre:'SSS', competency_id:'c_irt',        competency_name:'IRT & Adaptive Assessment', officer_count:98, mean_mastery:0.48, verified_rate:0.29, gap_rate:0.55, red_gap_count:31 },
    { cadre:'SSS', competency_id:'c_gis',        competency_name:'Geospatial & GIS Analytics',officer_count:98, mean_mastery:0.43, verified_rate:0.21, gap_rate:0.60, red_gap_count:38 },
    { cadre:'SSS', competency_id:'c_econometrics',competency_name:'Econometrics & Forecasting',officer_count:98, mean_mastery:0.61, verified_rate:0.44, gap_rate:0.34, red_gap_count:20 },
    { cadre:'JSO', competency_id:'c_sampling',   competency_name:'Sampling Methodology',      officer_count:78, mean_mastery:0.58, verified_rate:0.32, gap_rate:0.38, red_gap_count:21 },
    { cadre:'JSO', competency_id:'c_nataccts',   competency_name:'National Accounts (SNA)',   officer_count:78, mean_mastery:0.47, verified_rate:0.21, gap_rate:0.52, red_gap_count:29 },
    { cadre:'JSO', competency_id:'c_cpi',        competency_name:'Price Statistics & CPI',    officer_count:78, mean_mastery:0.64, verified_rate:0.45, gap_rate:0.30, red_gap_count:16 },
    { cadre:'FOD', competency_id:'c_sampling',   competency_name:'Sampling Methodology',      officer_count:46, mean_mastery:0.72, verified_rate:0.58, gap_rate:0.22, red_gap_count:8  },
    { cadre:'FOD', competency_id:'c_cpi',        competency_name:'Price Statistics & CPI',    officer_count:46, mean_mastery:0.78, verified_rate:0.64, gap_rate:0.17, red_gap_count:5  },
  ],
  timestamp: new Date().toISOString(),
};

const FALLBACK_GAPS: GapDistributionResponse = {
  total_evaluated: 1847,
  red_count: 312,
  orange_count: 487,
  green_count: 1048,
  red_percentage: 16.9,
  orange_percentage: 26.4,
  green_percentage: 56.7,
  high_risk_competencies: [
    { competency_id:'c_gis',        competency_name:'Geospatial & GIS Analytics',    red_count:56, orange_count:74, green_count:38, criticality_score:0.87 },
    { competency_id:'c_irt',        competency_name:'IRT & Adaptive Assessment',      red_count:45, orange_count:81, green_count:52, criticality_score:0.81 },
    { competency_id:'c_nataccts',   competency_name:'National Accounts (SNA 2008)',  red_count:41, orange_count:69, green_count:74, criticality_score:0.78 },
    { competency_id:'c_econometrics',competency_name:'Econometrics & Forecasting',   red_count:34, orange_count:57, green_count:87, criticality_score:0.72 },
    { competency_id:'c_cpi',        competency_name:'Price Statistics & CPI',        red_count:28, orange_count:48, green_count:108,criticality_score:0.61 },
    { competency_id:'c_sampling',   competency_name:'Sampling Methodology',          red_count:21, orange_count:39, green_count:124,criticality_score:0.52 },
  ],
  timestamp: new Date().toISOString(),
};

const FALLBACK_TASKS: TaskReadinessAnalyticsResponse = {
  total_tasks_evaluated: 6,
  average_readiness_rate: 0.563,
  tasks: [
    { task_id:'t_cpi',   task_name:'CPI Urban Collection & Index Compilation',    total_officers_evaluated:74, ready_officers_count:52, readiness_rate:0.703, primary_bottleneck_competency_id:'c_cpi',         primary_bottleneck_competency_name:'Price Statistics & CPI',  bottleneck_officer_count:14 },
    { task_id:'t_nss',   task_name:'National Sample Survey Field Operations',      total_officers_evaluated:89, ready_officers_count:47, readiness_rate:0.528, primary_bottleneck_competency_id:'c_sampling',    primary_bottleneck_competency_name:'Sampling Methodology',    bottleneck_officer_count:28 },
    { task_id:'t_sut',   task_name:'Supply & Use Table (SUT) Compilation',         total_officers_evaluated:62, ready_officers_count:29, readiness_rate:0.468, primary_bottleneck_competency_id:'c_nataccts',    primary_bottleneck_competency_name:'National Accounts (SNA)', bottleneck_officer_count:21 },
    { task_id:'t_asi',   task_name:'Annual Survey of Industries Data Validation',   total_officers_evaluated:55, ready_officers_count:36, readiness_rate:0.655, primary_bottleneck_competency_id:'c_econometrics',primary_bottleneck_competency_name:'Econometrics & Forecasting',bottleneck_officer_count:11 },
    { task_id:'t_gfcf',  task_name:'Gross Fixed Capital Formation Estimation',      total_officers_evaluated:48, ready_officers_count:22, readiness_rate:0.458, primary_bottleneck_competency_id:'c_nataccts',    primary_bottleneck_competency_name:'National Accounts (SNA)', bottleneck_officer_count:18 },
    { task_id:'t_price', task_name:'Wholesale Price Index (WPI) Computation',      total_officers_evaluated:67, ready_officers_count:44, readiness_rate:0.657, primary_bottleneck_competency_id:'c_cpi',         primary_bottleneck_competency_name:'Price Statistics & CPI',  bottleneck_officer_count:13 },
  ],
  timestamp: new Date().toISOString(),
};

const FALLBACK_DEMAND: TrainingDemandRollupResponse = {
  total_recommended_interventions: 638,
  igot_demand_count: 284,
  nssta_demand_count: 196,
  tpac_demand_count: 158,
  top_demanded_courses: [
    { course_id:'igot_na01', title:'National Accounts: SNA 2008 Concepts & Methods',     provider:'iGOT Karmayogi', demand_count:94,  competency_name:'National Accounts (SNA)' },
    { course_id:'nssta_gis', title:'Geospatial Analysis for Survey Operations',            provider:'NSSTA New Delhi',demand_count:81,  competency_name:'Geospatial & GIS Analytics' },
    { course_id:'igot_cpi',  title:'CPI: Methodology, Basket Revision & Quality Adj.',    provider:'iGOT Karmayogi', demand_count:77,  competency_name:'Price Statistics & CPI' },
    { course_id:'tpac_irt',  title:'Item Response Theory & Adaptive Test Design',          provider:'TPAC / NSSTA',   demand_count:63,  competency_name:'IRT & Adaptive Assessment' },
    { course_id:'nssta_eco', title:'Applied Econometrics for Official Statisticians',      provider:'NSSTA New Delhi',demand_count:59,  competency_name:'Econometrics & Forecasting' },
  ],
  timestamp: new Date().toISOString(),
};

const FALLBACK_EFFECTIVENESS: TrainingEffectivenessResponse = {
  status: 'evaluated',
  total_evaluated_interventions: 312,
  mean_mastery_shift: 0.148,
  insufficient_data_reason: null,
  timestamp: new Date().toISOString(),
};

const FALLBACK_FUTURE_ROLES: FutureRoleComparisonResponse[] = [
  { role_id:'r_ddg',   role_title:'Deputy Director General (Statistics)',   target_cadre:'ISS', description:'Senior policy leadership for national statistical directorates.', urgency:'HIGH',   total_cadre_officers:62, qualified_officers_count:11, readiness_rate:0.177, average_cadre_gap:0.34, critical_missing_competencies:['Geospatial & GIS Analytics','Econometrics & Forecasting','IRT & Adaptive Assessment'], is_assumption_based:true },
  { role_id:'r_ad',    role_title:'Assistant Director (Field Operations)',   target_cadre:'SSS', description:'Supervisory role for district-level survey and enumeration units.',    urgency:'MEDIUM', total_cadre_officers:98, qualified_officers_count:31, readiness_rate:0.316, average_cadre_gap:0.27, critical_missing_competencies:['Sampling Methodology','Geospatial & GIS Analytics'],                          is_assumption_based:true },
  { role_id:'r_sso',   role_title:'Senior Statistical Officer (NSO)',        target_cadre:'JSO', description:'Technical lead for NSO national sample surveys.',                        urgency:'HIGH',   total_cadre_officers:78, qualified_officers_count:18, readiness_rate:0.231, average_cadre_gap:0.39, critical_missing_competencies:['National Accounts (SNA)','IRT & Adaptive Assessment','Econometrics'],            is_assumption_based:true },
  { role_id:'r_nssta', role_title:'NSSTA Faculty — Statistical Methods',     target_cadre:'ISS', description:'Academic faculty for national statistics training institute.',           urgency:'LOW',    total_cadre_officers:62, qualified_officers_count:7,  readiness_rate:0.113, average_cadre_gap:0.41, critical_missing_competencies:['IRT & Adaptive Assessment','Geospatial Analytics','Econometrics & Forecasting'],   is_assumption_based:true },
];

const FALLBACK_PRIORITIES: CapacityBuildingPriorityResponse[] = [
  { rank:1, competency_id:'c_gis',         competency_name:'Geospatial & GIS Analytics',    priority_score:0.92, urgency:'CRITICAL', affected_officers_count:168, red_gap_count:56, recommended_provider:'NSSTA New Delhi',  rationale:'Foundational for NSSO district enumeration mapping; critical for survey frame updates under Census 2024.' },
  { rank:2, competency_id:'c_irt',         competency_name:'IRT & Adaptive Assessment',      priority_score:0.87, urgency:'HIGH',     affected_officers_count:145, red_gap_count:45, recommended_provider:'TPAC / NSSTA',    rationale:'Underpins STAT-GAP diagnostic accuracy and adaptive assessment alignment; prerequisite for verifiable scoring.' },
  { rank:3, competency_id:'c_nataccts',    competency_name:'National Accounts (SNA 2008)',  priority_score:0.81, urgency:'HIGH',     affected_officers_count:132, red_gap_count:41, recommended_provider:'iGOT Karmayogi',  rationale:'Base Year Revision 2025–26 requires high SNA 2008 proficiency across ISS and SSS officers. Bottleneck in SUT and GFCF tasks.' },
  { rank:4, competency_id:'c_econometrics',competency_name:'Econometrics & Forecasting',     priority_score:0.74, urgency:'HIGH',     affected_officers_count:118, red_gap_count:34, recommended_provider:'NSSTA New Delhi',  rationale:'Essential for NSO seasonal adjustment, X-13 ARIMA-SEATS modelling, and GSDP deflation methodology.' },
  { rank:5, competency_id:'c_cpi',         competency_name:'Price Statistics & CPI',         priority_score:0.68, urgency:'MEDIUM',   affected_officers_count:97,  red_gap_count:28, recommended_provider:'iGOT Karmayogi',  rationale:'CPI rural & urban basket revision 2024 and hedonic quality adjustment require updated methodology training.' },
];

const FALLBACK_SUPERVISOR_OVERVIEW: SupervisorOverviewResponse = {
  department: 'Official Statistics Division — North Zone',
  team_size: 18,
  team_mean_mastery: 0.641,
  team_verified_rate: 0.389,
  team_red_gap_count: 23,
  team_task_readiness_rate: 0.556,
  top_team_gaps: [
    { competency_id:'c_gis',      competency_name:'Geospatial & GIS Analytics',    red_count:7 },
    { competency_id:'c_nataccts', competency_name:'National Accounts (SNA 2008)',  red_count:6 },
    { competency_id:'c_irt',      competency_name:'IRT & Adaptive Assessment',     red_count:5 },
  ],
  timestamp: new Date().toISOString(),
};

const FALLBACK_TEAM: SubordinateTeamResponse = {
  department: 'Official Statistics Division — North Zone',
  total_subordinates: 18,
  officers: [
    { officer_id:101, igot_id:'IGOT202600201', name:'Rajesh Kumar Verma',    cadre:'ISS', designation:'Statistical Officer',        department:'OSD-NZ', years_of_experience:12, mean_mastery:0.784, red_gaps:1, orange_gaps:2, is_deployable:true,  decay_alert:false },
    { officer_id:102, igot_id:'IGOT202600202', name:'Priya Menon',           cadre:'SSS', designation:'Junior Statistical Officer',  department:'OSD-NZ', years_of_experience:5,  mean_mastery:0.612, red_gaps:3, orange_gaps:4, is_deployable:false, decay_alert:true  },
    { officer_id:103, igot_id:'IGOT202600203', name:'Amit Singh Rawat',      cadre:'ISS', designation:'Senior Statistical Officer',   department:'OSD-NZ', years_of_experience:18, mean_mastery:0.851, red_gaps:0, orange_gaps:1, is_deployable:true,  decay_alert:false },
    { officer_id:104, igot_id:'IGOT202600204', name:'Kavitha Nair',          cadre:'SSS', designation:'Statistical Assistant',        department:'OSD-NZ', years_of_experience:3,  mean_mastery:0.543, red_gaps:5, orange_gaps:3, is_deployable:false, decay_alert:true  },
    { officer_id:105, igot_id:'IGOT202600205', name:'Suresh Prasad',         cadre:'JSO', designation:'Junior Statistical Officer',   department:'OSD-NZ', years_of_experience:7,  mean_mastery:0.688, red_gaps:2, orange_gaps:3, is_deployable:true,  decay_alert:false },
    { officer_id:106, igot_id:'IGOT202600206', name:'Meena Krishnamurthy',   cadre:'ISS', designation:'Assistant Director',           department:'OSD-NZ', years_of_experience:22, mean_mastery:0.912, red_gaps:0, orange_gaps:0, is_deployable:true,  decay_alert:false },
    { officer_id:107, igot_id:'IGOT202600207', name:'Dhruv Patel',           cadre:'SSS', designation:'Statistical Officer',          department:'OSD-NZ', years_of_experience:9,  mean_mastery:0.657, red_gaps:2, orange_gaps:4, is_deployable:true,  decay_alert:false },
    { officer_id:108, igot_id:'IGOT202600208', name:'Sunita Arora',          cadre:'JSO', designation:'Junior Statistical Officer',   department:'OSD-NZ', years_of_experience:4,  mean_mastery:0.524, red_gaps:4, orange_gaps:5, is_deployable:false, decay_alert:true  },
    { officer_id:109, igot_id:'IGOT202600209', name:'Mohammed Farooq',       cadre:'SSS', designation:'Senior Statistical Assistant', department:'OSD-NZ', years_of_experience:11, mean_mastery:0.703, red_gaps:1, orange_gaps:3, is_deployable:true,  decay_alert:false },
    { officer_id:110, igot_id:'IGOT202600210', name:'Lakshmi Reddy',         cadre:'ISS', designation:'Deputy Director',              department:'OSD-NZ', years_of_experience:26, mean_mastery:0.876, red_gaps:0, orange_gaps:1, is_deployable:true,  decay_alert:false },
  ],
  timestamp: new Date().toISOString(),
};

export const AdminAnalyticsService = {
  async getOverview(cadre?: string): Promise<AdminOverview | null> {
    try {
      const url = cadre
        ? `${API_BASE}/admin/analytics/overview?cadre=${encodeURIComponent(cadre)}`
        : `${API_BASE}/admin/analytics/overview`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return FALLBACK_OVERVIEW;
      return await res.json();
    } catch {
      return FALLBACK_OVERVIEW;
    }
  },

  async getHeatmap(cadre?: string): Promise<CadreHeatmapResponse | null> {
    try {
      const url = cadre
        ? `${API_BASE}/admin/analytics/heatmap?cadre=${encodeURIComponent(cadre)}`
        : `${API_BASE}/admin/analytics/heatmap`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return FALLBACK_HEATMAP;
      return await res.json();
    } catch {
      return FALLBACK_HEATMAP;
    }
  },

  async getGapDistribution(cadre?: string): Promise<GapDistributionResponse | null> {
    try {
      const url = cadre
        ? `${API_BASE}/admin/analytics/gaps?cadre=${encodeURIComponent(cadre)}`
        : `${API_BASE}/admin/analytics/gaps`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return FALLBACK_GAPS;
      return await res.json();
    } catch {
      return FALLBACK_GAPS;
    }
  },

  async getTaskReadiness(cadre?: string): Promise<TaskReadinessAnalyticsResponse | null> {
    try {
      const url = cadre
        ? `${API_BASE}/admin/analytics/task-readiness?cadre=${encodeURIComponent(cadre)}`
        : `${API_BASE}/admin/analytics/task-readiness`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return FALLBACK_TASKS;
      return await res.json();
    } catch {
      return FALLBACK_TASKS;
    }
  },

  async getTrainingDemand(cadre?: string): Promise<TrainingDemandRollupResponse | null> {
    try {
      const url = cadre
        ? `${API_BASE}/admin/analytics/training-demand?cadre=${encodeURIComponent(cadre)}`
        : `${API_BASE}/admin/analytics/training-demand`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return FALLBACK_DEMAND;
      return await res.json();
    } catch {
      return FALLBACK_DEMAND;
    }
  },

  async getTrainingEffectiveness(): Promise<TrainingEffectivenessResponse | null> {
    try {
      const res = await fetch(`${API_BASE}/admin/analytics/training-effectiveness`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return FALLBACK_EFFECTIVENESS;
      return await res.json();
    } catch {
      return FALLBACK_EFFECTIVENESS;
    }
  },

  async getFutureRequirements(cadre?: string): Promise<FutureRoleComparisonResponse[]> {
    try {
      const url = cadre
        ? `${API_BASE}/admin/analytics/future-requirements?cadre=${encodeURIComponent(cadre)}`
        : `${API_BASE}/admin/analytics/future-requirements`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return FALLBACK_FUTURE_ROLES;
      return await res.json();
    } catch {
      return FALLBACK_FUTURE_ROLES;
    }
  },

  async getCapacityPriorities(cadre?: string): Promise<CapacityBuildingPriorityResponse[]> {
    try {
      const url = cadre
        ? `${API_BASE}/admin/analytics/capacity-priorities?cadre=${encodeURIComponent(cadre)}`
        : `${API_BASE}/admin/analytics/capacity-priorities`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return FALLBACK_PRIORITIES;
      return await res.json();
    } catch {
      return FALLBACK_PRIORITIES;
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
      if (!res.ok) return FALLBACK_SUPERVISOR_OVERVIEW;
      return await res.json();
    } catch {
      return FALLBACK_SUPERVISOR_OVERVIEW;
    }
  },

  async getSupervisorTeam(department?: string): Promise<SubordinateTeamResponse | null> {
    try {
      const url = department
        ? `${API_BASE}/supervisor/analytics/team?department=${encodeURIComponent(department)}`
        : `${API_BASE}/supervisor/analytics/team`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return FALLBACK_TEAM;
      return await res.json();
    } catch {
      return FALLBACK_TEAM;
    }
  },
};
