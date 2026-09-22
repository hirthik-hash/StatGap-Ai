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

export const careerService = {
  /**
   * List configured institutional target roles.
   */
  async listTargetRoles(cadre?: string): Promise<TargetRoleSummary[]> {
    const query = cadre ? `?cadre=${encodeURIComponent(cadre)}` : '';
    return apiClient.get<TargetRoleSummary[]>(`/api/career/target-roles${query}`);
  },

  /**
   * Compare officer competencies against a target future role.
   */
  async compareOfficerToTargetRole(
    officerId: string,
    targetRoleId: string
  ): Promise<CareerComparisonResponse> {
    return apiClient.post<CareerComparisonResponse>('/api/career/compare', {
      officer_id: officerId,
      target_role_id: targetRoleId,
    });
  },
};
