/**
 * Training Intervention Service — Phase 7
 * Bridges the frontend to the STAT-GAP AI Training Intervention Optimizer & Provider Adapters.
 */

const API_BASE = '/api';

export interface ProviderStatus {
  provider: string;
  name: string;
  mode: string;
  is_configured: boolean;
  description: string;
}

export interface TrainingResource {
  id: string;
  provider: 'igot' | 'nssta' | 'tpac' | string;
  external_reference_id: string;
  title: string;
  description: string;
  competency_id: string;
  subskills: string[];
  prerequisites: string[];
  duration_hours: number;
  delivery_mode: string;
  difficulty_level: string;
  programme_priority: string;
  target_cadre: string[];
  syllabus_highlights: string[];
  status: string;
  is_mock: boolean;
  metadata?: Record<string, any>;
}

export interface FactorScoreDetail {
  raw_score: number;
  weight: number;
  weighted_score: number;
  explanation: string;
}

export interface InterventionRecommendation {
  resource: TrainingResource;
  score: number;
  reasons: string[];
  addresses_priority_gap: boolean;
  aligned_competency_name: string;
  addresses_task_bottleneck: boolean;
  bottleneck_task_title?: string | null;
  satisfies_prerequisites: boolean;
  missing_prerequisites: string[];
  fits_constraints: boolean;
  factor_breakdown: Record<string, FactorScoreDetail>;
}

export interface ExcludedIntervention {
  resource_id: string;
  title: string;
  provider: string;
  exclusion_reason: string;
}

export interface PersonalizedRecommendationsResponse {
  officer_id: string;
  officer_igot_id: string;
  officer_name: string;
  cadre: string;
  priority_gap_competency_id?: string | null;
  priority_gap_competency_name?: string | null;
  priority_gap_severity?: string | null;
  priority_gap_value?: number | null;
  active_bottleneck_task?: string | null;
  active_bottleneck_task_title?: string | null;
  recommendations: InterventionRecommendation[];
  excluded_interventions: ExcludedIntervention[];
  total_candidates_evaluated: number;
  providers_status: ProviderStatus[];
  optimizer_disclaimer: string;
  evaluated_at: string;
}

export interface TrainingConstraintInput {
  max_duration_hours?: number;
  preferred_delivery_modes?: string[];
  target_task_id?: string;
  provider_filter?: string[];
  max_recommendations?: number;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('statgap_token') || sessionStorage.getItem('statgap_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const TrainingService = {
  async getProviderStatuses(): Promise<ProviderStatus[]> {
    try {
      const res = await fetch(`${API_BASE}/training/providers/status`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to fetch provider status: ${res.status}`);
      return await res.json();
    } catch {
      return [
        {
          provider: 'igot',
          name: 'iGOT Karmayogi Bharat',
          mode: 'mock',
          is_configured: true,
          description: 'Mock iGOT Adapter active (Prototype Sandbox).',
        },
        {
          provider: 'nssta',
          name: 'National Statistical Systems Training Academy (NSSTA)',
          mode: 'mock',
          is_configured: true,
          description: 'NSSTA Greater Noida residential & blended catalogue active.',
        },
        {
          provider: 'tpac',
          name: 'TPAC Approved Curriculum',
          mode: 'catalogue',
          is_configured: true,
          description: 'TPAC statutory syllabus standards & training priorities active.',
        },
      ];
    }
  },

  async getMyRecommendations(): Promise<PersonalizedRecommendationsResponse | null> {
    try {
      const res = await fetch(`${API_BASE}/training/recommendations/me`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async optimizeRecommendations(
    constraints: TrainingConstraintInput
  ): Promise<PersonalizedRecommendationsResponse | null> {
    try {
      const res = await fetch(`${API_BASE}/training/recommendations/me/optimize`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(constraints),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async listResources(filters?: {
    provider?: string;
    competency_id?: string;
  }): Promise<TrainingResource[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.provider) params.append('provider', filters.provider);
      if (filters?.competency_id) params.append('competency_id', filters.competency_id);

      const res = await fetch(`${API_BASE}/training/resources?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async enroll(resourceId: string): Promise<{ status: string; message: string; is_mock: boolean }> {
    const res = await fetch(`${API_BASE}/training/enroll`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ resource_id: resourceId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Enrollment failed' }));
      throw new Error(err.detail || 'Enrollment failed');
    }
    return await res.json();
  },
};
