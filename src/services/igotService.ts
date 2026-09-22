/**
 * iGOT Integration API Service for STAT-GAP AI Frontend.
 * Interacts with backend /api/igot endpoints.
 */
import { apiClient } from './apiClient';

export interface IGOTStatusData {
  mode: 'mock' | 'authorized';
  adapter_name: string;
  is_configured: boolean;
  description: string;
}

export interface IGOTLearningRecordData {
  source_system: string;
  external_reference_id: string;
  officer_igot_id: string;
  course_id: string;
  course_title: string;
  competency_hint?: string;
  completion_status: string;
  score: number;
  completion_date: string;
  metadata: Record<string, unknown>;
}

export interface IGOTImportResultData {
  status: string;
  officer_igot_id: string;
  total_fetched: number;
  imported_count: number;
  skipped_count: number;
  correlation_id?: string;
}

export interface IGOTSyncResultData {
  status: 'pending' | 'synced' | 'failed' | 'not_configured';
  operation: string;
  external_reference?: string;
  local_reference: string;
  timestamp: string;
  error_code?: string;
  message: string;
  correlation_id?: string;
}

export interface IGOTAuditHistoryItem {
  id: string;
  event_type: string;
  actor: string;
  event_data: Record<string, unknown>;
  timestamp: string;
}

export const IgotApiService = {
  async getStatus(): Promise<IGOTStatusData> {
    return apiClient.get<IGOTStatusData>('/api/igot/status');
  },

  async getAvailableRecords(): Promise<IGOTLearningRecordData[]> {
    return apiClient.get<IGOTLearningRecordData[]>('/api/igot/records');
  },

  async importRecords(): Promise<IGOTImportResultData> {
    return apiClient.post<IGOTImportResultData>('/api/igot/import', {});
  },

  async exportVerification(competencyId: string): Promise<IGOTSyncResultData> {
    return apiClient.post<IGOTSyncResultData>(`/api/igot/export/${competencyId}`, {});
  },

  async getSyncHistory(): Promise<IGOTAuditHistoryItem[]> {
    return apiClient.get<IGOTAuditHistoryItem[]>('/api/igot/sync-history');
  },
};
