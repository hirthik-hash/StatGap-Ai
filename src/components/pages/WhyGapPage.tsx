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

  // ── Blend live backend diagnosis ──
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
            <span className="text-[11px] text-[#6E625A] font-mono">Diagnostic Engine v2.4</span>
          </div>
          <h1 className="text-2xl font-black text-[#2F2520] tracking-tight">Root Cause Diagnosis</h1>
          <p className="text-sm text-[#6E625A] mt-1">
            Evidence-grounded explanation of the competency gap beyond test scores.
          </p>
        </div>
        <button
          onClick={() => onNavigate('learning')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6B4A35] hover:bg-[#523625] text-[#FBF8F2] text-xs font-bold shadow-xs transition-all shrink-0"
        >
          Start Targeted Micro-Learning
          <ArrowRight className="w-4 h-4 text-[#DED2C5]" />
        </button>
      </div>

      {/* ══════════════════════════════════════════
          5-TIER PROVENANCE FRAME
      ═══════════════════════════════════════════ */}

      {/* Tier 1 — WHAT */}
      <div className="officer-card overflow-hidden">
        <div className="flex">
          <div className="w-1.5 bg-[#6B4A35] shrink-0" />
          <div className="flex-1 p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#6B4A35]">WHAT</span>
              <span className="text-[11px] text-[#6E625A]">— Current competency status</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <div className="text-3xl font-black font-mono text-[#2F2520]">{competency.score}%</div>
                <div className="text-xs text-[#6E625A] mt-0.5">Composite Score</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${competency.status === 'critical_gap' ? 'badge-critical' : competency.status === 'moderate_gap' ? 'badge-moderate' : 'badge-competent'} text-sm`}>
                  <AlertOctagon className="w-3.5 h-3.5" />
                  Proficiency: {scoreToProficiency(competency.score)}
                </span>
                {competency.gapPoints > 0 && (
                  <span className="text-xs text-[#3A2921] bg-[#F8F3EB] px-2.5 py-1 rounded-lg border border-[#DED2C5] font-mono">
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
          <div className="w-1.5 bg-[#A97838] shrink-0" />
          <div className="flex-1 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#A97838]">WHY</span>
              <span className="text-[11px] text-[#6E625A]">— Primary gap classification</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FDF6EC] border border-[#D4A96A]">
                <BrainCircuit className="w-4 h-4 text-[#A97838]" />
                <div>
                  <div className="text-[10px] text-[#7A4F1E] font-bold uppercase tracking-wide">Gap Type</div>
                  <div className="text-sm font-bold text-[#2F2520]">{gapType}</div>
                </div>
              </div>
              <div className="text-xs text-[#6E625A] max-w-md leading-relaxed">
                {diagnosticSynthesis}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tier 3 — EVIDENCE */}
      <div className="officer-card overflow-hidden">
        <div className="flex">
          <div className="w-1.5 bg-[#8A6A52] shrink-0" />
          <div className="flex-1 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#8A6A52]">EVIDENCE</span>
              <span className="text-[11px] text-[#6E625A]">— Multi-source corroborating data</span>
              <span className="ml-auto text-[10px] bg-[#F8F3EB] text-[#6E625A] border border-[#DED2C5] px-2 py-0.5 rounded font-mono">
                Triangulated Audit · Strength: {displayDiagnosis.evidenceStrength}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Assessment', value: displayDiagnosis.evidenceBreakdown.assessmentRate, flag: 'Below threshold', flagColor: 'bg-[#FDF6EC] text-[#7A4F1E] border border-[#D4A96A]' },
                { label: 'Quiz Accuracy', value: displayDiagnosis.evidenceBreakdown.quizRate, flag: 'Continuous signal', flagColor: 'bg-[#F8F3EB] text-[#6E625A] border border-[#DED2C5]' },
                { label: 'Practical', value: displayDiagnosis.evidenceBreakdown.practicalRate, flag: 'Needs verification', flagColor: 'bg-[#F8F3EB] text-[#6E625A] border border-[#DED2C5]' },
                { label: 'Repeated Errors', value: String(displayDiagnosis.evidenceBreakdown.repeatedErrorCount), flag: 'Systematic pattern', flagColor: 'bg-[#FBF0EF] text-[#7A2E2A] border border-[#D4958F]', highlight: true },
                { label: 'Confidence Pattern', value: displayDiagnosis.evidenceBreakdown.confidenceCalibration, flag: 'Diagnostic signal', flagColor: 'bg-[#FBF0EF] text-[#7A2E2A] border border-[#D4958F]', highlight: true },
              ].map((ev) => (
                <div
                  key={ev.label}
                  className={`p-3 rounded-lg border flex flex-col gap-1.5 ${ev.highlight ? 'bg-[#FBF0EF] border-[#D4958F]' : 'bg-[#F8F3EB] border-[#DED2C5]'}`}
                >
                  <div className="text-[10px] font-bold text-[#6E625A] uppercase">{ev.label}</div>
                  <div className="text-sm font-black text-[#2F2520] leading-tight">{ev.value}</div>
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
          <div className="w-1.5 bg-[#A97838] shrink-0" />
          <div className="flex-1 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#A97838]">ROOT CAUSE</span>
              <span className="text-[11px] text-[#6E625A]">— Identified misconception</span>
              <div className="ml-auto flex items-center gap-2 text-[10px] font-mono">
                <span className="bg-[#F8F3EB] text-[#6E625A] border border-[#DED2C5] px-2 py-0.5 rounded">
                  Confidence: {displayDiagnosis.confidenceScore}
                </span>
              </div>
            </div>

            <h3 className="text-base font-bold text-[#2F2520] mb-3">
              {displayDiagnosis.identifiedMisconception?.name || 'Statistical Concept Misapplication'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-lg bg-[#F8F3EB] border border-[#DED2C5]">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6E625A] uppercase mb-2">
                  <HelpCircle className="w-3.5 h-3.5 text-[#A97838]" />
                  What the Officer Believes
                </div>
                <p className="text-xs text-[#3A2921] leading-relaxed">
                  {displayDiagnosis.identifiedMisconception?.detailedExplanation ||
                    'The officer conflates marginal rates with elasticity percentages when interpreting statistical coefficients.'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-[#EFF6EF] border border-[#A8C9AC]">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#2E5B34] uppercase mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#547A5A]" />
                  The Correct Understanding
                </div>
                <p className="text-xs text-[#1F5E2A] leading-relaxed">
                  {correctMathematicalTruth}
                </p>
              </div>
            </div>

            {displayDiagnosis.identifiedMisconception?.counterExample && (
              <div className="mt-3 p-3 rounded-lg bg-[#FDF6EC] border border-[#D4A96A]">
                <div className="text-[10px] font-bold text-[#7A4F1E] uppercase mb-1">Field Counter-Example</div>
                <p className="text-xs text-[#7A4F1E] font-mono leading-relaxed">
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
          <div className="w-1.5 bg-[#547A5A] shrink-0" />
          <div className="flex-1 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#547A5A]">RECOMMENDATION</span>
              <span className="text-[11px] text-[#6E625A]">— Concrete remediation task</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EFF6EF] border border-[#A8C9AC] flex items-center justify-center shrink-0 mt-0.5">
                    <Target className="w-4 h-4 text-[#547A5A]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#2F2520] leading-snug">
                      {displayDiagnosis.recommendedAction}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Link2 className="w-3 h-3 text-[#93877D]" />
                      <span className="text-[10px] text-[#6E625A]">
                        Aligned with MoSPI NSSTA Training Standards · Statistical Methods Module 3
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => onNavigate('misconception-library')}
                  className="px-4 py-2 bg-[#EEE4D8] hover:bg-[#DED2C5] text-[#3A2921] text-xs font-semibold rounded-lg border border-[#CBB9A7] transition-all"
                >
                  Misconception Library
                </button>
                <button
                  onClick={() => onNavigate('learning')}
                  className="px-4 py-2.5 bg-[#6B4A35] hover:bg-[#523625] text-[#FBF8F2] text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-2"
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
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#F8F3EB] border border-[#DED2C5] text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-[#547A5A] shrink-0" />
          <span className="text-[#6E625A]">
            RAG Grounding:{' '}
            <strong className={`${aiGrounded.groundingStatus === 'grounded' ? 'text-[#2E5B34]' : aiGrounded.groundingStatus === 'weak_grounding' ? 'text-[#7A4F1E]' : 'text-[#7A2E2A]'}`}>
              {aiGrounded.groundingStatus === 'grounded' ? 'Grounded' : aiGrounded.groundingStatus === 'weak_grounding' ? 'Weak Grounding' : 'Insufficient Grounding'}
            </strong>
            {aiGrounded.sources?.length > 0 && (
              <span className="text-[#6E625A] ml-1">· {aiGrounded.sources.length} source(s) retrieved</span>
            )}
          </span>
        </div>
      )}

      {/* ── Collapsible Technical Diagnostics ───────── */}
      <div className="officer-card overflow-hidden">
        <button
          onClick={() => setTechOpen((v) => !v)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-[#F8F3EB] transition-colors"
          aria-expanded={techOpen}
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#6E625A]" />
            <span className="text-xs font-bold text-[#2F2520]">Technical Diagnostics</span>
            <span className="text-[10px] text-[#6E625A]">— AI decision trace, IRT parameters, raw reasoning log</span>
          </div>
          {techOpen ? <ChevronUp className="w-4 h-4 text-[#6E625A]" /> : <ChevronDown className="w-4 h-4 text-[#6E625A]" />}
        </button>

        {techOpen && (
          <div className="bg-[#2A1E19] text-[#EEE4D8] p-5 font-mono text-xs border-t border-[#4D3628]">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#4D3628]">
              <span className="text-[#EDD8B4] font-bold">EXPLAINABLE AI ENGINE — DECISION TRACE</span>
              <span className="text-[#B8A28F] text-[10px]">Transparent Reasoning Log</span>
            </div>
            <div className="space-y-1.5">
              {displayDiagnosis.reasoningTrace.map((line, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <span className="text-[#CBB9A7] select-none shrink-0">&gt;&gt;</span>
                  <span className={line.includes('RULE MATCH') || line.includes('INFERENCE') ? 'text-[#EDD8B4] font-bold' : 'text-[#EEE4D8]'}>
                    {line}
                  </span>
                </div>
              ))}
              <div className="flex items-start gap-2.5 pt-2 border-t border-[#4D3628] text-[#C8DEC8] font-bold">
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
