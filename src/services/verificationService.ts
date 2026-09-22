/**
 * Verification & Knowledge Decay Service: Interfaces with backend Verification, Retention, and Refresher APIs.
 */
import { apiClient } from './apiClient';

export interface CompetencyVerificationData {
  id: string;
  officer_id: string;
  competency_id: string;
  verification_status: 'unverified' | 'in_progress' | 'verified' | 'failed' | 'expired' | 'revoked';
  independent_score: number | null;
  practical_score: number | null;
  composite_score: number | null;
  assessment_session_id: string | null;
  verified_at: string | null;
  valid_until: string | null;
  criteria_details: {
    requires_practical?: boolean;
    independent_score?: number;
    independent_threshold?: number;
    independent_passed?: boolean;
    practical_score?: number | null;
    practical_threshold?: number | null;
    practical_passed?: boolean;
    composite_score?: number;
    composite_threshold?: number;
    composite_passed?: boolean;
  };
  verification_notes: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export interface PracticalVerificationData {
  id: string;
  officer_id: string;
  competency_id: string;
  practical_type: string;
  practical_score: number;
  passed: boolean;
  evaluator_notes: string | null;
  evidence_data: Record<string, unknown>;
  verified_at: string;
  created_at: string;
}

export interface KnowledgeRetentionData {
  id: string;
  officer_id: string;
  competency_id: string;
  baseline_retention: number;
  stability_days: number;
  calculated_retention: number;
  risk_level: 'low' | 'moderate' | 'at_risk' | 'critical';
  last_evaluated_at: string;
  days_since_last_interaction: number;
  decay_parameters: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RefreshRecommendationData {
  id: string;
  officer_id: string;
  competency_id: string;
  trigger_reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  recommended_modules: Array<{
    concept_id: string;
    concept_name: string;
    estimated_minutes: number;
    focus_area: string;
  }>;
  reassessment_session_id: string | null;
  triggered_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReassessmentResultData {
  reassessment_passed: boolean;
  status: string;
  composite_score: number | null;
  criteria_details: Record<string, unknown>;
}

export interface CompetencyAuditEventData {
  id: string;
  officer_id: string;
  competency_id: string | null;
  event_type: string;
  actor: string;
  event_data: Record<string, unknown>;
  timestamp: string;
}

export const VerificationApiService = {
  async getVerificationStatus(competencyId?: string, includeHistory: boolean = false): Promise<CompetencyVerificationData[]> {
    const params = new URLSearchParams();
    if (competencyId) params.append('competency_id', competencyId);
    if (includeHistory) params.append('include_history', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<CompetencyVerificationData[]>(`/api/verifications/status${query}`);
  },

  async recordPracticalVerification(payload: {
    competency_id: string;
    practical_type: string;
    practical_score: number;
    evaluator_notes?: string;
    evidence_data?: Record<string, unknown>;
  }): Promise<PracticalVerificationData> {
    return apiClient.post<PracticalVerificationData>('/api/verifications/practical', payload);
  },

  async evaluateVerification(payload: {
    competency_id: string;
    assessment_session_id?: string;
    override_independent_score?: number;
    verification_notes?: string;
  }): Promise<CompetencyVerificationData> {
    return apiClient.post<CompetencyVerificationData>('/api/verifications/evaluate', payload);
  },

  async getRetentionStatus(competencyId?: string): Promise<KnowledgeRetentionData[]> {
    const query = competencyId ? `?competency_id=${competencyId}` : '';
    return apiClient.get<KnowledgeRetentionData[]>(`/api/retention/status${query}`);
  },

  async evaluateRetention(payload: {
    competency_id: string;
    days_elapsed?: number;
    stability_days?: number;
  }): Promise<KnowledgeRetentionData> {
    return apiClient.post<KnowledgeRetentionData>('/api/retention/evaluate', payload);
  },

  async getRefreshRecommendations(statusFilter?: string): Promise<RefreshRecommendationData[]> {
    const query = statusFilter ? `?status_filter=${statusFilter}` : '';
    return apiClient.get<RefreshRecommendationData[]>(`/api/refresh/recommendations${query}`);
  },

  async triggerRefresh(payload: {
    competency_id: string;
    trigger_reason?: string;
    priority?: string;
  }): Promise<RefreshRecommendationData> {
    return apiClient.post<RefreshRecommendationData>('/api/refresh/trigger', payload);
  },

  async completeRefresh(recommendationId: string): Promise<RefreshRecommendationData> {
    return apiClient.post<RefreshRecommendationData>(`/api/refresh/${recommendationId}/complete`, {});
  },

  async processReassessment(payload: {
    competency_id: string;
    recommendation_id?: string;
    assessment_session_id?: string;
    override_independent_score?: number;
  }): Promise<ReassessmentResultData> {
    return apiClient.post<ReassessmentResultData>('/api/refresh/reassessment', payload);
  },

  async getAuditEvents(competencyId?: string, limit: number = 50): Promise<CompetencyAuditEventData[]> {
    const params = new URLSearchParams();
    if (competencyId) params.append('competency_id', competencyId);
    params.append('limit', String(limit));
    return apiClient.get<CompetencyAuditEventData[]>(`/api/audit/events?${params.toString()}`);
  },
};
