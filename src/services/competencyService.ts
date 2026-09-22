import { Competency, CompetencyStatus } from '../types';
import { INITIAL_COMPETENCIES } from '../data/mockData';
import { apiClient } from './apiClient';

const COMPETENCIES_STORAGE_KEY_PREFIX = 'stat_gap_competencies_';

export interface ScoringWeights {
  assessment: number;
  quiz: number;
  practical: number;
  external: number;
}

/**
 * Phase 1 Prototype Scoring Weights
 * NOTE ON SCIENTIFIC HONESTY: These weights are configurable prototype defaults
 * for architectural demonstration, NOT empirically validated government constants.
 */
export const PROTOTYPE_SCORING_WEIGHTS: ScoringWeights = {
  assessment: 0.35,
  quiz: 0.20,
  practical: 0.30,
  external: 0.15,
};

export class CompetencyService {
  /**
   * Calculates normalized score and status according to Phase 1 Target Prototype Model:
   * Current Competency = 0.35 * Assessment + 0.20 * Quiz + 0.30 * Practical + 0.15 * External
   * Gap = Required (0.75) - Current Competency
   * RED: Gap >= 0.35
   * ORANGE: 0.15 <= Gap < 0.35
   * GREEN: Gap < 0.15
   */
  public static calculateScore(
    assessment: number,
    quiz: number,
    practical: number,
    external: number = 60,
    weights: ScoringWeights = PROTOTYPE_SCORING_WEIGHTS
  ): {
    scorePercent: number;
    normalized: number;
    gap: number;
    gapBand: 'red' | 'orange' | 'green';
    status: CompetencyStatus;
  } {
    const normAssessment = Math.max(0, Math.min(100, assessment)) / 100;
    const normQuiz = Math.max(0, Math.min(100, quiz)) / 100;
    const normPractical = Math.max(0, Math.min(100, practical)) / 100;
    const normExternal = Math.max(0, Math.min(100, external)) / 100;

    const normalized =
      normAssessment * weights.assessment +
      normQuiz * weights.quiz +
      normPractical * weights.practical +
      normExternal * weights.external;

    const scorePercent = Math.round(normalized * 100);
    const requiredNormalized = 0.75;
    const gap = Math.round((requiredNormalized - normalized) * 100) / 100;

    let gapBand: 'red' | 'orange' | 'green' = 'green';
    let status: CompetencyStatus = 'competent';

    if (gap >= 0.35) {
      gapBand = 'red';
      status = 'critical_gap';
    } else if (gap >= 0.15) {
      gapBand = 'orange';
      status = 'moderate_gap';
    } else {
      gapBand = 'green';
      status = 'competent';
    }

    return { scorePercent, normalized, gap, gapBand, status };
  }

