/**
 * Assessment Service: Interfaces with backend Adaptive Assessment API.
 * NO SILENT FALLBACK: If backend assessment API fails, errors are propagated directly.
 */
import { apiClient } from './apiClient';

export interface AdaptiveItem {
  id: string;
  competencyId: string;
  questionType: string;
  stem: string;
  options: string[];
  difficultyLabel: 'easy' | 'medium' | 'hard';
  cognitiveLevel: string;
}

export interface AssessmentFinalResult {
  sessionId: string;
  targetCompetencyId: string;
  targetCompetencyName: string;
  itemsAnswered: number;
  correctCount: number;
  accuracyPercentage: number;
  initialTheta: number;
  finalTheta: number;
  standardError: number;
  abilityBand: string;
  stoppingReason: string;
  integratedPerformance: number | null;
  misconceptionSignalsDetected: number;
  evaluatedCompetencyScore: number | null;
  newDiagnosisType: string | null;
}

export interface ResponseOutcome {
  isCorrect: boolean;
  correctAnswer: number;
  explanation: string;
  thetaAfter: number;
  standardError: number;
  itemsAnswered: number;
  nextItem: AdaptiveItem | null;
  isCompleted: boolean;
  result: AssessmentFinalResult | null;
}

export interface StartSessionResponse {
  sessionId: string;
  targetCompetencyId: string;
  initialTheta: number;
  status: string;
  firstItem: AdaptiveItem;
}

export const AssessmentService = {
  async startAssessment(targetCompetencyId: string): Promise<StartSessionResponse> {
    const data = await apiClient.post<StartSessionResponse>('/api/assessments/start', {
      target_competency_id: targetCompetencyId,
    });
    return data;
  },

  async submitResponse(
    sessionId: string,
    itemId: string,
    selectedAnswer: number,
    confidence: string,
    responseTimeMs: number = 0
  ): Promise<ResponseOutcome> {
    const data = await apiClient.post<ResponseOutcome>(`/api/assessments/${sessionId}/responses`, {
      itemId,
      selectedAnswer,
      confidence,
      responseTimeMs,
    });
    return data;
  },

  async abandonSession(sessionId: string): Promise<void> {
    await apiClient.post(`/api/assessments/${sessionId}/abandon`, {});
  },

  async getResult(sessionId: string): Promise<AssessmentFinalResult> {
    const data = await apiClient.get<AssessmentFinalResult>(`/api/assessments/${sessionId}/result`);
    return data;
  },
};
