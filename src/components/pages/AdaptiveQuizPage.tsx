import React, { useState, useEffect, useRef } from 'react';
import { ConfidenceLevel, QuestionDifficulty, QuizAnswerRecord } from '../../types';
import { AiService } from '../../services/aiService';
import { AssessmentService, AdaptiveItem, AssessmentFinalResult, ResponseOutcome } from '../../services/assessmentService';
import { apiClient } from '../../services/apiClient';
import { NavPageId } from '../common/Sidebar';
import { thetaToProficiencyLabel, seToCalibrationLabel } from '../../utils/gapxResolver';
import {
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  Gauge,
  Loader2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AdaptiveQuizPageProps {
  userId: string;
  onQuizComplete: (records: QuizAnswerRecord[], finalScore: number, finalResult?: AssessmentFinalResult) => void;
  onNavigate: (page: NavPageId) => void;
  autoSelectTrap?: boolean;
  targetCompetencyId?: string;
}

/** Minimal competency representation fetched from backend */
interface BackendCompetency {
  id: string;
  name: string;
  category: string;
  status: string;
  score: number;
  requiredScore: number;
  gapPoints: number;
}

export const AdaptiveQuizPage: React.FC<AdaptiveQuizPageProps> = ({
  userId,
  onQuizComplete,
  onNavigate,
  autoSelectTrap = false,
  targetCompetencyId = '',
}) => {
  // ── Competency picker state (used when targetCompetencyId is empty) ──
  const [pickerCompetencies, setPickerCompetencies] = useState<BackendCompetency[]>([]);
  const [pickerLoading, setPickerLoading] = useState<boolean>(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [resolvedCompetencyId, setResolvedCompetencyId] = useState<string>(targetCompetencyId);

  // ── Assessment session state ──
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<AdaptiveItem | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [currentDifficulty, setCurrentDifficulty] = useState<QuestionDifficulty>('medium');
  const [currentTheta, setCurrentTheta] = useState<number>(0.0);
  const [currentSE, setCurrentSE] = useState<number>(1.0);
  const [selectedOption, setSelectedOption] = useState<number | null>(autoSelectTrap ? 0 : null);
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel>(
    autoSelectTrap ? 'High' : 'Medium'
  );
  const [answersHistory, setAnswersHistory] = useState<QuizAnswerRecord[]>([]);
  const [activeMisconceptionAlert, setActiveMisconceptionAlert] = useState<string | null>(null);
  const [hasSubmittedCurrent, setHasSubmittedCurrent] = useState<boolean>(false);
  const [currentOutcome, setCurrentOutcome] = useState<ResponseOutcome | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const itemStartTimeRef = useRef<number>(Date.now());

  const confidenceOptions: { label: ConfidenceLevel; desc: string }[] = [
    { label: 'Very Low', desc: 'Complete guess' },
    { label: 'Low', desc: 'Unsure' },
    { label: 'Medium', desc: 'Moderate confidence' },
    { label: 'High', desc: 'Quite confident' },
    { label: 'Very High', desc: '100% certain' },
  ];

  // ── When targetCompetencyId changes (e.g., navigated from CompetencyMap),
  //    sync resolvedCompetencyId and reset picker ──
  useEffect(() => {
    setResolvedCompetencyId(targetCompetencyId);
    setErrorMessage(null);
    setCurrentItem(null);
    setSessionId(null);
  }, [targetCompetencyId]);

  // ── If we have no competency ID, fetch the list from the backend ──
  useEffect(() => {
    if (resolvedCompetencyId) return; // already have a target, skip picker
    setPickerLoading(true);
    setPickerError(null);
    let active = true;
    apiClient
      .get<BackendCompetency[]>('/api/competencies')
      .then((comps) => { if (active) setPickerCompetencies(comps); })
      .catch(() => {
        if (active) setPickerError('Could not load competencies from backend. Please check the backend connection.');
      })
      .finally(() => { if (active) setPickerLoading(false); });
    return () => { active = false; };
  }, [resolvedCompetencyId]);

  // ── When we have a resolved competency ID (either passed in or selected), start assessment ──
  useEffect(() => {
    if (!resolvedCompetencyId) return;
    initAssessment(resolvedCompetencyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedCompetencyId]);

  const initAssessment = async (competencyId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setCurrentItem(null);
    setSessionId(null);
    setAnswersHistory([]);
    setCurrentQuestionIdx(0);
    setHasSubmittedCurrent(false);
    setSelectedOption(autoSelectTrap ? 0 : null);
    setSelectedConfidence(autoSelectTrap ? 'High' : 'Medium');
    try {
      const sessionData = await AssessmentService.startAssessment(competencyId);
      setSessionId(sessionData.sessionId);
      setCurrentItem(sessionData.firstItem);
      setCurrentDifficulty((sessionData.firstItem.difficultyLabel as QuestionDifficulty) || 'medium');
      setCurrentTheta(sessionData.initialTheta || 0.0);
      itemStartTimeRef.current = Date.now();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to Adaptive Assessment Engine.';
      console.error('Failed to start adaptive assessment:', err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCompetency = (competencyId: string) => {
    setResolvedCompetencyId(competencyId);
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || !sessionId || !currentItem) return;

    const latency = Math.max(100, Date.now() - itemStartTimeRef.current);
    setIsLoading(true);

    try {
      const outcome = await AssessmentService.submitResponse(
        sessionId,
        currentItem.id,
        selectedOption,
        selectedConfidence,
        latency
      );

      setCurrentOutcome(outcome);
      setCurrentTheta(outcome.thetaAfter);
      setCurrentSE(outcome.standardError);

      const isTrapTriggered =
        !outcome.isCorrect && (selectedConfidence === 'High' || selectedConfidence === 'Very High');

      const record: QuizAnswerRecord = {
        questionId: currentItem.id,
        question: currentItem.stem,
        selectedOptionIndex: selectedOption,
        correctOptionIndex: outcome.correctAnswer,
        isCorrect: outcome.isCorrect,
        confidence: selectedConfidence,
        difficulty: currentDifficulty,
        competencyId: currentItem.competencyId,
        misconceptionTriggered: isTrapTriggered
          ? 'Potential Statistical Misconception (High Confidence Error)'
          : undefined,
      };

      const misconceptionCheck = AiService.checkAdaptiveMisconceptionTrigger(record);
      if (misconceptionCheck.isMisconceptionTriggered || isTrapTriggered) {
        setActiveMisconceptionAlert(
          misconceptionCheck.alertMessage ||
            `Officer selected an incorrect answer with ${selectedConfidence} confidence. Misconception signal registered.`
        );
      } else {
        setActiveMisconceptionAlert(null);
      }

      setAnswersHistory((prev) => [...prev, record]);
      setHasSubmittedCurrent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit response to backend engine.';
      console.error('Failed to submit response:', err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextQuestion = () => {
    if (!currentOutcome) return;

    if (currentOutcome.isCompleted || !currentOutcome.nextItem) {
      const correctCount = answersHistory.filter((a) => a.isCorrect).length;
      const score = Math.round((correctCount / (answersHistory.length || 1)) * 100);
      onQuizComplete(answersHistory, score, currentOutcome.result || undefined);
      return;
    }

    const nextItem = currentOutcome.nextItem;
    setCurrentItem(nextItem);
    setCurrentDifficulty((nextItem.difficultyLabel as QuestionDifficulty) || 'medium');
    setCurrentQuestionIdx((prev) => prev + 1);
    setHasSubmittedCurrent(false);
    setSelectedOption(null);
    setSelectedConfidence('Medium');
    setActiveMisconceptionAlert(null);
    setCurrentOutcome(null);
    itemStartTimeRef.current = Date.now();
  };

  // ── COMPETENCY PICKER (shown when no targetCompetencyId provided) ──
  if (!resolvedCompetencyId) {
    return (
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
              Rasch/1PL Adaptive Assessment Prototype
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Select a Competency to Assess
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Choose a competency from the list below to begin your adaptive assessment session.
          </p>
        </div>

        {/* Picker body */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          {pickerLoading && (
            <div className="flex items-center gap-3 text-slate-600 text-sm py-6">
              <Loader2 className="w-5 h-5 text-blue-900 animate-spin" />
              Loading competencies from backend…
            </div>
          )}

          {pickerError && (
            <div className="flex flex-col items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Failed to load competencies
              </div>
              <p>{pickerError}</p>
              <button
                onClick={() => {
                  setPickerError(null);
                  setPickerLoading(true);
                  apiClient
                    .get<BackendCompetency[]>('/api/competencies')
                    .then(setPickerCompetencies)
                    .catch(() => setPickerError('Could not load competencies. Please retry.'))
                    .finally(() => setPickerLoading(false));
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          )}

          {!pickerLoading && !pickerError && pickerCompetencies.length === 0 && (
            <p className="text-sm text-slate-500 italic py-4">
              No competencies found in the backend. Please ensure the database has been seeded.
            </p>
          )}

          {!pickerLoading && !pickerError && pickerCompetencies.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Available Competencies ({pickerCompetencies.length})
              </div>
              {pickerCompetencies.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => handleSelectCompetency(comp.id)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:bg-blue-50/60 hover:border-blue-300 transition-all flex items-center justify-between gap-4 group cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{comp.name}</span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {comp.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          comp.status === 'competent'
                            ? 'bg-emerald-50 text-emerald-800'
                            : comp.status === 'moderate_gap'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        {comp.status === 'competent'
                          ? 'Competent'
                          : comp.status === 'moderate_gap'
                          ? 'Moderate Gap'
                          : 'Critical Gap'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 font-mono">
                      Score: {comp.score}% · Required: {comp.requiredScore}%
                      {comp.gapPoints > 0 && ` · Gap: ${comp.gapPoints}pts`}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── LOADING STATE (while starting assessment) ──
  if (isLoading && !currentItem) {
    return (
      <div className="officer-card p-12 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-blue-900 animate-spin mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Initializing Adaptive Assessment Engine…</h3>
        <p className="text-xs text-slate-500">
          Calibrating initial proficiency estimate against the competency knowledge graph.
        </p>
      </div>
    );
  }

  // ── ERROR STATE (backend unavailable or competency not found) ──
  if (errorMessage && !currentItem) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 shadow-xs text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900">Adaptive Assessment Engine Offline</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">{errorMessage}</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => initAssessment(resolvedCompetencyId)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
          <button
            onClick={() => {
              setResolvedCompetencyId('');
              setErrorMessage(null);
              setCurrentItem(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Choose Different Competency
          </button>
        </div>
      </div>
    );
  }

  if (!currentItem) return null;

  // Derive human-readable labels from IRT values
  const proficiencyLabel = thetaToProficiencyLabel(currentTheta);
  const calibrationLabel = seToCalibrationLabel(currentSE);

  return (
    <div className="space-y-4 pb-12 animate-fadeIn">
      {/* Quiz Header Bar */}
      <div className="officer-card p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-unverified uppercase">Adaptive Assessment</span>
              <span className="text-[11px] text-slate-400">Question {currentQuestionIdx + 1}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Competency Assessment
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Adaptive questioning calibrated to your current proficiency level.
            </p>
          </div>

          {/* Officer-readable status chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
              <Gauge className="w-3.5 h-3.5 text-blue-700" />
              <div className="text-xs">
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Proficiency</div>
                <div className="font-bold text-slate-900">{proficiencyLabel}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs">
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Calibration</div>
                <div className={`font-bold ${calibrationLabel === 'Calibrated' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {calibrationLabel}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs">
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Difficulty</div>
                <div className="font-bold text-slate-900 capitalize">{currentDifficulty}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo helper banner */}
      <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-amber-950">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>
            <strong>Hackathon Test Scenario:</strong> Select distractor with <strong>High Confidence</strong> to test automatic misconception &amp; theta adjustment.
          </span>
        </div>
        <button
          onClick={() => {
            setSelectedOption(0);
            setSelectedConfidence('High');
          }}
          className="text-xs font-bold text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded hover:bg-amber-300 transition-colors cursor-pointer shrink-0 ml-2"
        >
          Preset Distractor
        </button>
      </div>

      {/* Main Question Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Cognitive tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
          <span>Cognitive Dimension:</span>
          <span className="font-mono text-slate-900 capitalize">{currentItem.cognitiveLevel} &bull; {currentItem.questionType}</span>
        </div>

        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
          {currentItem.stem}
        </h2>

        {/* Options */}
        <div className="space-y-3 pt-2">
          {currentItem.options.map((opt, optIdx) => {
            const isSelected = selectedOption === optIdx;
            let cardClass =
              'w-full text-left p-4 rounded-xl border text-sm font-medium transition-all flex items-start gap-3.5 cursor-pointer ';

            if (hasSubmittedCurrent && currentOutcome) {
              const isCorrect = optIdx === currentOutcome.correctAnswer;
              if (isCorrect) {
                cardClass += 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold ring-1 ring-emerald-400';
              } else if (isSelected) {
                cardClass += 'bg-rose-50 border-rose-400 text-rose-950';
              } else {
                cardClass += 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
              }
            } else {
              if (isSelected) {
                cardClass += 'bg-blue-50/80 border-blue-600 text-blue-950 font-semibold ring-2 ring-blue-600/20';
              } else {
                cardClass += 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800';
              }
            }

            return (
              <button
                key={optIdx}
                disabled={hasSubmittedCurrent || isLoading}
                onClick={() => setSelectedOption(optIdx)}
                className={cardClass}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-colors ${
                    isSelected ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {String.fromCharCode(65 + optIdx)}
                </span>
                <span className="leading-relaxed">{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Confidence Selector */}
        {!hasSubmittedCurrent && (
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-900" />
                Select Your Confidence Level Before Submitting *
              </label>
              <span className="text-[11px] text-slate-400">Used for Metacognitive Calibration</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {confidenceOptions.map((conf) => {
                const isSelected = selectedConfidence === conf.label;
                return (
                  <button
                    key={conf.label}
                    type="button"
                    disabled={isLoading}
                    onClick={() => setSelectedConfidence(conf.label)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-900 text-white border-blue-900 shadow-xs font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 text-xs'
                    }`}
                  >
                    <div className="text-xs font-semibold">{conf.label}</div>
                    <div className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                      {conf.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* MISCONCEPTION DETECTED */}
        {activeMisconceptionAlert && (
          <div className="p-5 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 animate-shake space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-extrabold text-sm uppercase tracking-wider">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>Possible Misconception Detected!</span>
            </div>
            <p className="text-xs text-rose-900 leading-relaxed font-medium">
              {activeMisconceptionAlert}
            </p>
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('why-gap')}
                className="text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Inspect in Why-Gap Analysis &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Explanation after submission */}
        {hasSubmittedCurrent && currentOutcome && (
          <div className="space-y-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
              <div className="flex items-center justify-between mb-1.5">
                <strong className="text-slate-900">Official Solution Explanation</strong>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    currentOutcome.isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    Proficiency: {thetaToProficiencyLabel(currentOutcome.thetaAfter)}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    Calibration: {seToCalibrationLabel(currentOutcome.standardError)}
                  </span>
                </div>
              </div>
              <p className="leading-relaxed">{currentOutcome.explanation}</p>
            </div>
            {/* Technical details (collapsible) — for advanced users */}
            <details className="group">
              <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-slate-600 flex items-center gap-1 px-1">
                <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                Assessment Details (technical)
              </summary>
              <div className="mt-1.5 p-3 rounded-lg bg-[#0f1923] text-slate-300 text-[10px] font-mono">
                θ: {currentOutcome.thetaAfter.toFixed(3)} · SE: ±{currentOutcome.standardError.toFixed(3)} · Items answered: {currentOutcome.itemsAnswered}
              </div>
            </details>
          </div>
        )}

        {/* Submit or Next Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {hasSubmittedCurrent
              ? `Answer evaluated. Rasch adaptive ability estimate updated.`
              : 'Select an option and your confidence rating to submit.'}
          </div>

          {!hasSubmittedCurrent ? (
            <button
              type="button"
              disabled={selectedOption === null || isLoading}
              onClick={handleSubmitAnswer}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all ${
                selectedOption === null || isLoading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-900 hover:bg-blue-800 text-white cursor-pointer active:scale-98'
              }`}
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit Answer</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-md transition-all cursor-pointer active:scale-98"
            >
              <span>
                {currentOutcome?.isCompleted || !currentOutcome?.nextItem
                  ? 'View Final Results'
                  : 'Next Adaptive Item'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
