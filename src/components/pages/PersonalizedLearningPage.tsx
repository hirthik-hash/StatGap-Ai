import React, { useState, useEffect } from 'react';
import { REGRESSION_MICROLEARNING_STEPS } from '../../data/mockData';
import { NavPageId } from '../common/Sidebar';
import { CompetencyService } from '../../services/competencyService';
import {
  TrainingService,
  PersonalizedRecommendationsResponse,
  InterventionRecommendation,
  ProviderStatus,
} from '../../services/trainingService';
import {
  BookOpen,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  HelpCircle,
  FileCheck2,
  ChevronRight,
  ShieldCheck,
  Building,
  GraduationCap,
  Layers,
  AlertTriangle,
  Sliders,
  Filter,
  ExternalLink,
  Target,
  Info,
  Check,
  XCircle,
  RotateCcw,
} from 'lucide-react';

interface PersonalizedLearningPageProps {
  userId: string;
  onNavigate: (page: NavPageId) => void;
  initialStepIndex?: number;
}

export const PersonalizedLearningPage: React.FC<PersonalizedLearningPageProps> = ({
  userId,
  onNavigate,
  initialStepIndex = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'optimizer' | 'microlearning'>('optimizer');

  // Optimizer state
  const [recData, setRecData] = useState<PersonalizedRecommendationsResponse | null>(null);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrollmentMsg, setEnrollmentMsg] = useState<{ id: string; text: string } | null>(null);
  const [expandedReasonId, setExpandedReasonId] = useState<string | null>(null);
  const [showExclusions, setShowExclusions] = useState<boolean>(false);

  // Constraint filters
  const [maxDuration, setMaxDuration] = useState<number | undefined>(undefined);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedDelivery, setSelectedDelivery] = useState<string>('all');

  // Microlearning state
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(initialStepIndex);
  const [completedSteps, setCompletedSteps] = useState<number[]>([0]);
  const [selectedPracticeAnswers, setSelectedPracticeAnswers] = useState<Record<number, number>>({});
  const [showExplanation, setShowExplanation] = useState<Record<number, boolean>>({});
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const pStatuses = await TrainingService.getProviderStatuses();
      setProviders(pStatuses);

      const constraints: any = {};
      if (maxDuration) constraints.max_duration_hours = maxDuration;
      if (selectedProvider !== 'all') constraints.provider_filter = [selectedProvider];
      if (selectedDelivery !== 'all') constraints.preferred_delivery_modes = [selectedDelivery];

      const res = await TrainingService.optimizeRecommendations(constraints);
      setRecData(res);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [maxDuration, selectedProvider, selectedDelivery]);

  const handleEnroll = async (resourceId: string) => {
    setEnrollingId(resourceId);
    try {
      const res = await TrainingService.enroll(resourceId);
      setEnrollmentMsg({ id: resourceId, text: res.message });
    } catch (err: any) {
      setEnrollmentMsg({ id: resourceId, text: err.message || 'Enrollment failed.' });
    } finally {
      setEnrollingId(null);
    }
  };

  const steps = REGRESSION_MICROLEARNING_STEPS;
  const currentStep = steps[currentStepIdx];
  const progressRatio = `${Math.min(steps.length, completedSteps.length)} / ${steps.length} completed`;

  const handleNext = () => {
    if (!completedSteps.includes(currentStepIdx + 1) && currentStepIdx + 1 < steps.length) {
      setCompletedSteps([...completedSteps, currentStepIdx + 1]);
    }
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  const handleCompleteLearning = () => {
    CompetencyService.markLearningCompleted(userId, 'comp_regression');
    setCompletedSteps([0, 1, 2, 3]);
    setIsCompleted(true);
  };

  const handleSelectOption = (stepIdx: number, optionIdx: number) => {
    setSelectedPracticeAnswers({ ...selectedPracticeAnswers, [stepIdx]: optionIdx });
    setShowExplanation({ ...showExplanation, [stepIdx]: true });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">
              Targeted Training Interventions
            </span>
            <span className="text-xs text-slate-500 font-mono">Phase 7 Integration Layer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Personalized Training Interventions & Curriculum Optimization
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Connecting verified competency gaps and task-readiness bottlenecks to explainable interventions from iGOT, NSSTA, and TPAC.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('optimizer')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'optimizer'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Intervention Optimizer
          </button>
          <button
            onClick={() => setActiveTab('microlearning')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'microlearning'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            15-min Micro-Pathway
          </button>
        </div>
      </div>

      {/* Provider Integration Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {providers.map((p) => {
          const isMock = p.mode === 'mock';
          const isConfigured = p.is_configured;
          let badgeColor = 'bg-amber-50 text-amber-900 border-amber-300';
          let badgeLabel = 'MOCK / DEMO';

          if (!isMock && isConfigured) {
            badgeColor = 'bg-emerald-50 text-emerald-900 border-emerald-300';
            badgeLabel = 'CONFIGURED (LIVE)';
          } else if (!isMock && !isConfigured) {
            badgeColor = 'bg-rose-50 text-rose-900 border-rose-300';
            badgeLabel = 'NOT CONFIGURED';
          } else if (p.provider === 'tpac') {
            badgeColor = 'bg-blue-50 text-blue-900 border-blue-300';
            badgeLabel = 'APPROVED CATALOGUE';
          }

          return (
            <div
              key={p.provider}
              className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 uppercase">
                  {p.provider}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-slate-400 capitalize">{p.mode} Mode</div>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                {badgeLabel}
              </span>
            </div>
          );
        })}
      </div>

      {activeTab === 'optimizer' ? (
        /* ── INTERVENTION OPTIMIZER VIEW ───────────────────────────── */
        <div className="space-y-6">
          {/* Priority Context Card (Gap + Task Bottleneck) */}
          {recData && (
            <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-600 text-white px-2.5 py-0.5 rounded">
                    Officer Competency Context
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ID: {recData.officer_igot_id} ({recData.cadre})
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Targeted Interventions Evaluated: <strong className="text-white">{recData.total_candidates_evaluated}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Priority Gap */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Priority Competency Gap
                  </div>
                  <div className="text-lg font-black text-white">
                    {recData.priority_gap_competency_name || 'Sampling Design & Audit'}
                  </div>
                  <div className="text-xs text-slate-300">
                    Severity Band:{' '}
                    <span className="font-bold text-rose-300 uppercase">
                      {recData.priority_gap_severity || 'Moderate Gap'}
                    </span>{' '}
                    &bull; Observed Gap:{' '}
                    <span className="font-mono text-white">
                      {recData.priority_gap_value ? `${(recData.priority_gap_value * 100).toFixed(0)}%` : '35%'}
                    </span>
                  </div>
                </div>

                {/* Task Readiness Bottleneck */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Target className="w-4 h-4" />
                    Task Readiness Bottleneck
                  </div>
                  <div className="text-lg font-black text-white">
                    {recData.active_bottleneck_task_title || 'Produce Survey Estimate (MoSPI Operational Role)'}
                  </div>
                  <div className="text-xs text-slate-300">
                    Limiting Factor:{' '}
                    <span className="text-amber-200 font-medium">
                      Current readiness for this task is bounded by the {recData.priority_gap_competency_name} gap.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Constraint Filters Control Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Sliders className="w-4 h-4 text-blue-900" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Configurable Optimization Constraints
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Duration Limit */}
              <div>
                <label className="block text-slate-600 font-bold mb-1.5">
                  Max Training Duration
                </label>
                <select
                  value={maxDuration || 'all'}
                  onChange={(e) =>
                    setMaxDuration(e.target.value === 'all' ? undefined : Number(e.target.value))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:ring-2 focus:ring-blue-900"
                >
                  <option value="all">Any Duration (No limit)</option>
                  <option value="10">≤ 10 Hours (Microlearning)</option>
                  <option value="20">≤ 20 Hours (Short Course)</option>
                  <option value="35">≤ 35 Hours (Residential)</option>
                </select>
              </div>

              {/* Provider Filter */}
              <div>
                <label className="block text-slate-600 font-bold mb-1.5">
                  Provider Filter
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:ring-2 focus:ring-blue-900"
                >
                  <option value="all">All Providers (iGOT + NSSTA + TPAC)</option>
                  <option value="igot">iGOT Karmayogi (LMS)</option>
                  <option value="nssta">NSSTA Academy (Residential/Labs)</option>
                  <option value="tpac">TPAC Approved Curriculum</option>
                </select>
              </div>

              {/* Delivery Mode */}
              <div>
                <label className="block text-slate-600 font-bold mb-1.5">
                  Delivery Mode
                </label>
                <select
                  value={selectedDelivery}
                  onChange={(e) => setSelectedDelivery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:ring-2 focus:ring-blue-900"
                >
                  <option value="all">All Delivery Modes</option>
                  <option value="online_self_paced">Online Self-Paced</option>
                  <option value="classroom_residential">Classroom / Residential</option>
                  <option value="blended">Blended / Hybrid</option>
                  <option value="virtual_instructor_led">Virtual Instructor-Led</option>
                </select>
              </div>
            </div>
          </div>

          {/* Recommended Interventions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-900" />
                <span>Optimized Training Interventions</span>
                {recData && (
                  <span className="text-xs font-mono font-normal text-slate-500">
                    ({recData.recommendations.length} recommended)
                  </span>
                )}
              </h2>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-500 text-sm bg-white rounded-2xl border border-slate-200">
                Running Deterministic Training Intervention Optimizer...
              </div>
            ) : !recData || recData.recommendations.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
                No matching programmes found for the selected constraints. Try relaxing the duration or delivery mode filters.
              </div>
            ) : (
              <div className="space-y-4">
                {recData.recommendations.map((rec, idx) => {
                  const res = rec.resource;
                  const isExpanded = expandedReasonId === res.id;
                  const isIgot = res.provider === 'igot';
                  const isNssta = res.provider === 'nssta';
                  const isTpac = res.provider === 'tpac';

                  let providerBadge = {
                    name: 'iGOT Karmayogi',
                    bg: 'bg-blue-50 text-blue-900 border-blue-200',
                  };
                  if (isNssta) {
                    providerBadge = {
                      name: 'NSSTA Academy',
                      bg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
                    };
                  } else if (isTpac) {
                    providerBadge = {
                      name: 'TPAC Approved',
                      bg: 'bg-purple-50 text-purple-900 border-purple-200',
                    };
                  }

                  return (
                    <div
                      key={res.id}
                      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-blue-300 transition-all space-y-4"
                    >
                      {/* Top Meta Line */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${providerBadge.bg}`}
                          >
                            {providerBadge.name}
                          </span>
                          <span className="text-xs font-mono text-slate-400">{res.external_reference_id}</span>
                          {res.is_mock && (
                            <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                              DEMO / MOCK
                            </span>
                          )}
                        </div>

                        {/* Optimizer Fit Score */}
                        <div className="flex items-center gap-2 bg-blue-50/70 border border-blue-200 px-3 py-1 rounded-xl">
                          <span className="text-[11px] font-bold text-blue-950 uppercase tracking-wider">
                            Fit Score:
                          </span>
                          <span className="text-sm font-black font-mono text-blue-900">
                            {(rec.score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{res.title}</h3>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{res.description}</p>
                      </div>

                      {/* Attributes Strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-xl">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Duration
                          </span>
                          <span className="font-bold font-mono text-slate-800 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-blue-700" />
                            {res.duration_hours} Hours
                          </span>
                        </div>

                        <div className="p-2.5 bg-slate-50 rounded-xl">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Delivery Mode
                          </span>
                          <span className="font-bold text-slate-800 capitalize mt-0.5 block truncate">
                            {res.delivery_mode.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="p-2.5 bg-slate-50 rounded-xl">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Target Cadre
                          </span>
                          <span className="font-bold text-slate-800 mt-0.5 block truncate">
                            {res.target_cadre.join(', ') || 'All Cadres'}
                          </span>
                        </div>

                        <div className="p-2.5 bg-slate-50 rounded-xl">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            Prerequisites
                          </span>
                          <span className="font-bold text-slate-800 mt-0.5 block truncate">
                            {rec.satisfies_prerequisites ? (
                              <span className="text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Satisfied
                              </span>
                            ) : (
                              <span className="text-rose-600 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Pending
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Why Recommended Explainable Accordion */}
                      <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5 uppercase tracking-wider">
                            <Info className="w-4 h-4 text-blue-800" />
                            Why Recommended for This Officer:
                          </div>
                          <button
                            onClick={() => setExpandedReasonId(isExpanded ? null : res.id)}
                            className="text-[11px] text-blue-800 font-bold hover:underline cursor-pointer"
                          >
                            {isExpanded ? 'Hide Factor Breakdown' : 'View Scoring Breakdown'}
                          </button>
                        </div>

                        <ul className="space-y-1 text-xs text-blue-900 font-medium">
                          {rec.reasons.map((r, rIdx) => (
                            <li key={rIdx} className="flex items-start gap-2">
                              <span className="text-blue-600 font-bold mt-0.5">&bull;</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Detailed Factor Breakdown if expanded */}
                        {isExpanded && (
                          <div className="pt-3 border-t border-blue-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                            {Object.entries(rec.factor_breakdown).map(([k, val]) => {
                              const v = val as import('../../services/trainingService').FactorScoreDetail;
                              return (
                                <div key={k} className="bg-white p-2 rounded-lg border border-blue-200/60">
                                  <div className="text-[10px] text-slate-500 capitalize truncate">
                                    {k.replace(/_/g, ' ')}
                                  </div>
                                  <div className="font-mono font-bold text-blue-950 mt-0.5">
                                    {v && typeof v.raw_score === 'number' ? `${(v.raw_score * 100).toFixed(0)}%` : '0%'} (w: {v?.weight ?? 0})
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Syllabus / Highlights */}
                      {res.syllabus_highlights.length > 0 && (
                        <div className="text-xs text-slate-600 space-y-1">
                          <span className="font-bold text-slate-700 block">Syllabus Modules:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {res.syllabus_highlights.map((s, sIdx) => (
                              <span
                                key={sIdx}
                                className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bottom Action Bar */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-slate-500 font-mono">
                          {enrollmentMsg && enrollmentMsg.id === res.id ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {enrollmentMsg.text}
                            </span>
                          ) : (
                            <span>Provider: {providerBadge.name}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isIgot && (
                            <button
                              onClick={() => onNavigate('igot-integration')}
                              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>iGOT LMS Hub</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleEnroll(res.id)}
                            disabled={enrollingId === res.id}
                            className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 active:scale-98 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5 text-amber-300" />
                            <span>
                              {enrollingId === res.id ? 'Processing...' : 'Enroll / Assign Pathway'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Deterministic Exclusions Section */}
          {recData && recData.excluded_interventions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Excluded Catalog Programmes ({recData.excluded_interventions.length})
                  </h3>
                </div>
                <button
                  onClick={() => setShowExclusions(!showExclusions)}
                  className="text-xs font-bold text-blue-900 hover:underline cursor-pointer"
                >
                  {showExclusions ? 'Hide Excluded' : 'View Excluded Programmes'}
                </button>
              </div>

              {showExclusions && (
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  {recData.excluded_interventions.map((ex, exIdx) => (
                    <div
                      key={exIdx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{ex.title}</span>
                        <span className="text-[10px] font-mono text-slate-400 ml-2 uppercase">
                          [{ex.provider}]
                        </span>
                      </div>
                      <span className="text-rose-700 font-medium text-[11px]">
                        {ex.exclusion_reason}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Scientific Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              <strong>Scientific & Administrative Integrity Note:</strong> Training intervention recommendations are deterministically scored based on verified competency gaps, sub-skill alignment, operational task bottlenecks, prerequisite fit, and configured duration constraints. The platform does NOT fabricate unsupported outcome claims (such as "+25% productivity").
            </span>
          </div>
        </div>
      ) : (
        /* ── GUIDED MICRO-LEARNING PATHWAY (Existing Walkthrough) ──── */
        <div className="space-y-6">
          {/* Completion Modal / Banner if completed */}
          {isCompleted ? (
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border-2 border-emerald-400 p-8 text-center shadow-lg animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-4 shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/60 px-3 py-1 rounded-full">
                Micro-Pathway Complete
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-emerald-950 mt-2">
                Learning Completed ✓
              </h2>
              <p className="text-sm text-emerald-900 max-w-lg mx-auto mt-2 leading-relaxed">
                You have mastered the distinction between absolute marginal change (dy/dx) and percentage elasticities in linear vs log models. Course completion alone does not prove competency — proceed to verification!
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => onNavigate('assessments')}
                  className="px-6 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <FileCheck2 className="w-4 h-4 text-amber-300" />
                  <span>Take Verification Assessment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('verification')}
                  className="px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm border border-slate-300 shadow-xs cursor-pointer"
                >
                  View Verification Timeline
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Progress Bar & Steps Nav */}
              <div className="border-b border-slate-200 bg-slate-50/70 p-4">
                <div className="grid grid-cols-4 gap-2">
                  {steps.map((s, idx) => {
                    const isActive = currentStepIdx === idx;
                    const isStepCompleted = completedSteps.includes(idx);
                    return (
                      <button
                        key={s.stepNumber}
                        onClick={() => setCurrentStepIdx(idx)}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                            : isStepCompleted
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span className={isActive ? 'text-blue-200' : 'text-slate-400'}>
                            Step {s.stepNumber}/4
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {s.duration}
                          </span>
                        </div>
                        <div
                          className={`text-xs font-bold truncate ${
                            isActive ? 'text-white' : isStepCompleted ? 'text-emerald-900' : 'text-slate-800'
                          }`}
                        >
                          {s.type === 'concept'
                            ? '1. Concept'
                            : s.type === 'worked_example'
                            ? '2. Worked Example'
                            : s.type === 'practice'
                            ? '3. Practice'
                            : '4. Quick Verification'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Step Content Body */}
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded font-mono">
                      Stage {currentStep.stepNumber} of 4 &bull; {currentStep.duration}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">{currentStep.subtitle}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    {currentStep.title}
                  </h2>
                </div>

                <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200 text-slate-800 text-sm leading-relaxed whitespace-pre-line font-sans">
                  {currentStep.content}
                </div>

                <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-950">
                      Key Statistical Takeaway
                    </div>
                    <p className="text-xs text-blue-900 mt-0.5 font-medium">
                      {currentStep.keyTakeaway}
                    </p>
                  </div>
                </div>

                {currentStep.interactiveQuestion && (
                  <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-blue-600 text-white text-xs font-bold uppercase tracking-wider">
                        Interactive Checkpoint
                      </span>
                      <span className="text-xs text-slate-400">Choose the best option</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100">
                      {currentStep.interactiveQuestion.question}
                    </h3>

                    <div className="space-y-2">
                      {currentStep.interactiveQuestion.options.map((opt, optIdx) => {
                        const selected = selectedPracticeAnswers[currentStepIdx] === optIdx;
                        const isCorrect = optIdx === currentStep.interactiveQuestion?.correctIndex;
                        const isAnswered = selectedPracticeAnswers[currentStepIdx] !== undefined;

                        let btnClass =
                          'w-full text-left p-3.5 rounded-xl border text-xs font-medium transition-all flex items-start gap-3 cursor-pointer ';

                        if (isAnswered) {
                          if (isCorrect) {
                            btnClass += 'bg-emerald-950/80 border-emerald-400 text-emerald-100 font-bold';
                          } else if (selected) {
                            btnClass += 'bg-rose-950/80 border-rose-400 text-rose-100';
                          } else {
                            btnClass += 'bg-slate-800/40 border-slate-700/60 text-slate-400 opacity-60';
                          }
                        } else {
                          btnClass += 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200';
                        }

                        return (
                          <button
                            key={optIdx}
                            onClick={() => handleSelectOption(currentStepIdx, optIdx)}
                            className={btnClass}
                          >
                            <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-mono text-[11px] shrink-0 font-bold">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {showExplanation[currentStepIdx] && (
                      <div className="p-3.5 rounded-xl bg-blue-950/90 border border-blue-500/40 text-xs text-blue-200 leading-relaxed animate-fadeIn">
                        <strong className="text-white block mb-1">Explanation:</strong>
                        {currentStep.interactiveQuestion.explanation}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Step Actions */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentStepIdx === 0}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      currentStepIdx === 0
                        ? 'opacity-40 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer'
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Previous Step</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {currentStepIdx < steps.length - 1 ? (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        <span>Next: {steps[currentStepIdx + 1].type.replace('_', ' ')}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCompleteLearning}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Complete Learning</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
