export type CompetencyStatus = 'competent' | 'moderate_gap' | 'critical_gap';

export interface User {
  name: string;
  iGotId: string;
  email: string;
  phone: string;
  dob: string;
  department: string;
  designation: string;
  password?: string;
  yearsOfExperience: number;
  profilePhoto?: string;
}

export interface CompetencyEvidence {
  assessmentScore: number; // 0 - 100
  quizAccuracy: number; // 0 - 100
  practicalPerformance: number; // 0 - 100
  externalEvidence?: number; // 0 - 100 (iGOT / external workshops)
  assessmentRatio: string; // e.g., "4/6 incorrect"
  repeatedErrors: number;
  confidencePattern: string; // e.g., "High confidence + incorrect"
}

export interface VerificationTimelineItem {
  step: string;
  date: string;
  status: 'completed' | 'in_progress' | 'pending';
  description: string;
}

export interface DecayCurvePoint {
  day: number;
  retention: number;
  isProjected: boolean;
}

export interface CompetencyDecay {
  current: number; // e.g. 84%
  days30: number; // e.g. 79%
  days90: number; // e.g. 71%
  status: 'Fresh' | 'Refresh Recommended' | 'Critical Decay Alert' | 'Retained';
  lastEvaluatedDaysAgo?: number;
  projectedHalfLifeDays?: number;
  initialScore?: number;
  lastEvaluatedDate?: string;
  daysSinceLastPractice?: number;
  currentEstimatedRetention?: number;
  nextRefreshDays?: number;
  curvePoints?: DecayCurvePoint[];
}

export interface CompetencyVerificationState {
  status?: 'Verified' | 'Partially Verified' | 'Unverified';
  learningCompleted?: boolean;
  assessmentPassed?: boolean;
  practiceCompleted?: boolean;
  quizPassed?: boolean;
  practicalEvidenceVerified: boolean;
  verifiedAt?: string;
  timeline?: VerificationTimelineItem[];
}

export interface Competency {
  id: string;
  name: string;
  category: string;
  score: number; // 0 - 100
  requiredScore: number; // e.g. 75
  gapPoints: number; // e.g. 14
  status: CompetencyStatus;
  description: string;
  evidence: CompetencyEvidence;
  misconceptionId?: string;
  misconceptionTitle?: string;
  misconceptionExplanation?: string;
  decay: CompetencyDecay;
  verification: CompetencyVerificationState;
  // Phase 1 Normalized Data & Provenance Tracking
  dataSource?: 'live_backend' | 'seeded_prototype';
  gapBand?: 'red' | 'orange' | 'green';
  normalizedScore?: number; // 0.0 - 1.0
  normalizedGap?: number; // -1.0 - 1.0
}

export interface Misconception {
  id: string;
  name: string;
  category: string;
  shortDesc: string;
  detailedExplanation: string;
  detectionRule: string;
  confidenceLevel: 'High' | 'Very High' | 'Medium';
  evidenceStrength: 'Strong' | 'Moderate' | 'Emerging';
  statisticalContext: string;
  counterExample: string;
  remediationSnippet: string;
}

export interface MicroLearningStep {
  stepNumber: number; // 1 to 4
  title: string;
  type: 'concept' | 'worked_example' | 'practice' | 'verification';
  duration: string;
  subtitle: string;
  content: string;
  keyTakeaway: string;
  interactiveQuestion?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

export type ConfidenceLevel = 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface QuizQuestion {
  id: string;
  competencyId: string;
  difficulty: QuestionDifficulty;
  question: string;
  scenario?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  trapOptionIndex?: number;
  trapMisconceptionId?: string;
  trapMisconceptionName?: string;
}

export interface QuizAnswerRecord {
  questionId: string;
  question: string;
  selectedOptionIndex: number;
  correctOptionIndex: number;
  isCorrect: boolean;
  confidence: ConfidenceLevel;
  difficulty: QuestionDifficulty;
  competencyId: string;
  misconceptionTriggered?: string;
}

export interface QuizResultSummary {
  competencyId: string;
  competencyName: string;
  scorePercent: number;
  accuracyPercent: number;
  totalQuestions: number;
  correctCount: number;
  detectedMisconceptions: string[];
  nextAction: string;
  answers: QuizAnswerRecord[];
}

export interface IGotCourse {
  id: string;
  title: string;
  provider: string;
  completedDate: string;
  hours: number;
  certificateId: string;
  competencyMapped: string;
}

export interface StudyDocument {
  id: string;
  fileName: string;
  fileSize: string;
  uploadedDate: string;
  status: 'Ready' | 'Indexing' | 'Verification Pending';
  extractedSections: number;
  generatedQuestions: {
    question: string;
    sourceExcerpt: string;
    page: number;
    isSourceGrounded: boolean;
    requiresHumanReview: boolean;
  }[];
}
