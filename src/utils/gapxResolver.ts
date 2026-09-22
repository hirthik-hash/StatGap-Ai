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
    color: 'text-sky-300',
    bgColor: 'bg-sky-600/20',
    borderColor: 'border-sky-400/40',
  },
  {
    index: 1,
    id: 'MAP',
    label: 'MAP',
    description: 'Competency Framework Mapping',
    color: 'text-blue-300',
    bgColor: 'bg-blue-600/20',
    borderColor: 'border-blue-400/40',
  },
  {
    index: 2,
    id: 'DIAGNOSE',
    label: 'DIAGNOSE',
    description: 'Gap Signal Extraction',
    color: 'text-violet-300',
    bgColor: 'bg-violet-600/20',
    borderColor: 'border-violet-400/40',
  },
  {
    index: 3,
    id: 'WHY-GAP',
    label: 'WHY-GAP',
    description: 'Misconception Root-Cause Detection',
    color: 'text-amber-300',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-400/40',
  },
  {
    index: 4,
    id: 'LEARN',
    label: 'LEARN',
    description: 'Personalised Micro-Learning Path',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-600/20',
    borderColor: 'border-cyan-400/40',
  },
  {
    index: 5,
    id: 'ASSESS',
    label: 'ASSESS',
    description: 'Adaptive Rasch/1PL Assessment',
    color: 'text-orange-300',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-400/40',
  },
  {
    index: 6,
    id: 'VERIFY',
    label: 'VERIFY',
    description: 'Practical Competency Verification',
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-600/20',
    borderColor: 'border-emerald-400/40',
  },
  {
    index: 7,
    id: 'MONITOR',
    label: 'MONITOR',
    description: 'Ebbinghaus Retention Monitoring',
    color: 'text-amber-400',
    bgColor: 'bg-amber-700/20',
    borderColor: 'border-amber-600/40',
  },
  {
    index: 8,
    id: 'SYNC',
    label: 'SYNC',
    description: 'iGOT Karmayogi Synchronisation',
    color: 'text-indigo-300',
    bgColor: 'bg-indigo-600/20',
    borderColor: 'border-indigo-400/40',
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
    return { label: 'STABLE', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  }
  if (status === 'Refresh Recommended' || (retention !== undefined && retention >= 70)) {
    return { label: 'MONITOR', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
  }
  if (retention !== undefined && retention >= 55) {
    return { label: 'AT RISK', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' };
  }
  return { label: 'REFRESH REQUIRED', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' };
}
