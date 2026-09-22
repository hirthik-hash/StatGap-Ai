/**
 * STAT-GAP AI — AI Assistant Service (Frontend)
 * Role-Aware, Citation-Backed Statistical & Pedagogical Inquiries.
 */
import { apiClient } from './apiClient';

export interface AssistantCitation {
  source_id: string;
  source_type: string;
  title: string;
  section?: string;
  url?: string;
  relevance_score?: number;
}

export interface AssistantFollowup {
  label: string;
  query: string;
  context_type?: string;
}

export interface AssistantQueryRequest {
  query: string;
  officer_id?: string;
  context_type?: string;
  conversation_history?: Array<{ role: string; content: string }>;
}

export interface AssistantQueryResponse {
  answer: string;
  citations: AssistantCitation[];
  grounding_status: 'GROUNDED' | 'WEAKLY_GROUNDED' | 'INSUFFICIENT_EVIDENCE';
  confidence_score: number;
  followup_actions: AssistantFollowup[];
  suggested_queries: string[];
  disclaimer: string;
}

export interface SuggestionItem {
  category: string;
  title: string;
  query: string;
  icon?: string;
}

export interface SuggestionsResponse {
  role_title: string;
  cadre: string;
  suggestions: SuggestionItem[];
}

export const aiAssistantService = {
  /**
   * Submit an inquiry to the role-aware, citation-backed AI assistant.
   */
  async askAssistant(request: AssistantQueryRequest): Promise<AssistantQueryResponse> {
    return apiClient.post<AssistantQueryResponse>('/api/ai/assistant/chat', request);
  },

  /**
   * Retrieve role-aware proactive suggestions for the current officer.
   */
  async getSuggestions(officerId?: string): Promise<SuggestionsResponse> {
    const query = officerId ? `?officer_id=${encodeURIComponent(officerId)}` : '';
    return apiClient.get<SuggestionsResponse>(`/api/ai/assistant/suggestions${query}`);
  },
};