  /**
   * Synchronous cached retrieval for rapid initial render.
   */
  public static getCompetencies(userId: string): Competency[] {
    try {
      const stored = localStorage.getItem(`${COMPETENCIES_STORAGE_KEY_PREFIX}${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    // Deep clone initial competencies
    const initial = JSON.parse(JSON.stringify(INITIAL_COMPETENCIES));
    this.saveCompetencies(userId, initial);
    return initial;
  }

  /**
   * Safe Strategy: Prefers live backend API when available; falls back to
   * stored/prototype mock data if backend is offline.
   */
  public static async fetchLiveCompetencies(userId: string): Promise<Competency[]> {
    try {
      const liveList = await apiClient.get<any[]>('/api/competencies');
      if (liveList && Array.isArray(liveList) && liveList.length > 0) {
        // Merge live backend scores with client visual metadata
        const localList = this.getCompetencies(userId);
        const merged = localList.map((local) => {
          const live = liveList.find((l) => l.id === local.id);
          if (!live) return local;

          const assessment = live.evidence?.assessmentScore ?? local.evidence.assessmentScore;
          const quiz = live.evidence?.quizAccuracy ?? local.evidence.quizAccuracy;
          const practical = live.evidence?.practicalPerformance ?? local.evidence.practicalPerformance;
          const external = local.evidence.externalEvidence ?? 60;

          const { scorePercent, normalized, gap, gapBand, status } = this.calculateScore(
            assessment,
            quiz,
            practical,
            external
          );

          return {
            ...local,
            score: scorePercent,
            requiredScore: live.requiredScore || local.requiredScore,
            gapPoints: Math.max(0, Math.round(gap * 100)),
            status,
            dataSource: 'live_backend' as const,
            gapBand,
            normalizedScore: normalized,
            normalizedGap: gap,
            evidence: {
              ...local.evidence,
              assessmentScore: assessment,
              quizAccuracy: quiz,
              practicalPerformance: practical,
              externalEvidence: external,
              assessmentRatio: live.evidence?.assessmentRatio || local.evidence.assessmentRatio,
              repeatedErrors: live.evidence?.repeatedErrors ?? local.evidence.repeatedErrors,
              confidencePattern: live.evidence?.confidencePattern || local.evidence.confidencePattern,
            },
          };
        });
        this.saveCompetencies(userId, merged);
        return merged;
      }
    } catch {
      // Backend unavailable; proceed to local fallback
    }

    // Return tagged prototype data
    const local = this.getCompetencies(userId);
    return local.map((c) => ({
      ...c,
      dataSource: c.dataSource || 'seeded_prototype',
    }));
  }

  public static saveCompetencies(userId: string, competencies: Competency[]): void {
    localStorage.setItem(`${COMPETENCIES_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(competencies));
  }

  public static getCompetencyById(userId: string, competencyId: string): Competency | undefined {
    const list = this.getCompetencies(userId);
    return list.find((c) => c.id === competencyId);
  }

  public static markLearningCompleted(userId: string, competencyId: string): Competency {
    const list = this.getCompetencies(userId);
    const comp = list.find((c) => c.id === competencyId);
    if (!comp) throw new Error('Competency not found');

    comp.verification.learningCompleted = true;
    this.saveCompetencies(userId, list);
    return comp;
  }

  public static updateAssessmentResult(userId: string, competencyId: string, quizScore: number): Competency {
    const list = this.getCompetencies(userId);
    const comp = list.find((c) => c.id === competencyId);
    if (!comp) throw new Error('Competency not found');

    comp.evidence.quizAccuracy = quizScore;
    comp.verification.assessmentPassed = quizScore >= 70;
    comp.verification.practiceCompleted = true;

    // Recalculate overall score with Phase 1 4-factor model
    const { scorePercent, gap, gapBand, status } = this.calculateScore(
      comp.evidence.assessmentScore,
      comp.evidence.quizAccuracy,
      comp.evidence.practicalPerformance,
      comp.evidence.externalEvidence ?? 60
    );
    comp.score = scorePercent;
    comp.status = status;
    comp.gapPoints = Math.max(0, Math.round(gap * 100));
    comp.gapBand = gapBand;

    this.saveCompetencies(userId, list);
    return comp;
  }

  public static submitPracticalVerification(userId: string, competencyId: string): Competency {
    const list = this.getCompetencies(userId);
    const comp = list.find((c) => c.id === competencyId);
    if (!comp) throw new Error('Competency not found');

    comp.verification.practicalEvidenceVerified = true;
    comp.verification.status = 'Verified';
    comp.verification.verifiedAt = new Date().toISOString().split('T')[0];
    comp.evidence.practicalPerformance = 85; // Raised by verification

    // Recalculate
    const { scorePercent, gap, gapBand, status } = this.calculateScore(
      comp.evidence.assessmentScore,
      comp.evidence.quizAccuracy,
      comp.evidence.practicalPerformance,
      comp.evidence.externalEvidence ?? 60
    );
    comp.score = scorePercent;
    comp.status = status;
    comp.gapPoints = Math.max(0, Math.round(gap * 100));
    comp.gapBand = gapBand;

    if (comp.verification.timeline) {
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      comp.verification.timeline = comp.verification.timeline.map((t) => ({
        ...t,
        status: 'completed' as const,
      }));
      comp.verification.timeline.push({
        step: 'Official Empirical Credential Issued',
        date: today,
        status: 'completed',
        description: 'Directorate statistical board audited submitted empirical scripts and issued full competency certification.',
      });
    }

    this.saveCompetencies(userId, list);
    return comp;
  }

  public static verifyCompetency(userId: string, competencyId: string): Competency {
    return this.submitPracticalVerification(userId, competencyId);
  }

  public static refreshKnowledge(userId: string, competencyId: string): Competency {
    const list = this.getCompetencies(userId);
    const comp = list.find((c) => c.id === competencyId);
    if (!comp) throw new Error('Competency not found');

    comp.decay.current = Math.min(100, (comp.decay.current || 80) + 12);
    comp.decay.currentEstimatedRetention = 95;
    comp.decay.status = 'Retained';
    comp.decay.lastEvaluatedDaysAgo = 0;
    comp.decay.daysSinceLastPractice = 0;
    comp.decay.nextRefreshDays = 30;
    this.saveCompetencies(userId, list);
    return comp;
  }

  public static refreshKnowledgeDecay(userId: string, competencyId: string): Competency {
    return this.refreshKnowledge(userId, competencyId);
  }
}
