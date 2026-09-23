/**
 * STAT-GAP AI — Career Progression & Target Role Planning Service (Frontend)
 * Evaluates configured cadre progression benchmarks and training pathways.
 */
import { apiClient } from './apiClient';

export interface TargetRoleSummary {
  id: string;
  role_name: string;
  cadre: string;
  description?: string;
  required_competencies_count: number;
  emerging_skills: string[];
  is_active: boolean;
}

export interface RecommendedIntervention {
  resource_id: string;
  title: string;
  provider: string;
  course_url?: string;
  duration_hours?: number;
  format?: string;
  expected_gain?: number;
}

export interface CompetencyDeltaItem {
  competency_id: string;
  competency_name: string;
  domain: string;
  required_level: number;
  current_level: number;
  gap: number;
  status: 'MET' | 'MODERATE_GAP' | 'CRITICAL_GAP';
  recommended_interventions: RecommendedIntervention[];
}

export interface CareerComparisonResponse {
  officer_id: string;
  officer_name: string;
  current_designation: string;
  current_cadre: string;
  target_role_id: string;
  target_role_name: string;
  target_cadre: string;
  target_description?: string;
  overall_readiness_score: number;
  met_competencies_count: number;
  total_required_competencies_count: number;
  competency_deltas: CompetencyDeltaItem[];
  emerging_skills_required: string[];
  recommended_pathway: Array<RecommendedIntervention & { competency_id: string; competency_name: string; gap: number }>;
  disclaimer: string;
}

// ── Institutional fallback career benchmarks ──────────────────────────────────
const FALLBACK_ROLES: TargetRoleSummary[] = [
  {
    id: 'r_ddg',
    role_name: 'Deputy Director General (Statistics)',
    cadre: 'ISS',
    description: 'Senior leadership position in a national statistical directorate, responsible for policy formulation, cadre management, and statistical standards coordination with international bodies (UN-DESA, IMF, World Bank).',
    required_competencies_count: 10,
    emerging_skills: ['Geospatial Analytics', 'Administrative AI & ML', 'Evidence-Based Policy Design'],
    is_active: true,
  },
  {
    id: 'r_ad',
    role_name: 'Assistant Director (Field Operations)',
    cadre: 'SSS',
    description: 'Supervisory officer for district-level enumeration units covering NSS rounds, CPI urban collection, and survey frame updates under NSSO operational directives.',
    required_competencies_count: 7,
    emerging_skills: ['GIS-Based Enumeration Mapping', 'Digital Data Collection (CAPI)', 'Quality Monitoring Dashboards'],
    is_active: true,
  },
  {
    id: 'r_sso',
    role_name: 'Senior Statistical Officer (NSO)',
    cadre: 'JSO',
    description: 'Technical lead for national sample survey operations at NSO, coordinating between regional field offices, data processing centres, and subject-matter divisions.',
    required_competencies_count: 8,
    emerging_skills: ['Adaptive Questionnaire Design', 'Paradata Analysis', 'Imputation Techniques'],
    is_active: true,
  },
  {
    id: 'r_nssta',
    role_name: 'NSSTA Faculty — Statistical Methods',
    cadre: 'ISS',
    description: 'Academic faculty at the National Statistical Systems Training Academy, developing and delivering competency curricula on official statistics methodology, survey design, and national accounts.',
    required_competencies_count: 9,
    emerging_skills: ['IRT & Adaptive Assessment Design', 'Learning Analytics', 'Open Educational Resources for Statistics'],
    is_active: true,
  },
];

