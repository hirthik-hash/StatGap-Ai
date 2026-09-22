import React, { useState, useEffect } from 'react';
import { Competency } from '../../types';
import { NavPageId } from '../common/Sidebar';
import { AiService, WhyGapDiagnosisResult, GroundedAiExplanation } from '../../services/aiService';
import { DiagnosticService, DiagnosticEvaluation } from '../../services/diagnosticService';
import { scoreToProficiency } from '../../utils/gapxResolver';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertOctagon,
  BrainCircuit,
  FileCheck,
  Target,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Link2,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

interface WhyGapPageProps {
  competency: Competency;
  onNavigate: (page: NavPageId) => void;
}

export const WhyGapPage: React.FC<WhyGapPageProps> = ({ competency, onNavigate }) => {
  const [backendDiagnosis, setBackendDiagnosis] = useState<DiagnosticEvaluation | null>(null);
  const [aiGrounded, setAiGrounded] = useState<GroundedAiExplanation | null>(null);
  const [techOpen, setTechOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    DiagnosticService.getCompetencyDiagnosis(competency.id)
      .then((res) => { if (isMounted && res) setBackendDiagnosis(res); })
      .catch(() => {});

    AiService.getGroundedExplanation(competency.id)
      .then((res) => { if (isMounted && res) setAiGrounded(res); })
      .catch(() => {});

    return () => { isMounted = false; };
  }, [competency.id]);

  // ── Baseline fallback diagnosis ──
  const localDiagnosis = AiService.diagnoseWhyGap(
    competency.id,
    competency.evidence,
    competency.misconceptionId
  );

  // ── Blend live backend diagnosis, preserving UI contract ──
  let displayDiagnosis: WhyGapDiagnosisResult = localDiagnosis;
  let diagnosticSynthesis =
    'The learner appears to confuse a regression coefficient with a percentage change. This pattern appears repeatedly across assessment and quiz responses.';

  if (backendDiagnosis) {
    const traceLines: string[] = [];
    if (backendDiagnosis.reasoningTrace?.signals) {
      backendDiagnosis.reasoningTrace.signals.forEach((sig) => {
        traceLines.push(`[Signal: ${sig.signal}] Value: ${sig.value} → ${sig.interpretation}`);
      });
    }
    if (backendDiagnosis.reasoningTrace?.conclusion) {
      traceLines.push(`INFERENCE: ${backendDiagnosis.reasoningTrace.conclusion}`);
    }
    if (traceLines.length === 0) traceLines.push(...localDiagnosis.reasoningTrace);

    const confScore: 'High' | 'Very High' | 'Medium' =
      backendDiagnosis.confidence >= 0.9 ? 'Very High' : backendDiagnosis.confidence >= 0.75 ? 'High' : 'Medium';

    displayDiagnosis = {
      competencyId: backendDiagnosis.competencyId,
      identifiedMisconception: backendDiagnosis.misconception
        ? {
            id: backendDiagnosis.misconception.id,
            name: backendDiagnosis.misconception.title,
            category: competency.category,
            shortDesc: backendDiagnosis.misconception.concept,
            detailedExplanation: backendDiagnosis.misconception.explanation,
            detectionRule: backendDiagnosis.misconception.detectionRule,
            confidenceLevel: backendDiagnosis.misconception.confidenceLevel as 'High' | 'Very High' | 'Medium',
            evidenceStrength: 'Strong',
            statisticalContext: backendDiagnosis.misconception.counterExample,
            counterExample: backendDiagnosis.misconception.counterExample,
            remediationSnippet: backendDiagnosis.misconception.remediationHint,
          }
        : localDiagnosis.identifiedMisconception,
      confidenceScore: confScore,
      evidenceStrength: backendDiagnosis.confidence >= 0.85 ? 'Strong' : 'Moderate',
      evidenceBreakdown: {
        assessmentRate:        backendDiagnosis.evidenceReferences?.assessment_ratio || localDiagnosis.evidenceBreakdown.assessmentRate,
        quizRate:              `${backendDiagnosis.evidenceReferences?.quiz_accuracy ?? competency.evidence.quizAccuracy}% accuracy`,
        practicalRate:         `${backendDiagnosis.evidenceReferences?.practical_performance ?? competency.evidence.practicalPerformance}%`,
        repeatedErrorCount:    backendDiagnosis.evidenceReferences?.repeated_errors ?? competency.evidence.repeatedErrors,
        confidenceCalibration: backendDiagnosis.evidenceReferences?.confidence_pattern || localDiagnosis.evidenceBreakdown.confidenceCalibration,
      },
      reasoningTrace:    traceLines,
      recommendedAction: backendDiagnosis.misconception?.remediationHint || localDiagnosis.recommendedAction,
    };
    diagnosticSynthesis = backendDiagnosis.explanation;
  }

  let correctMathematicalTruth =
    'In a linear OLS model, β₁ represents the absolute marginal change in units of Y per 1-unit change in X, holding all other variables constant (ceteris paribus). A percentage interpretation is only valid in logarithmic specifications.';

  if (aiGrounded) {
    if (aiGrounded.diagnosticSynthesis) diagnosticSynthesis = aiGrounded.diagnosticSynthesis;
    if (aiGrounded.correctMathematicalTruth) correctMathematicalTruth = aiGrounded.correctMathematicalTruth;
    if (aiGrounded.whatOfficerBelieves && displayDiagnosis.identifiedMisconception) {
      displayDiagnosis.identifiedMisconception.detailedExplanation = aiGrounded.whatOfficerBelieves;
    }
    if (aiGrounded.counterExample && displayDiagnosis.identifiedMisconception) {
      displayDiagnosis.identifiedMisconception.counterExample = aiGrounded.counterExample;
    }
    if (aiGrounded.remediationPathway) displayDiagnosis.recommendedAction = aiGrounded.remediationPathway;
    if (aiGrounded.sources?.length > 0) {
      displayDiagnosis.reasoningTrace.push(
        `[RAG Grounding: ${aiGrounded.groundingStatus.toUpperCase()}] Verified against ${aiGrounded.sources.length} authoritative curriculum sources (${aiGrounded.sources[0].documentTitle}).`
      );
    }
  }

  // Derive gap classification
  const gapType =
    competency.evidence.repeatedErrors >= 3
      ? 'Conceptual Misconception'
      : competency.evidence.confidencePattern?.includes('High confidence')
      ? 'Calibration Error'
      : competency.evidence.practicalPerformance < 60
      ? 'Application Gap'
      : 'Knowledge Gap';

  return (
    <div className="space-y-4 pb-12 animate-fadeIn">

      {/* ── Page Header ────────────────────────────────── */}
      <div className="officer-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge badge-moderate uppercase">
              <Sparkles className="w-3 h-3" />
              Why-Gap Intelligence
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Diagnostic Engine v2.4</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Root Cause Diagnosis</h1>
          <p className="text-sm text-slate-500 mt-1">
            Evidence-grounded explanation of the competency gap beyond test scores.
          </p>
        </div>
        <button
          onClick={() => onNavigate('learning')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0c1a30] hover:bg-[#102a4e] text-white text-xs font-bold shadow-sm transition-all shrink-0"
        >
          Start Targeted Micro-Learning
          <ArrowRight className="w-4 h-4 text-blue-300" />
        </button>
      </div>

      {/* ══════════════════════════════════════════
          5-TIER PROVENANCE FRAME
      ═══════════════════════════════════════════ */}

      {/* Tier 1 — WHAT */}
      <div className="officer-card overflow-hidden">
        <div className="flex">
          <div className="w-1.5 bg-blue-600 shrink-0" />
          <div className="flex-1 p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">WHAT</span>
              <span className="text-[11px] text-slate-400">— Current competency status</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <div className="text-3xl font-black font-mono text-slate-900">{competency.score}%</div>
                <div className="text-xs text-slate-500 mt-0.5">Composite Score</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${competency.status === 'critical_gap' ? 'badge-critical' : competency.status === 'moderate_gap' ? 'badge-moderate' : 'badge-competent'} text-sm`}>
                  <AlertOctagon className="w-3.5 h-3.5" />
                  Proficiency: {scoreToProficiency(competency.score)}
                </span>
                {competency.gapPoints > 0 && (
                  <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
                    −{competency.gapPoints} pts below MoSPI standard ({competency.requiredScore}%)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tier 2 — WHY */}
      <div className="officer-card overflow-hidden">
        <div className="flex">
          <div className="w-1.5 bg-violet-600 shrink-0" />
          <div className="flex-1 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-violet-600">WHY</span>
              <span className="text-[11px] text-slate-400">— Primary gap classification</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-50 border border-violet-200">
                <BrainCircuit className="w-4 h-4 text-violet-700" />
                <div>
                  <div className="text-[10px] text-violet-600 font-bold uppercase tracking-wide">Gap Type</div>
                  <div className="text-sm font-bold text-violet-900">{gapType}</div>
                </div>
              </div>
              <div className="text-xs text-slate-600 max-w-md leading-relaxed">
                {diagnosticSynthesis}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tier 3 — EVIDENCE */}
      <div className="officer-card overflow-hidden">
        <div className="flex">
          <div className="w-1.5 bg-sky-600 shrink-0" />
          <div className="flex-1 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-600">EVIDENCE</span>
              <span className="text-[11px] text-slate-400">— Multi-source corroborating data</span>
              <span className="ml-auto text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                Triangulated Audit · Strength: {displayDiagnosis.evidenceStrength}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Assessment', value: displayDiagnosis.evidenceBreakdown.assessmentRate, flag: 'Below threshold', flagColor: 'bg-amber-50 text-amber-700' },
                { label: 'Quiz Accuracy', value: displayDiagnosis.evidenceBreakdown.quizRate, flag: 'Continuous signal', flagColor: 'bg-slate-100 text-slate-600' },
                { label: 'Practical', value: displayDiagnosis.evidenceBreakdown.practicalRate, flag: 'Needs verification', flagColor: 'bg-slate-100 text-slate-600' },
                { label: 'Repeated Errors', value: String(displayDiagnosis.evidenceBreakdown.repeatedErrorCount), flag: 'Systematic pattern', flagColor: 'bg-rose-50 text-rose-700', highlight: true },
                { label: 'Confidence Pattern', value: displayDiagnosis.evidenceBreakdown.confidenceCalibration, flag: 'Diagnostic signal', flagColor: 'bg-rose-50 text-rose-700', highlight: true },
              ].map((ev) => (
                <div
                  key={ev.label}
                  className={`p-3 rounded-lg border flex flex-col gap-1.5 ${ev.highlight ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50 border-slate-200'}`}
                >
                  <div className="text-[10px] font-bold text-slate-500 uppercase">{ev.label}</div>
                  <div className="text-sm font-black text-slate-900 leading-tight">{ev.value}</div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded self-start ${ev.flagColor}`}>
                    {ev.flag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tier 4 — ROOT CAUSE */}
      <div className="officer-card overflow-hidden">
        <div className="flex">
          <div className="w-1.5 bg-amber-500 shrink-0" />
          <div className="flex-1 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">ROOT CAUSE</span>
              <span className="text-[11px] text-slate-400">— Identified misconception</span>
              <div className="ml-auto flex items-center gap-2 text-[10px] font-mono">
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  Confidence: {displayDiagnosis.confidenceScore}
                </span>
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-3">
              {displayDiagnosis.identifiedMisconception?.name || 'Statistical Concept Misapplication'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 uppercase mb-2">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  What the Officer Believes
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {displayDiagnosis.identifiedMisconception?.detailedExplanation ||
                    'The officer conflates marginal rates with elasticity percentages when interpreting statistical coefficients.'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 uppercase mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  The Correct Understanding
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  {correctMathematicalTruth}
                </p>
              </div>
            </div>

            {displayDiagnosis.identifiedMisconception?.counterExample && (
              <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="text-[10px] font-bold text-amber-700 uppercase mb-1">Field Counter-Example</div>
                <p className="text-xs text-amber-900 font-mono leading-relaxed">
                  {displayDiagnosis.identifiedMisconception.counterExample}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tier 5 — RECOMMENDATION */}
      <div className="officer-card overflow-hidden">
        <div className="flex">
          <div className="w-1.5 bg-emerald-600 shrink-0" />
          <div className="flex-1 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">RECOMMENDATION</span>
              <span className="text-[11px] text-slate-400">— Concrete remediation task</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Target className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 leading-snug">
                      {displayDiagnosis.recommendedAction}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Link2 className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] text-slate-500">
                        Aligned with MoSPI NSSTA Training Standards · Statistical Methods Module 3
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => onNavigate('misconception-library')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-all"
                >
                  Misconception Library
                </button>
                <button
                  onClick={() => onNavigate('learning')}
                  className="px-4 py-2.5 bg-[#0c1a30] hover:bg-[#102a4e] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                >
                  Start Learning
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Grounding Status ─────────────────────────── */}
      {aiGrounded && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-slate-600">
            RAG Grounding:{' '}
            <strong className={`${aiGrounded.groundingStatus === 'grounded' ? 'text-emerald-700' : aiGrounded.groundingStatus === 'weak_grounding' ? 'text-amber-700' : 'text-rose-700'}`}>
              {aiGrounded.groundingStatus === 'grounded' ? 'Grounded' : aiGrounded.groundingStatus === 'weak_grounding' ? 'Weak Grounding' : 'Insufficient Grounding'}
            </strong>
            {aiGrounded.sources?.length > 0 && (
              <span className="text-slate-500 ml-1">· {aiGrounded.sources.length} source(s) retrieved</span>
            )}
          </span>
        </div>
      )}

      {/* ── Collapsible Technical Diagnostics ───────── */}
      <div className="officer-card overflow-hidden">
        <button
          onClick={() => setTechOpen((v) => !v)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
          aria-expanded={techOpen}
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">Technical Diagnostics</span>
            <span className="text-[10px] text-slate-400">— AI decision trace, IRT parameters, raw reasoning log</span>
          </div>
          {techOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {techOpen && (
          <div className="bg-[#0f1923] text-slate-300 p-5 font-mono text-xs border-t border-slate-800">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <span className="text-amber-400 font-bold">EXPLAINABLE AI ENGINE — DECISION TRACE</span>
              <span className="text-slate-500 text-[10px]">Transparent Reasoning Log</span>
            </div>
            <div className="space-y-1.5">
              {displayDiagnosis.reasoningTrace.map((line, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <span className="text-blue-500 select-none shrink-0">&gt;&gt;</span>
                  <span className={line.includes('RULE MATCH') || line.includes('INFERENCE') ? 'text-amber-300 font-bold' : 'text-slate-300'}>
                    {line}
                  </span>
                </div>
              ))}
              <div className="flex items-start gap-2.5 pt-2 border-t border-slate-800 text-emerald-400 font-bold">
                <span className="select-none shrink-0">&gt;&gt;</span>
                <span>PRESCRIPTION: {displayDiagnosis.recommendedAction}</span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
