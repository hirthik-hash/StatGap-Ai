import React from 'react';
import { QuizAnswerRecord } from '../../types';
import { AssessmentFinalResult } from '../../services/assessmentService';
import { NavPageId } from '../common/Sidebar';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  RotateCcw,
  Gauge,
} from 'lucide-react';

interface AssessmentResultPageProps {
  records: QuizAnswerRecord[];
  score: number;
  onNavigate: (page: NavPageId) => void;
  onRetake: () => void;
  finalResult?: AssessmentFinalResult | null;
}

export const AssessmentResultPage: React.FC<AssessmentResultPageProps> = ({
  records,
  score,
  onNavigate,
  onRetake,
  finalResult,
}) => {
  const correctCount = finalResult ? finalResult.correctCount : records.filter((r) => r.isCorrect).length;
  const totalCount = finalResult ? finalResult.itemsAnswered : records.length;
  const accuracy = finalResult
    ? Math.round(finalResult.accuracyPercentage)
    : Math.round((correctCount / (totalCount || 1)) * 100);
  const displayScore = finalResult?.evaluatedCompetencyScore ?? score;
  const competencyName = finalResult?.targetCompetencyName || 'Regression Analysis';

  // Check if any record triggered a misconception
  const triggeredMisconception = records.find((r) => r.misconceptionTriggered);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-[#FFFDFC] rounded-2xl border border-[#DED2C5] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B4A35] bg-[#EEE4D8] border border-[#CBB9A7] px-2.5 py-0.5 rounded-md">
              Assessment Outcome
            </span>
            <span className="text-xs text-[#6E625A] font-mono">Competency: {competencyName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2F2520] tracking-tight">
            Assessment Results
          </h1>
          <p className="text-sm text-[#6E625A] mt-1">
            Rasch/1PL-based adaptive assessment prototype evaluation.
            <span className="block text-[11px] text-[#93877D] mt-0.5">
              Item difficulties (b) are calibrated for competency benchmarking against official standards.
            </span>
          </p>
        </div>

        <button
          onClick={onRetake}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#EEE4D8] hover:bg-[#DED2C5] text-[#3A2921] border border-[#CBB9A7] text-xs font-semibold transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#6B4A35]" />
          <span>Retake Assessment</span>
        </button>
      </div>

      {/* Psychometric Prototype Pill if finalResult present */}
      {finalResult && (
        <div className="p-4 bg-[#F8F3EB] border border-[#DED2C5] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-[#2F2520] font-medium">
            <Gauge className="w-4 h-4 text-[#6B4A35] shrink-0" />
            <div>
              <span className="font-bold text-[#2F2520]">Rasch Ability Estimate:</span>{' '}
              <span className="font-mono font-bold text-[#6B4A35]">
                θ = {finalResult.finalTheta >= 0 ? `+${finalResult.finalTheta.toFixed(2)}` : finalResult.finalTheta.toFixed(2)}
              </span>{' '}
              (SE: ±{finalResult.standardError.toFixed(2)}) &bull; Band:{' '}
              <span className="capitalize font-semibold text-[#2F2520]">{finalResult.abilityBand}</span>
            </div>
          </div>
          <div className="text-[11px] text-[#6E625A] font-mono">
            Stopping Rule: <span className="font-semibold text-[#2F2520]">{finalResult.stoppingReason}</span>
          </div>
        </div>
      )}

      {/* Main Results KPI Trio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Score */}
        <div className="bg-[#FFFDFC] p-5 rounded-2xl border border-[#DED2C5] shadow-xs">
          <span className="text-xs font-semibold text-[#6E625A] uppercase tracking-wider">
            Normalized Score
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-extrabold font-mono text-[#6B4A35]">{displayScore}%</span>
            <span className="text-xs text-[#93877D] font-mono">/ 100</span>
          </div>
          <p className="text-[11px] text-[#6E625A] mt-2">
            Evaluated across {totalCount} adaptive items
          </p>
        </div>

        {/* Accuracy */}
        <div className="bg-[#FFFDFC] p-5 rounded-2xl border border-[#DED2C5] shadow-xs">
          <span className="text-xs font-semibold text-[#6E625A] uppercase tracking-wider">
            Raw Accuracy
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-extrabold font-mono text-[#2F2520]">{accuracy}%</span>
            <span className="text-xs font-semibold text-[#2E5B34] bg-[#EFF6EF] border border-[#A8C9AC] px-1.5 py-0.5 rounded">
              {correctCount} / {totalCount} Correct
            </span>
          </div>
          <p className="text-[11px] text-[#6E625A] mt-2">
            Target threshold for full competency is 75%
          </p>
        </div>

        {/* Evaluated Competency */}
        <div className="bg-[#FFFDFC] p-5 rounded-2xl border border-[#DED2C5] shadow-xs">
          <span className="text-xs font-semibold text-[#6E625A] uppercase tracking-wider">
            Target Competency
          </span>
          <div className="text-lg font-bold text-[#2F2520] mt-2 truncate">
            {competencyName}
          </div>
          <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded bg-[#FDF6EC] text-[#7A4F1E] border border-[#D4A96A]">
            Moderate Gap (14 pts deficit)
          </span>
        </div>

        {/* Next Prescribed Action */}
        <div className="bg-gradient-to-br from-[#2A1E19] to-[#3A2921] p-5 rounded-2xl text-[#FBF8F2] shadow-md flex flex-col justify-between border border-[#4D3628]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#CBB9A7]">
              Next Prescribed Action
            </span>
            <div className="text-sm font-bold text-[#FBF8F2] mt-1">
              Complete Practical Verification
            </div>
            <p className="text-[11px] text-[#DED2C5] mt-1">
              Course completion ≠ competency. Evidence required.
            </p>
          </div>
          <button
            onClick={() => onNavigate('verification')}
            className="mt-3 w-full py-2 bg-[#EEE4D8] text-[#3A2921] text-xs font-bold rounded-lg shadow-xs hover:bg-[#DED2C5] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Proceed to Verification</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Possible Misconception Callout */}
      <div className="bg-[#FDF6EC] border-2 border-[#D4A96A] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#A97838] text-[#FFFDFC] flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A4F1E] bg-[#EDD8B4] px-2 py-0.5 rounded">
                Cognitive Trap Detected
              </span>
              <h3 className="text-base font-bold text-[#2F2520] mt-1">
                {triggeredMisconception?.misconceptionTriggered ||
                  'Regression Coefficient Misinterpretation'}
              </h3>
              <p className="text-xs text-[#6E625A] mt-1 leading-relaxed max-w-2xl">
                The officer selected the option interpreting OLS coefficients as percentage changes with high confidence. This matches our rule-based trigger for entrenched misconception.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('why-gap')}
              className="px-4 py-2.5 rounded-xl bg-[#6B4A35] hover:bg-[#523625] text-[#FBF8F2] text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              Examine Why-Gap Trace
            </button>
            <button
              onClick={() => onNavigate('learning')}
              className="px-4 py-2.5 rounded-xl bg-[#EEE4D8] hover:bg-[#DED2C5] text-[#3A2921] border border-[#CBB9A7] text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              Targeted Remediation
            </button>
          </div>
        </div>
      </div>

      {/* Item-by-Item Review List */}
      <div className="bg-[#FFFDFC] rounded-2xl border border-[#DED2C5] p-6 shadow-xs">
        <h3 className="text-base font-bold text-[#2F2520] mb-4 pb-3 border-b border-[#EEE4D8]">
          Item Response Audit ({records.length} items)
        </h3>

        <div className="space-y-4">
          {records.map((rec, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border text-xs leading-relaxed ${
                rec.isCorrect
                  ? 'bg-[#EFF6EF] border-[#A8C9AC] text-[#1F5E2A]'
                  : 'bg-[#FBF0EF] border-[#D4958F] text-[#7A2E2A]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-bold font-mono text-[#2F2520]">
                  Item #{idx + 1} &bull; Difficulty:{' '}
                  <span className="capitalize">{rec.difficulty}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#FFFDFC] border border-[#DED2C5] text-[#2F2520]">
                    Confidence: <strong>{rec.confidence}</strong>
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${
                      rec.isCorrect ? 'bg-[#C8DEC8] text-[#0E3C14]' : 'bg-[#E8C8C4] text-[#4A1510]'
                    }`}
                  >
                    {rec.isCorrect ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" /> Incorrect
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="font-semibold text-[#2F2520] mb-1">{rec.question}</div>

              {rec.misconceptionTriggered && (
                <div className="mt-2 p-2.5 rounded bg-[#FFFDFC] border border-[#D4958F] text-[#7A2E2A] flex items-center gap-2 font-medium">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-[#9A4B42]" />
                  <span>
                    Pattern: <strong>{rec.misconceptionTriggered}</strong> triggered due to high confidence on this specific distractor.
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
