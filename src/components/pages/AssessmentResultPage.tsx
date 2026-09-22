import React from 'react';
import { QuizAnswerRecord } from '../../types';
import { AssessmentFinalResult } from '../../services/assessmentService';
import { NavPageId } from '../common/Sidebar';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  RotateCcw,
  BookOpen,
  FileCheck2,
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
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
              Assessment Outcome
            </span>
            <span className="text-xs text-slate-500 font-mono">Competency: {competencyName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Assessment Results
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Genuine Rasch/1PL-based adaptive assessment prototype evaluation.
            <span className="block text-[11px] text-slate-400 mt-0.5">
              Item difficulties (b) are prototype/expert-calibrated values for demonstration, not nationally standardized estimates.
            </span>
          </p>
        </div>

        <button
          onClick={onRetake}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retake Assessment</span>
        </button>
      </div>

      {/* Psychometric Prototype Pill if finalResult present */}
      {finalResult && (
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-blue-950 font-medium">
            <Gauge className="w-4 h-4 text-blue-800 shrink-0" />
            <div>
              <span className="font-bold text-blue-900">Rasch Ability Estimate:</span>{' '}
              <span className="font-mono font-bold">
                θ = {finalResult.finalTheta >= 0 ? `+${finalResult.finalTheta.toFixed(2)}` : finalResult.finalTheta.toFixed(2)}
              </span>{' '}
              (SE: ±{finalResult.standardError.toFixed(2)}) &bull; Band:{' '}
              <span className="capitalize font-semibold text-blue-900">{finalResult.abilityBand}</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Stopping Rule: <span className="font-semibold text-slate-700">{finalResult.stoppingReason}</span>
          </div>
        </div>
      )}

      {/* Main Results KPI Trio (Section 17) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Score */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Normalized Score
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-extrabold font-mono text-blue-900">{displayScore}%</span>
            <span className="text-xs text-slate-500 font-mono">/ 100</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Evaluated across {totalCount} adaptive items
          </p>
        </div>

        {/* Accuracy */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Raw Accuracy
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-extrabold font-mono text-slate-900">{accuracy}%</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              {correctCount} / {totalCount} Correct
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Target threshold for full competency is 75%
          </p>
        </div>

        {/* Evaluated Competency */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Target Competency
          </span>
          <div className="text-lg font-bold text-slate-900 mt-2 truncate">
            Regression Analysis
          </div>
          <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
            Moderate Gap (14 pts deficit)
          </span>
        </div>

        {/* Next Prescribed Action */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 p-5 rounded-2xl text-white shadow-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
              Next Prescribed Action
            </span>
            <div className="text-sm font-bold text-white mt-1">
              Complete Practical Verification
            </div>
            <p className="text-[11px] text-blue-200 mt-1">
              Course completion ≠ competency. Evidence required.
            </p>
          </div>
          <button
            onClick={() => onNavigate('verification')}
            className="mt-3 w-full py-2 bg-white text-blue-900 text-xs font-bold rounded-lg shadow-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Proceed to Verification</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Possible Misconception Callout (Section 17) */}
      <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200 px-2 py-0.5 rounded">
                Cognitive Trap Detected
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                {triggeredMisconception?.misconceptionTriggered ||
                  'Regression Coefficient Misinterpretation'}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
                The officer selected the option interpreting OLS coefficients as percentage changes with high confidence. This matches our rule-based trigger for entrenched misconception.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('why-gap')}
              className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              Examine Why-Gap Trace
            </button>
            <button
              onClick={() => onNavigate('learning')}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              Targeted Remediation
            </button>
          </div>
        </div>
      </div>

      {/* Item-by-Item Review List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
          Item Response Audit ({records.length} items)
        </h3>

        <div className="space-y-4">
          {records.map((rec, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border text-xs leading-relaxed ${
                rec.isCorrect
                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50/50 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-bold font-mono">
                  Item #{idx + 1} &bull; Difficulty:{' '}
                  <span className="capitalize">{rec.difficulty}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200">
                    Confidence: <strong>{rec.confidence}</strong>
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] flex items-center gap-1 ${
                      rec.isCorrect ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
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

              <div className="font-semibold text-slate-900 mb-1">{rec.question}</div>

              {rec.misconceptionTriggered && (
                <div className="mt-2 p-2.5 rounded bg-white border border-rose-300 text-rose-800 flex items-center gap-2 font-medium">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
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
