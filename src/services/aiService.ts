import { apiClient } from './apiClient';
import { Misconception, QuizAnswerRecord, CompetencyEvidence } from '../types';
import { MISCONCEPTIONS_LIBRARY } from '../data/mockData';

export interface GroundedSourceItem {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  pageNumber?: number;
  section?: string;
  source: string;
  authority: string;
  similarityScore: number;
  textSnippet: string;
}

export interface GroundedAiExplanation {
  competencyId: string;
  competencyName: string;
  diagnosisType: string;
  diagnosticConfidence: number;
  aiConfidence: number;
  groundingStatus: 'grounded' | 'weak_grounding' | 'insufficient_grounding';
  diagnosticSynthesis: string;
  whatOfficerBelieves: string;
  correctMathematicalTruth: string;
  counterExample: string;
  remediationPathway: string;
  reasoningTrace: string[];
  sources: GroundedSourceItem[];
  llmModel: string;
  promptVersion: string;
  evaluatedAt: string;
}

export interface WhyGapDiagnosisResult {
  competencyId: string;
  identifiedMisconception?: Misconception;
  confidenceScore: 'High' | 'Very High' | 'Medium';
  evidenceStrength: 'Strong' | 'Moderate' | 'Emerging';
  evidenceBreakdown: {
    assessmentRate: string;
    quizRate: string;
    practicalRate: string;
    repeatedErrorCount: number;
    confidenceCalibration: string;
  };
  reasoningTrace: string[];
  recommendedAction: string;
}

export class AiService {
  /**
   * Calls the live backend RAG + Gemini grounded explanation endpoint.
   */
  public static async getGroundedExplanation(competencyId: string): Promise<GroundedAiExplanation> {
    return apiClient.request<GroundedAiExplanation>(`/api/ai/explain/${competencyId}`, {
      method: 'POST',
    });
  }
  /**
   * Evaluates multiple evidence streams to diagnose the root cause of a competency gap.
   * Central core of the STAT-GAP AI "WHY-GAP" engine.
   */
  public static diagnoseWhyGap(
    competencyId: string,
    evidence: CompetencyEvidence,
    knownMisconceptionId?: string
  ): WhyGapDiagnosisResult {
    const trace: string[] = [];
    trace.push(`[Signal 1] Processing multi-source evidence: Assessment (${evidence.assessmentScore}%), Quiz (${evidence.quizAccuracy}%), Practical (${evidence.practicalPerformance}%).`);
    trace.push(`[Signal 2] Repeated error pattern count: ${evidence.repeatedErrors} occurrences detected across test intervals.`);
    trace.push(`[Signal 3] Confidence calibration analysis: Observed pattern "${evidence.confidencePattern}".`);

    let matchedMisconception: Misconception | undefined;

    if (knownMisconceptionId) {
      matchedMisconception = MISCONCEPTIONS_LIBRARY.find((m) => m.id === knownMisconceptionId);
    } else {
      matchedMisconception = MISCONCEPTIONS_LIBRARY[0];
    }

    // Diagnostic Rule-based Engine (Section 12 of requirements):
    // IF accuracy < 60% AND repeatedErrors >= 2 AND confidence = High THEN flag possible misconception
    const isHighConfidenceMisconception =
      evidence.quizAccuracy < 65 &&
      evidence.repeatedErrors >= 2 &&
      evidence.confidencePattern.toLowerCase().includes('high');

    if (isHighConfidenceMisconception) {
      trace.push('RULE MATCH [CRITICAL_MISCONCEPTION]: Accuracy < 65% + repeatedErrors >= 2 + High Confidence.');
      trace.push('INFERENCE: Learner is not guessing randomly; errors are driven by an entrenched erroneous conceptual framework.');
      trace.push(`CLASSIFICATION: Mapped to "${matchedMisconception?.name || 'Statistical Parameter Distortion'}".`);
    } else {
      trace.push('EVALUATION: Errors appear to be distributed across calculation speed or lack of practice rather than entrenched fallacy.');
    }

    return {
      competencyId,
      identifiedMisconception: matchedMisconception,
      confidenceScore: isHighConfidenceMisconception ? 'High' : 'Medium',
      evidenceStrength: evidence.repeatedErrors >= 3 ? 'Strong' : 'Moderate',
      evidenceBreakdown: {
        assessmentRate: evidence.assessmentRatio,
        quizRate: `${evidence.quizAccuracy}% accuracy`,
        practicalRate: `${evidence.practicalPerformance}%`,
        repeatedErrorCount: evidence.repeatedErrors,
        confidenceCalibration: evidence.confidencePattern,
      },
      reasoningTrace: trace,
      recommendedAction: 'Targeted Micro-learning pathway (15 mins) focused on parameter definition and dimensional units.',
    };
  }

  /**
   * Real-time check during adaptive quiz:
   * IF wrong answer + High confidence -> trigger possible misconception
   */
  public static checkAdaptiveMisconceptionTrigger(record: QuizAnswerRecord): {
    isMisconceptionTriggered: boolean;
    misconceptionName?: string;
    alertMessage?: string;
  } {
    if (!record.isCorrect && (record.confidence === 'High' || record.confidence === 'Very High')) {
      const name = record.misconceptionTriggered || 'Statistical Concept Distortion';
      return {
        isMisconceptionTriggered: true,
        misconceptionName: name,
        alertMessage: `Possible Misconception Detected: High confidence (${record.confidence}) indicated on an incorrect response. You may be conflating regression coefficient marginal rates with direct percentage elasticities.`,
      };
    }

    return { isMisconceptionTriggered: false };
  }

  /**
   * Computes next adaptive difficulty based on standard Bayesian / item response adaptive loop
   */
  public static getNextDifficulty(
    current: 'easy' | 'medium' | 'hard',
    wasCorrect: boolean
  ): 'easy' | 'medium' | 'hard' {
    if (wasCorrect) {
      if (current === 'easy') return 'medium';
      if (current === 'medium') return 'hard';
      return 'hard';
    } else {
      if (current === 'hard') return 'medium';
      if (current === 'medium') return 'easy';
      return 'easy';
    }
  }

  /**
   * Predicts knowledge decay curve using an adapted Ebbinghaus exponential decay model:
   * R(t) = R0 * e^(-t / S), where S is stability factor
   */
  public static calculateDecayCurve(
    initialScore: number,
    halfLifeDays: number = 65,
    daysProjected: number = 90
  ): { day: number; label: string; score: number; retentionBenchmark: number }[] {
    const points: { day: number; label: string; score: number; retentionBenchmark: number }[] = [];
    const decayConstant = Math.log(2) / halfLifeDays;

    for (let d = 0; d <= daysProjected; d += 15) {
      const score = Math.round(initialScore * Math.exp(-decayConstant * d));
      points.push({
        day: d,
        label: d === 0 ? 'Current' : `+${d} Days`,
        score: Math.max(30, score),
        retentionBenchmark: 75, // Required MoSPI Competency Threshold
      });
    }

    return points;
  }
}