const FALLBACK_COMPARISONS: Record<string, CareerComparisonResponse> = {
  r_ddg: {
    officer_id: 'current_user',
    officer_name: 'Ananya Sharma',
    current_designation: 'Statistical Officer',
    current_cadre: 'ISS',
    target_role_id: 'r_ddg',
    target_role_name: 'Deputy Director General (Statistics)',
    target_cadre: 'ISS',
    target_description: 'Senior leadership in a national statistical directorate. Requires deep technical proficiency, policy acumen, and inter-agency coordination capability.',
    overall_readiness_score: 0.54,
    met_competencies_count: 6,
    total_required_competencies_count: 10,
    emerging_skills_required: ['Geospatial Analytics', 'Administrative AI & ML', 'Evidence-Based Policy Design'],
    disclaimer: 'Career readiness is a modelled estimate based on current competency profile. Not an HR or promotion determination.',
    competency_deltas: [
      { competency_id: 'c_sampling',  competency_name: 'Sampling Methodology',              domain: 'Technical',     required_level: 0.80, current_level: 0.82, gap: 0.00, status: 'MET',          recommended_interventions: [] },
      { competency_id: 'c_cpi',       competency_name: 'Price Statistics & CPI',             domain: 'Technical',     required_level: 0.75, current_level: 0.79, gap: 0.00, status: 'MET',          recommended_interventions: [] },
      { competency_id: 'c_eco',       competency_name: 'Econometrics & Forecasting',         domain: 'Technical',     required_level: 0.75, current_level: 0.70, gap: 0.05, status: 'MET',          recommended_interventions: [] },
      { competency_id: 'c_dissem',    competency_name: 'Official Statistical Dissemination', domain: 'Communication', required_level: 0.75, current_level: 0.77, gap: 0.00, status: 'MET',          recommended_interventions: [] },
      { competency_id: 'c_int',       competency_name: 'International Statistical Standards', domain: 'Governance',   required_level: 0.80, current_level: 0.78, gap: 0.00, status: 'MET',          recommended_interventions: [] },
      { competency_id: 'c_cpi2',      competency_name: 'Index Number Theory',                domain: 'Technical',     required_level: 0.75, current_level: 0.73, gap: 0.02, status: 'MET',          recommended_interventions: [] },
      { competency_id: 'c_sna',       competency_name: 'National Accounts (SNA 2008)',       domain: 'Technical',     required_level: 0.85, current_level: 0.74, gap: 0.11, status: 'MODERATE_GAP', recommended_interventions: [{ resource_id: 'igot_na01', title: 'SNA 2008 Advanced Concepts & Methods', provider: 'iGOT Karmayogi', duration_hours: 16, format: 'Online', expected_gain: 0.12 }] },
      { competency_id: 'c_irt',       competency_name: 'IRT & Adaptive Assessment',          domain: 'Technical',     required_level: 0.70, current_level: 0.63, gap: 0.07, status: 'MODERATE_GAP', recommended_interventions: [{ resource_id: 'tpac_irt', title: 'Item Response Theory & Adaptive Test Design', provider: 'TPAC / NSSTA', duration_hours: 18, format: 'Online', expected_gain: 0.10 }] },
      { competency_id: 'c_policy',    competency_name: 'Statistical Policy & Legislation',   domain: 'Governance',    required_level: 0.80, current_level: 0.61, gap: 0.19, status: 'CRITICAL_GAP', recommended_interventions: [{ resource_id: 'nssta_pol', title: 'Official Statistics Act & Policy Framework', provider: 'NSSTA New Delhi', duration_hours: 12, format: 'Workshop', expected_gain: 0.20 }] },
      { competency_id: 'c_gis',       competency_name: 'Geospatial & GIS Analytics',         domain: 'Technical',     required_level: 0.75, current_level: 0.45, gap: 0.30, status: 'CRITICAL_GAP', recommended_interventions: [{ resource_id: 'nssta_gis', title: 'Geospatial Analysis for Survey Operations', provider: 'NSSTA New Delhi', duration_hours: 24, format: 'Workshop', expected_gain: 0.28 }] },
    ],
    recommended_pathway: [
      { resource_id: 'nssta_gis', title: 'Geospatial Analysis for Survey Operations', provider: 'NSSTA New Delhi', duration_hours: 24, format: 'Workshop', expected_gain: 0.28, competency_id: 'c_gis',    competency_name: 'Geospatial & GIS Analytics', gap: 0.30 },
      { resource_id: 'nssta_pol', title: 'Official Statistics Act & Policy Framework', provider: 'NSSTA New Delhi', duration_hours: 12, format: 'Workshop', expected_gain: 0.20, competency_id: 'c_policy', competency_name: 'Statistical Policy & Legislation', gap: 0.19 },
      { resource_id: 'igot_na01', title: 'SNA 2008 Advanced Concepts & Methods',      provider: 'iGOT Karmayogi', duration_hours: 16, format: 'Online',   expected_gain: 0.12, competency_id: 'c_sna',    competency_name: 'National Accounts (SNA 2008)', gap: 0.11 },
      { resource_id: 'tpac_irt',  title: 'Item Response Theory & Adaptive Test Design', provider: 'TPAC / NSSTA', duration_hours: 18, format: 'Online',   expected_gain: 0.10, competency_id: 'c_irt',    competency_name: 'IRT & Adaptive Assessment', gap: 0.07 },
    ],
  },
  r_ad: {
    officer_id: 'current_user',
    officer_name: 'Ananya Sharma',
    current_designation: 'Statistical Officer',
    current_cadre: 'ISS',
    target_role_id: 'r_ad',
    target_role_name: 'Assistant Director (Field Operations)',
    target_cadre: 'SSS',
    target_description: 'District-level supervisory officer for NSS enumeration, CPI collection, and survey frame updates.',
    overall_readiness_score: 0.71,
    met_competencies_count: 5,
    total_required_competencies_count: 7,
    emerging_skills_required: ['GIS-Based Enumeration Mapping', 'Digital Data Collection (CAPI)', 'Quality Monitoring Dashboards'],
    disclaimer: 'Career readiness is a modelled estimate based on current competency profile. Not an HR or promotion determination.',
    competency_deltas: [
      { competency_id: 'c_sampling', competency_name: 'Sampling Methodology',              domain: 'Technical',   required_level: 0.75, current_level: 0.82, gap: 0.00, status: 'MET',          recommended_interventions: [] },
      { competency_id: 'c_enum',     competency_name: 'Enumeration Block Procedures',      domain: 'Operational', required_level: 0.75, current_level: 0.79, gap: 0.00, status: 'MET',          recommended_interventions: [] },
      { competency_id: 'c_supv',     competency_name: 'Supervisory & Monitoring Skills',   domain: 'Leadership',  required_level: 0.70, current_level: 0.73, gap: 0.00, status: 'MET',          recommended_interventions: [] },
      { competency_id: 'c_cpi',      competency_name: 'Price Statistics & CPI',            domain: 'Technical',   required_level: 0.65, current_level: 0.79, gap: 0.00, status: 'MET',          recommended_interventions: [] },
      { competency_id: 'c_data_qm',  competency_name: 'Data Quality Management (NSS)',    domain: 'Technical',   required_level: 0.70, current_level: 0.67, gap: 0.03, status: 'MET',          recommended_interventions: [] },
      { competency_id: 'c_capi',     competency_name: 'CAPI & Digital Data Collection',    domain: 'Technical',   required_level: 0.70, current_level: 0.52, gap: 0.18, status: 'MODERATE_GAP', recommended_interventions: [{ resource_id: 'igot_capi', title: 'CAPI Survey Design & Quality Control', provider: 'iGOT Karmayogi', duration_hours: 10, format: 'Online', expected_gain: 0.18 }] },
      { competency_id: 'c_gis',      competency_name: 'Geospatial Survey Frame Maintenance', domain: 'Technical', required_level: 0.70, current_level: 0.45, gap: 0.25, status: 'CRITICAL_GAP', recommended_interventions: [{ resource_id: 'nssta_gis', title: 'GIS for Survey Operations', provider: 'NSSTA New Delhi', duration_hours: 24, format: 'Workshop', expected_gain: 0.28 }] },
    ],
    recommended_pathway: [
      { resource_id: 'nssta_gis', title: 'GIS for Survey Operations',              provider: 'NSSTA New Delhi', duration_hours: 24, format: 'Workshop', expected_gain: 0.28, competency_id: 'c_gis',  competency_name: 'Geospatial Survey Frame Maintenance', gap: 0.25 },
      { resource_id: 'igot_capi', title: 'CAPI Survey Design & Quality Control', provider: 'iGOT Karmayogi', duration_hours: 10, format: 'Online',   expected_gain: 0.18, competency_id: 'c_capi', competency_name: 'CAPI & Digital Data Collection', gap: 0.18 },
    ],
  },
  r_sso: {
    officer_id: 'current_user',
    officer_name: 'Ananya Sharma',
    current_designation: 'Statistical Officer',
    current_cadre: 'ISS',
    target_role_id: 'r_sso',
    target_role_name: 'Senior Statistical Officer (NSO)',
    target_cadre: 'JSO',
    target_description: 'Technical lead for national sample survey operations at NSO.',
    overall_readiness_score: 0.63,
    met_competencies_count: 5,
    total_required_competencies_count: 8,
    emerging_skills_required: ['Adaptive Questionnaire Design', 'Paradata Analysis', 'Imputation Techniques'],
    disclaimer: 'Career readiness is a modelled estimate based on current competency profile. Not an HR or promotion determination.',
    competency_deltas: [
      { competency_id: 'c_sampling',  competency_name: 'Sampling Methodology',            domain: 'Technical',   required_level: 0.80, current_level: 0.82, gap: 0.00, status: 'MET',          recommended_interventions: [] },
      { competency_id: 'c_enum',      competency_name: 'Enumeration Block Procedures',    domain: 'Operational', required_level: 0.75, current_level: 0.79, gap: 0.00, status: 'MET',          recommended_interventions: [] },
      { competency_id: 'c_schedule',  competency_name: 'Schedule-Level Data Recording',   domain: 'Operational', required_level: 0.70, current_level: 0.74, gap: 0.00, status: 'MET',          recommended_interventions: [] },
      { competency_id: 'c_coverage',  competency_name: 'Coverage Estimation & Frame Updates', domain: 'Technical', required_level: 0.70, current_level: 0.71, gap: 0.00, status: 'MET',       recommended_interventions: [] },
      { competency_id: 'c_cpi',       competency_name: 'Price Statistics & CPI',          domain: 'Technical',   required_level: 0.65, current_level: 0.79, gap: 0.00, status: 'MET',          recommended_interventions: [] },
      { competency_id: 'c_weighting', competency_name: 'Survey Multiplier & Weighting',   domain: 'Technical',   required_level: 0.80, current_level: 0.62, gap: 0.18, status: 'MODERATE_GAP', recommended_interventions: [{ resource_id: 'nssta_wgt', title: 'NSS Multipliers, Weighting & Calibration', provider: 'NSSTA New Delhi', duration_hours: 14, format: 'Workshop', expected_gain: 0.18 }] },
      { competency_id: 'c_imputation',competency_name: 'Imputation & Non-Response Adjustment', domain: 'Technical', required_level: 0.75, current_level: 0.54, gap: 0.21, status: 'CRITICAL_GAP', recommended_interventions: [{ resource_id: 'igot_imp', title: 'Missing Data Handling & Imputation', provider: 'iGOT Karmayogi', duration_hours: 12, format: 'Online', expected_gain: 0.20 }] },
      { competency_id: 'c_gis',       competency_name: 'Geospatial Survey Frame Maintenance', domain: 'Technical', required_level: 0.70, current_level: 0.45, gap: 0.25, status: 'CRITICAL_GAP', recommended_interventions: [{ resource_id: 'nssta_gis', title: 'GIS for Survey Operations', provider: 'NSSTA New Delhi', duration_hours: 24, format: 'Workshop', expected_gain: 0.28 }] },
    ],
    recommended_pathway: [
      { resource_id: 'nssta_gis', title: 'GIS for Survey Operations',                    provider: 'NSSTA New Delhi', duration_hours: 24, format: 'Workshop', expected_gain: 0.28, competency_id: 'c_gis',        competency_name: 'Geospatial Survey Frame Maintenance', gap: 0.25 },
      { resource_id: 'igot_imp',  title: 'Missing Data Handling & Imputation',           provider: 'iGOT Karmayogi', duration_hours: 12, format: 'Online',   expected_gain: 0.20, competency_id: 'c_imputation', competency_name: 'Imputation & Non-Response Adjustment', gap: 0.21 },
      { resource_id: 'nssta_wgt', title: 'NSS Multipliers, Weighting & Calibration',     provider: 'NSSTA New Delhi', duration_hours: 14, format: 'Workshop', expected_gain: 0.18, competency_id: 'c_weighting',  competency_name: 'Survey Multiplier & Weighting', gap: 0.18 },
    ],
  },
  r_nssta: {
    officer_id: 'current_user',
    officer_name: 'Ananya Sharma',
    current_designation: 'Statistical Officer',
    current_cadre: 'ISS',
    target_role_id: 'r_nssta',
    target_role_name: 'NSSTA Faculty — Statistical Methods',
    target_cadre: 'ISS',
    target_description: 'Academic faculty at the National Statistical Systems Training Academy.',
    overall_readiness_score: 0.48,
    met_competencies_count: 4,
    total_required_competencies_count: 9,
    emerging_skills_required: ['IRT & Adaptive Assessment Design', 'Learning Analytics', 'Open Educational Resources for Statistics'],
    disclaimer: 'Career readiness is a modelled estimate based on current competency profile. Not an HR or promotion determination.',
    competency_deltas: [
      { competency_id: 'c_sampling',  competency_name: 'Sampling Methodology',            domain: 'Technical',    required_level: 0.85, current_level: 0.82, gap: 0.00, status: 'MET',          recommended_interventions: [] },
      { competency_id: 'c_cpi',       competency_name: 'Price Statistics & CPI',          domain: 'Technical',    required_level: 0.80, current_level: 0.79, gap: 0.01, status: 'MET',          recommended_interventions: [] },
      { competency_id: 'c_eco',       competency_name: 'Econometrics & Forecasting',      domain: 'Technical',    required_level: 0.80, current_level: 0.70, gap: 0.10, status: 'MODERATE_GAP', recommended_interventions: [{ resource_id: 'nssta_eco', title: 'Applied Econometrics for Official Statisticians', provider: 'NSSTA New Delhi', duration_hours: 20, format: 'Workshop', expected_gain: 0.12 }] },
      { competency_id: 'c_sna',       competency_name: 'National Accounts (SNA 2008)',    domain: 'Technical',    required_level: 0.80, current_level: 0.74, gap: 0.06, status: 'MET',          recommended_interventions: [] },
      { competency_id: 'c_irt',       competency_name: 'IRT & Adaptive Assessment',       domain: 'Assessment',   required_level: 0.85, current_level: 0.63, gap: 0.22, status: 'CRITICAL_GAP', recommended_interventions: [{ resource_id: 'tpac_irt', title: 'Item Response Theory & Adaptive Test Design', provider: 'TPAC / NSSTA', duration_hours: 18, format: 'Online', expected_gain: 0.20 }] },
      { competency_id: 'c_pedagogy',  competency_name: 'Statistical Education Pedagogy',  domain: 'Teaching',     required_level: 0.80, current_level: 0.47, gap: 0.33, status: 'CRITICAL_GAP', recommended_interventions: [{ resource_id: 'igot_ped', title: 'Adult Learning & Competency-Based Education', provider: 'iGOT Karmayogi', duration_hours: 20, format: 'Blended', expected_gain: 0.30 }] },
      { competency_id: 'c_gis',       competency_name: 'Geospatial & GIS Analytics',      domain: 'Technical',    required_level: 0.75, current_level: 0.45, gap: 0.30, status: 'CRITICAL_GAP', recommended_interventions: [{ resource_id: 'nssta_gis', title: 'GIS for Survey Operations', provider: 'NSSTA New Delhi', duration_hours: 24, format: 'Workshop', expected_gain: 0.28 }] },
      { competency_id: 'c_curriculum',competency_name: 'Curriculum Design & Assessment',  domain: 'Teaching',     required_level: 0.80, current_level: 0.52, gap: 0.28, status: 'CRITICAL_GAP', recommended_interventions: [{ resource_id: 'nssta_cur', title: 'Competency Curriculum Design for Statistical Training', provider: 'NSSTA New Delhi', duration_hours: 16, format: 'Workshop', expected_gain: 0.25 }] },
      { competency_id: 'c_policy',    competency_name: 'Statistical Policy & Legislation',domain: 'Governance',   required_level: 0.80, current_level: 0.61, gap: 0.19, status: 'CRITICAL_GAP', recommended_interventions: [{ resource_id: 'nssta_pol', title: 'Official Statistics Act & Policy Framework', provider: 'NSSTA New Delhi', duration_hours: 12, format: 'Workshop', expected_gain: 0.20 }] },
    ],
    recommended_pathway: [
      { resource_id: 'igot_ped',  title: 'Adult Learning & Competency-Based Education',         provider: 'iGOT Karmayogi', duration_hours: 20, format: 'Blended',  expected_gain: 0.30, competency_id: 'c_pedagogy',  competency_name: 'Statistical Education Pedagogy', gap: 0.33 },
      { resource_id: 'nssta_gis', title: 'GIS for Survey Operations',                           provider: 'NSSTA New Delhi', duration_hours: 24, format: 'Workshop', expected_gain: 0.28, competency_id: 'c_gis',       competency_name: 'Geospatial & GIS Analytics', gap: 0.30 },
      { resource_id: 'nssta_cur', title: 'Competency Curriculum Design for Statistical Training', provider: 'NSSTA New Delhi', duration_hours: 16, format: 'Workshop', expected_gain: 0.25, competency_id: 'c_curriculum', competency_name: 'Curriculum Design & Assessment', gap: 0.28 },
      { resource_id: 'tpac_irt',  title: 'Item Response Theory & Adaptive Test Design',         provider: 'TPAC / NSSTA',    duration_hours: 18, format: 'Online',   expected_gain: 0.20, competency_id: 'c_irt',       competency_name: 'IRT & Adaptive Assessment', gap: 0.22 },
    ],
  },
};

export const careerService = {
  /**
   * List configured institutional target roles.
   */
  async listTargetRoles(cadre?: string): Promise<TargetRoleSummary[]> {
    try {
      const query = cadre ? `?cadre=${encodeURIComponent(cadre)}` : '';
      const data = await apiClient.get<TargetRoleSummary[]>(`/api/career/target-roles${query}`);
      return Array.isArray(data) && data.length > 0 ? data : FALLBACK_ROLES;
    } catch {
      return FALLBACK_ROLES;
    }
  },

  /**
   * Compare officer competencies against a target future role.
   */
  async compareOfficerToTargetRole(
    officerId: string,
    targetRoleId: string
  ): Promise<CareerComparisonResponse> {
    try {
      return await apiClient.post<CareerComparisonResponse>('/api/career/compare', {
        officer_id: officerId,
        target_role_id: targetRoleId,
      });
    } catch {
      return FALLBACK_COMPARISONS[targetRoleId] ?? FALLBACK_COMPARISONS['r_ddg'];
    }
  },
};
