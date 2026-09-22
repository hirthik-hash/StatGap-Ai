/**
 * STAT-GAP AI — Frontend Diagnostic Service
 * Fetches live evaluation, misconception detection, and reasoning traces from backend.
 */
import { apiClient } from './apiClient';

export interface DiagnosticReasoningSignal {
  signal: string;
  value: string | number;
  interpretation: string;
}

export interface DiagnosticReasoningTrace {
  diagnosisType: string;
  overallScore: number;
  gapPoints: number;
  severity: string;
  signals: DiagnosticReasoningSignal[];
  conclusion: string;
  hasPrerequisites: boolean;
}

export interface DiagnosticMisconception {
  id: string;
  title: string;
  concept: string;
  explanation: string;
  detectionRule: string;
  confidenceLevel: string;
  counterExample: string;
  remediationHint: string;
}

export interface DiagnosticEvaluation {
  competencyId: string;
  competencyName: string;
  score: number;
  requiredScore: number;
  gapPoints: number;
  status: 'competent' | 'moderate_gap' | 'critical_gap' | 'inconclusive';
  diagnosisType: 'basic_concept' | 'statistical_misconception' | 'integrated_concept' | 'application_gap' | 'insufficient_evidence';
  severity: string;
  confidence: number;
  explanation: string;
  evidenceReferences?: {
    assessment_score?: number;
    quiz_accuracy?: number;
    practical_performance?: number;
    repeated_errors?: number;
    confidence_pattern?: string;
    assessment_ratio?: string;
  };
  reasoningTrace?: DiagnosticReasoningTrace;
  rootCauseCompetencyId?: string;
  misconception?: DiagnosticMisconception;
  evaluatedAt: string;
}

export class DiagnosticService {
  /**
   * Fetches evaluated diagnostics for all statutory competencies for the authenticated officer.
   */
  public static async getOfficerDiagnostics(): Promise<DiagnosticEvaluation[]> {
    return apiClient.request<DiagnosticEvaluation[]>('/api/diagnostics/competencies');
  }

  /**
   * Fetches specific competency diagnosis with reasoning trace and misconception mapping.
   */
  public static async getCompetencyDiagnosis(competencyId: string): Promise<DiagnosticEvaluation> {
    return apiClient.request<DiagnosticEvaluation>(`/api/diagnostics/competencies/${encodeURIComponent(competencyId)}`);
  }

  /**
   * Forces fresh re-evaluation from persisted evidence on demand.
   */
  public static async evaluateCompetency(competencyId: string): Promise<DiagnosticEvaluation> {
    return apiClient.request<DiagnosticEvaluation>(
      `/api/diagnostics/competencies/${encodeURIComponent(competencyId)}/evaluate`,
      { method: 'POST' }
    );
  }
}
