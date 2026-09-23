import React, { useState, useEffect, useRef } from 'react';
import { ConfidenceLevel, QuestionDifficulty, QuizAnswerRecord } from '../../types';
import { AiService } from '../../services/aiService';
import { AssessmentService, AdaptiveItem, AssessmentFinalResult, ResponseOutcome } from '../../services/assessmentService';
import { apiClient } from '../../services/apiClient';
import { NavPageId } from '../common/Sidebar';
import { thetaToProficiencyLabel, seToCalibrationLabel } from '../../utils/gapxResolver';
import {
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

  // ── When targetCompetencyId changes, sync resolvedCompetencyId ──
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

  // ── When we have a resolved competency ID, start assessment ──
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

  // ── COMPETENCY PICKER ──
  if (!resolvedCompetencyId) {
    return (
      <div className="space-y-6 pb-12 animate-fadeIn">
        {/* Header */}
        <div className="bg-[#FFFDFC] rounded-2xl border border-[#DED2C5] p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B4A35] bg-[#EEE4D8] border border-[#CBB9A7] px-2.5 py-0.5 rounded-md">
              Rasch/1PL Adaptive Assessment Engine
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#2F2520] tracking-tight mt-1">
            Select a Competency to Assess
          </h1>
          <p className="text-sm text-[#6E625A] mt-1">
            Choose a competency from the list below to begin your adaptive assessment session.
          </p>
        </div>

        {/* Picker body */}
        <div className="bg-[#FFFDFC] rounded-2xl border border-[#DED2C5] p-6 shadow-xs">
          {pickerLoading && (
            <div className="flex items-center gap-3 text-[#6E625A] text-sm py-6">
              <Loader2 className="w-5 h-5 text-[#6B4A35] animate-spin" />
              Loading competencies from backend…
            </div>
          )}

          {pickerError && (
            <div className="flex flex-col items-start gap-3 p-4 rounded-xl bg-[#FBF0EF] border border-[#D4958F] text-xs text-[#7A2E2A]">
              <div className="flex items-center gap-2 font-bold text-[#9A4B42]">
                <AlertTriangle className="w-4 h-4" />
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEE4D8] hover:bg-[#DED2C5] text-[#3A2921] border border-[#CBB9A7] font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          )}

          {!pickerLoading && !pickerError && pickerCompetencies.length === 0 && (
            <p className="text-sm text-[#6E625A] italic py-4">
              No competencies found in the backend. Please ensure the database has been seeded.
            </p>
          )}

          {!pickerLoading && !pickerError && pickerCompetencies.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#6E625A] uppercase tracking-wider mb-2">
                Available Competencies ({pickerCompetencies.length})
              </div>
              {pickerCompetencies.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => handleSelectCompetency(comp.id)}
                  className="w-full text-left p-4 rounded-xl border border-[#DED2C5] bg-[#FFFDFC] hover:bg-[#F8F3EB] hover:border-[#8A6A52] transition-all flex items-center justify-between gap-4 group cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#2F2520] group-hover:text-[#6B4A35] transition-colors">{comp.name}</span>
                      <span className="text-[10px] font-mono text-[#6E625A] bg-[#F8F3EB] border border-[#DED2C5] px-1.5 py-0.5 rounded">
                        {comp.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          comp.status === 'competent'
                            ? 'bg-[#EFF6EF] text-[#2E5B34] border-[#A8C9AC]'
                            : comp.status === 'moderate_gap'
                            ? 'bg-[#FDF6EC] text-[#7A4F1E] border-[#D4A96A]'
                            : 'bg-[#FBF0EF] text-[#7A2E2A] border-[#D4958F]'
                        }`}
                      >
                        {comp.status === 'competent'
                          ? 'Competent'
                          : comp.status === 'moderate_gap'
                          ? 'Moderate Gap'
                          : 'Critical Gap'}
                      </span>
                    </div>
                    <div className="text-xs text-[#6E625A] mt-0.5 font-mono">
                      Score: {comp.score}% · Required: {comp.requiredScore}%
                      {comp.gapPoints > 0 && ` · Gap: ${comp.gapPoints}pts`}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#93877D] group-hover:text-[#6B4A35] shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── LOADING STATE ──
  if (isLoading && !currentItem) {
    return (
      <div className="officer-card p-12 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-[#6B4A35] animate-spin mx-auto" />
        <h3 className="text-base font-bold text-[#2F2520]">Initializing Adaptive Assessment Engine…</h3>
        <p className="text-xs text-[#6E625A]">
          Calibrating initial proficiency estimate against the competency knowledge graph.
        </p>
      </div>
    );
  }

  // ── ERROR STATE ──
  if (errorMessage && !currentItem) {
    return (
      <div className="bg-[#FFFDFC] rounded-2xl border border-[#D4958F] p-8 shadow-xs text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-[#9A4B42] mx-auto" />
        <h3 className="text-lg font-bold text-[#2F2520]">Adaptive Assessment Engine Offline</h3>
        <p className="text-xs text-[#6E625A] max-w-md mx-auto">{errorMessage}</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => initAssessment(resolvedCompetencyId)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6B4A35] hover:bg-[#523625] text-[#FBF8F2] text-xs font-bold transition-all cursor-pointer shadow-xs"
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EEE4D8] hover:bg-[#DED2C5] text-[#3A2921] border border-[#CBB9A7] text-xs font-bold transition-all cursor-pointer"
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
              <span className="text-[11px] text-[#6E625A]">Question {currentQuestionIdx + 1}</span>
            </div>
            <h1 className="text-2xl font-black text-[#2F2520] tracking-tight">
              Competency Assessment
            </h1>
            <p className="text-sm text-[#6E625A] mt-1">
              Adaptive questioning calibrated to your current proficiency level.
            </p>
          </div>

          {/* Officer-readable status chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F8F3EB] border border-[#DED2C5]">
              <Gauge className="w-3.5 h-3.5 text-[#6B4A35]" />
              <div className="text-xs">
                <div className="text-[9px] font-bold uppercase tracking-wider text-[#6E625A]">Proficiency</div>
                <div className="font-bold text-[#2F2520]">{proficiencyLabel}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F8F3EB] border border-[#DED2C5]">
              <div className="text-xs">
                <div className="text-[9px] font-bold uppercase tracking-wider text-[#6E625A]">Calibration</div>
                <div className={`font-bold ${calibrationLabel === 'Calibrated' ? 'text-[#2E5B34]' : 'text-[#7A4F1E]'}`}>
                  {calibrationLabel}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F8F3EB] border border-[#DED2C5]">
              <div className="text-xs">
                <div className="text-[9px] font-bold uppercase tracking-wider text-[#6E625A]">Difficulty</div>
                <div className="font-bold text-[#2F2520] capitalize">{currentDifficulty}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo helper banner */}
      <div className="p-3 bg-[#FDF6EC] border border-[#D4A96A] rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-[#7A4F1E]">
          <Sparkles className="w-4 h-4 text-[#A97838]" />
          <span>
            <strong>Hackathon Test Scenario:</strong> Select distractor with <strong>High Confidence</strong> to test automatic misconception &amp; theta adjustment.
          </span>
        </div>
        <button
          onClick={() => {
            setSelectedOption(0);
            setSelectedConfidence('High');
          }}
          className="text-xs font-bold text-[#7A4F1E] bg-[#EDD8B4] border border-[#D4A96A] px-2.5 py-1 rounded hover:bg-[#D4A96A] hover:text-[#FFFDFC] transition-colors cursor-pointer shrink-0 ml-2"
        >
          Preset Distractor
        </button>
      </div>

      {/* Main Question Card */}
      <div className="bg-[#FFFDFC] rounded-2xl border border-[#DED2C5] p-6 sm:p-8 shadow-xs space-y-6">
        {/* Cognitive tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#F8F3EB] border border-[#DED2C5] text-[#3A2921] text-xs font-semibold">
          <span>Cognitive Dimension:</span>
          <span className="font-mono text-[#2F2520] capitalize">{currentItem.cognitiveLevel} &bull; {currentItem.questionType}</span>
        </div>

        <h2 className="text-lg sm:text-xl font-extrabold text-[#2F2520] leading-snug">
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
                cardClass += 'bg-[#EFF6EF] border-[#547A5A] text-[#1F5E2A] font-semibold ring-1 ring-[#547A5A]';
              } else if (isSelected) {
                cardClass += 'bg-[#FBF0EF] border-[#9A4B42] text-[#7A2E2A]';
              } else {
                cardClass += 'bg-[#F8F3EB] border-[#DED2C5] text-[#93877D] opacity-60';
              }
            } else {
              if (isSelected) {
                cardClass += 'bg-[#EEE4D8] border-[#6B4A35] text-[#2F2520] font-semibold ring-2 ring-[#6B4A35]/25';
              } else {
                cardClass += 'bg-[#FFFDFC] hover:bg-[#F8F3EB] border-[#DED2C5] text-[#2F2520]';
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
                    isSelected ? 'bg-[#6B4A35] text-[#FBF8F2]' : 'bg-[#F8F3EB] text-[#6E625A] border border-[#DED2C5]'
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
          <div className="pt-4 border-t border-[#EEE4D8]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#2F2520] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#6B4A35]" />
                Select Your Confidence Level Before Submitting *
              </label>
              <span className="text-[11px] text-[#6E625A]">Used for Metacognitive Calibration</span>
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
                        ? 'bg-[#6B4A35] text-[#FBF8F2] border-[#6B4A35] shadow-xs font-bold'
                        : 'bg-[#F8F3EB] hover:bg-[#EEE4D8] text-[#3A2921] border-[#DED2C5] text-xs'
                    }`}
                  >
                    <div className="text-xs font-semibold">{conf.label}</div>
                    <div className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-[#F3E9D8]' : 'text-[#6E625A]'}`}>
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
          <div className="p-5 rounded-xl bg-[#FBF0EF] border-2 border-[#D4958F] text-[#7A2E2A] animate-shake space-y-2">
            <div className="flex items-center gap-2 text-[#9A4B42] font-extrabold text-sm uppercase tracking-wider">
              <ShieldAlert className="w-5 h-5 text-[#9A4B42]" />
              <span>Possible Misconception Detected!</span>
            </div>
            <p className="text-xs text-[#7A2E2A] leading-relaxed font-medium">
              {activeMisconceptionAlert}
            </p>
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('why-gap')}
                className="text-xs font-bold text-[#7A2E2A] bg-[#EEE4D8] hover:bg-[#DED2C5] border border-[#CBB9A7] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Inspect in Why-Gap Analysis &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Explanation after submission */}
        {hasSubmittedCurrent && currentOutcome && (
          <div className="space-y-2">
            <div className="p-4 rounded-xl bg-[#F8F3EB] border border-[#DED2C5] text-xs text-[#2F2520] leading-relaxed">
              <div className="flex items-center justify-between mb-1.5">
                <strong className="text-[#2F2520]">Official Solution Explanation</strong>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    currentOutcome.isCorrect ? 'bg-[#EFF6EF] text-[#2E5B34] border-[#A8C9AC]' : 'bg-[#FBF0EF] text-[#7A2E2A] border-[#D4958F]'
                  }`}>
                    Proficiency: {thetaToProficiencyLabel(currentOutcome.thetaAfter)}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#EEE4D8] text-[#3A2921] border border-[#CBB9A7]">
                    Calibration: {seToCalibrationLabel(currentOutcome.standardError)}
                  </span>
                </div>
              </div>
              <p className="leading-relaxed text-[#3A2921]">{currentOutcome.explanation}</p>
            </div>
            {/* Technical details (collapsible) */}
            <details className="group">
              <summary className="text-[10px] text-[#6E625A] cursor-pointer hover:text-[#2F2520] flex items-center gap-1 px-1">
                <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                Assessment Details (technical)
              </summary>
              <div className="mt-1.5 p-3 rounded-lg bg-[#2A1E19] text-[#EEE4D8] text-[10px] font-mono border border-[#4D3628]">
                θ: {currentOutcome.thetaAfter.toFixed(3)} · SE: ±{currentOutcome.standardError.toFixed(3)} · Items answered: {currentOutcome.itemsAnswered}
              </div>
            </details>
          </div>
        )}

        {/* Submit or Next Button */}
        <div className="pt-4 border-t border-[#EEE4D8] flex items-center justify-between">
          <div className="text-xs text-[#6E625A]">
            {hasSubmittedCurrent
              ? `Answer evaluated. Rasch adaptive ability estimate updated.`
              : 'Select an option and your confidence rating to submit.'}
          </div>

          {!hasSubmittedCurrent ? (
            <button
              type="button"
              disabled={selectedOption === null || isLoading}
              onClick={handleSubmitAnswer}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all ${
                selectedOption === null || isLoading
                  ? 'bg-[#EEE4D8] text-[#B8A28F] border border-[#DED2C5] cursor-not-allowed'
                  : 'bg-[#6B4A35] hover:bg-[#523625] text-[#FBF8F2] cursor-pointer active:scale-98'
              }`}
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit Answer</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextQuestion}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#6B4A35] hover:bg-[#523625] text-[#FBF8F2] text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-98"
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
