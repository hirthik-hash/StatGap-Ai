/**
 * STAT-GAP AI — Centralized GAP-X Stage Resolver
 *
 * Maps navigation pages to the corresponding GAP-X intelligence cycle stage.
 *
 * IMPORTANT: The active stage is a WORKSPACE/NAVIGATION INDICATOR only.
 * It does NOT imply the officer has completed that stage.
 * Only backend state can establish completion/status.
 */
import { NavPageId } from '../components/common/Sidebar';

export interface GapXStage {
  index: number;       // 0-based position in the 9-stage cycle
  id: string;          // Short machine-readable id
  label: string;       // Display label (uppercase)
  description: string; // One-line description for tooltips / aria
  color: string;       // Tailwind text-color class
  bgColor: string;     // Tailwind bg-color class
  borderColor: string; // Tailwind border-color class
}

/** Ordered 9-stage GAP-X Intelligence Cycle */
export const GAP_X_STAGES: GapXStage[] = [
  {
    index: 0,
    id: 'OBSERVE',
    label: 'OBSERVE',
    description: 'Assessments & Evidence Collection',
    color: 'text-[#657A82]',
    bgColor: 'bg-[#EEF0EE]',
    borderColor: 'border-[#B8A28F]/40',
  },
  {
    index: 1,
    id: 'MAP',
    label: 'MAP',
    description: 'Competency Framework Mapping',
    color: 'text-[#6B4A35]',
    bgColor: 'bg-[#EEE4D8]',
    borderColor: 'border-[#CBB9A7]',
  },
  {
    index: 2,
    id: 'DIAGNOSE',
    label: 'DIAGNOSE',
    description: 'Gap Signal Extraction',
    color: 'text-[#4D3628]',
    bgColor: 'bg-[#F8F3EB]',
    borderColor: 'border-[#DED2C5]',
  },
  {
    index: 3,
    id: 'WHY-GAP',
    label: 'WHY-GAP',
    description: 'Misconception Root-Cause Detection',
    color: 'text-[#7A5C38]',
    bgColor: 'bg-[#FDF6EC]',
    borderColor: 'border-[#D4A96A]',
  },
  {
    index: 4,
    id: 'LEARN',
    label: 'LEARN',
    description: 'Personalised Micro-Learning Path',
    color: 'text-[#547A5A]',
    bgColor: 'bg-[#EFF6EF]',
    borderColor: 'border-[#A8C9AC]',
  },
  {
    index: 5,
    id: 'ASSESS',
    label: 'ASSESS',
    description: 'Adaptive Rasch/1PL Assessment',
    color: 'text-[#A97838]',
    bgColor: 'bg-[#FDF6EC]',
    borderColor: 'border-[#D4A96A]',
  },
  {
    index: 6,
    id: 'VERIFY',
    label: 'VERIFY',
    description: 'Practical Competency Verification',
    color: 'text-[#547A5A]',
    bgColor: 'bg-[#EFF6EF]',
    borderColor: 'border-[#8CBF94]',
  },
  {
    index: 7,
    id: 'MONITOR',
    label: 'MONITOR',
    description: 'Ebbinghaus Retention Monitoring',
    color: 'text-[#8A6A52]',
    bgColor: 'bg-[#EEE4D8]',
    borderColor: 'border-[#CBB9A7]',
  },
  {
    index: 8,
    id: 'SYNC',
    label: 'SYNC',
    description: 'iGOT Karmayogi Synchronisation',
    color: 'text-[#3A2921]',
    bgColor: 'bg-[#F8F3EB]',
    borderColor: 'border-[#CBB9A7]',
  },
];

/** Maps each NavPageId to a GAP-X stage index */
const PAGE_TO_STAGE_INDEX: Record<NavPageId, number> = {
  dashboard:            0,  // OBSERVE
  'competency-map':     1,  // MAP
  'competency-detail':  1,  // MAP
  'digital-twin':       1,  // MAP (Computational Twin)
  digital_twin:         1,  // MAP (alias)
  'gap-analysis':       2,  // DIAGNOSE

  'why-gap':            3,  // WHY-GAP
  'misconception-library': 3, // WHY-GAP (supporting)
  learning:             4,  // LEARN
  'study-material':     4,  // LEARN (RAG grounding)
  assessments:          5,  // ASSESS
  verification:         6,  // VERIFY
  'knowledge-decay':    7,  // MONITOR
  'task-readiness':     7,  // MONITOR (Task Readiness)
  'admin-analytics':    8,  // SYNC (Workforce / Cadre Intelligence)
  'supervisor-dashboard': 8, // SYNC (Leadership / Oversight)
  'career-progression': 8, // SYNC (Career Benchmarking)
  career:               8, // SYNC (alias)
  'igot-integration':   8,  // SYNC
  igot:                 8,  // SYNC (alias)
  profile:              0,  // OBSERVE (default)
};

/**
 * Returns the active GAP-X stage for the given navigation page.
 * Falls back to OBSERVE (index 0) for any unknown page.
 */
export function resolveGapXStage(activePage: NavPageId): GapXStage {
  const idx = PAGE_TO_STAGE_INDEX[activePage] ?? 0;
  return GAP_X_STAGES[idx];
}

/**
 * Converts a raw IRT theta value (ability estimate) to a
 * human-readable proficiency label for officer-facing UI.
 */
export function thetaToProficiencyLabel(theta: number): string {
  if (theta >= 1.5)  return 'Advanced';
  if (theta >= 0.5)  return 'Proficient';
  if (theta >= -0.5) return 'Developing';
  if (theta >= -1.5) return 'Foundational';
  return 'Emerging';
}

/**
 * Converts a Standard Error (SE) to a human-readable calibration label.
 */
export function seToCalibrationLabel(se: number): string {
  if (se <= 0.35) return 'Calibrated';
  if (se <= 0.55) return 'Fine-Tuning';
  return 'Estimating';
}

/**
 * Converts an IRT b-parameter (item difficulty) to a human-readable label.
 */
export function bToDifficultyLabel(b: number): string {
  if (b >= 1.0)  return 'Advanced Application';
  if (b >= 0.0)  return 'Standard Application';
  if (b >= -1.0) return 'Foundational';
  return 'Introductory';
}

/**
 * Converts a competency score to an officer-readable proficiency label.
 */
export function scoreToProficiency(score: number): string {
  if (score >= 90) return 'Expert';
  if (score >= 75) return 'Proficient';
  if (score >= 60) return 'Developing';
  if (score >= 45) return 'Foundational';
  return 'Critical Gap';
}

/**
 * Maps decay status to a standardized risk category label and color.
 */
export function decayToRiskCategory(status: string, retention?: number): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (status === 'Retained' || (retention !== undefined && retention >= 85)) {
    return { label: 'STABLE', color: 'text-[#2E5B34]', bg: 'bg-[#EFF6EF]', border: 'border-[#A8C9AC]' };
  }
  if (status === 'Refresh Recommended' || (retention !== undefined && retention >= 70)) {
    return { label: 'MONITOR', color: 'text-[#7A4F1E]', bg: 'bg-[#FDF6EC]', border: 'border-[#D4A96A]' };
  }
  if (retention !== undefined && retention >= 55) {
    return { label: 'AT RISK', color: 'text-[#B85C38]', bg: 'bg-[#FDF4EC]', border: 'border-[#D4A270]' };
  }
  return { label: 'REFRESH REQUIRED', color: 'text-[#7A2E2A]', bg: 'bg-[#FBF0EF]', border: 'border-[#D4958F]' };
}
