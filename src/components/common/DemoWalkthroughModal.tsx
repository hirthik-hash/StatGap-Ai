import React from 'react';
import { Sparkles, ChevronRight, X } from 'lucide-react';
import { NavPageId } from './Sidebar';

interface DemoWalkthroughModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToStep: (page: NavPageId, extraAction?: string) => void;
}

export const DemoWalkthroughModal: React.FC<DemoWalkthroughModalProps> = ({
  isOpen,
  onClose,
  onJumpToStep,
}) => {
  if (!isOpen) return null;

  const steps = [
    {
      num: 1,
      title: 'Login with iGOT ID',
      desc: 'Use demo ID IGOT202600123 / Stat@123 for Officer Ananya Sharma',
      page: 'dashboard' as NavPageId,
      action: 'login',
    },
    {
      num: 2,
      title: 'Main Dashboard & KPIs',
      desc: 'View 72% Overall Competency, 2 Critical, 3 Moderate Gaps, GAP-X Loop',
      page: 'dashboard' as NavPageId,
    },
    {
      num: 3,
      title: 'Click Regression (61%)',
      desc: 'Inspect econometric modeling competency and 14pt gap',
      page: 'competency-map' as NavPageId,
      action: 'select_regression',
    },
    {
      num: 4,
      title: 'Competency Multi-Evidence',
      desc: '4/6 incorrect, 58% quiz accuracy, 62% practical performance, 3 repeated errors',
      page: 'gap-analysis' as NavPageId,
      action: 'select_regression',
    },
    {
      num: 5,
      title: 'Click "Why is this my gap?"',
      desc: 'Deep explainability into diagnostic multi-source signals',
      page: 'why-gap' as NavPageId,
    },
    {
      num: 6,
      title: 'Why-Gap & Misconception Detection',
      desc: 'Regression Coefficient Misinterpretation (conflating marginal rate with % change)',
      page: 'why-gap' as NavPageId,
    },
    {
      num: 7,
      title: 'Start Targeted Micro-Learning',
      desc: '15-minute 4-stage micro-learning pathway designed for government statistical officers',
      page: 'learning' as NavPageId,
    },
    {
      num: 8,
      title: 'Complete 4 Learning Stages',
      desc: 'Concept → Worked Example → Practice Question → Quick Verification',
      page: 'learning' as NavPageId,
      action: 'complete_all',
    },
    {
      num: 9,
      title: 'Take Adaptive Assessment',
      desc: 'Item difficulty adapts dynamically (Easy → Medium → Hard)',
      page: 'assessments' as NavPageId,
    },
    {
      num: 10,
      title: 'Trigger Misconception Detector',
      desc: 'Demonstrate: Wrong Answer + High Confidence → "Possible Misconception Detected"',
      page: 'assessments' as NavPageId,
      action: 'demo_trap',
    },
    {
      num: 11,
      title: 'Competency Verification Timeline',
      desc: 'Learn → Practice → Assessment → Practical Evidence → Verified Competency ✓',
      page: 'verification' as NavPageId,
    },
    {
      num: 12,
      title: 'Knowledge Decay Monitor',
      desc: 'Ebbinghaus decay curve tracking memory retention drop below 75% standard',
      page: 'knowledge-decay' as NavPageId,
    },
    {
      num: 13,
      title: 'Refresh Recommended Alert',
      desc: 'Current 84% → 30 Days 79% → 90 Days 71% with 1-click micro-refresher',
      page: 'knowledge-decay' as NavPageId,
    },
    {
      num: 14,
      title: 'Mock iGOT Karmayogi Integration',
      desc: 'Displays logged-in officer credentials, connected courses & competency layer relationship',
      page: 'igot-integration' as NavPageId,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2A1E19]/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FFFDFC] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#DED2C5] overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#2A1E19] to-[#3A2921] text-[#FBF8F2] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#6B4A35]/40 border border-[#8A6A52]/50 flex items-center justify-center text-[#F3E9D8]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Hackathon Demo Flow (14 Steps)</h2>
              <p className="text-xs text-[#CBB9A7]">
                The complete GAP-X Loop: Observe → Map → Diagnose → Why-Gap → Learn → Verify → Decay
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#CBB9A7] hover:text-[#FBF8F2] rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Steps */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          <div className="text-xs font-semibold text-[#6E625A] uppercase tracking-wider mb-2">
            Click any step to navigate immediately into that flow state:
          </div>

          {steps.map((step) => (
            <div
              key={step.num}
              onClick={() => {
                onJumpToStep(step.page, step.action);
                onClose();
              }}
              className="group cursor-pointer flex items-center justify-between p-3 rounded-xl border border-[#DED2C5] hover:border-[#8A6A52] hover:bg-[#F8F3EB] transition-all shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-7 h-7 rounded-full bg-[#EEE4D8] group-hover:bg-[#6B4A35] group-hover:text-[#FBF8F2] text-[#3A2921] font-bold text-xs flex items-center justify-center shrink-0 font-mono transition-colors">
                  {step.num}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#2F2520] group-hover:text-[#6B4A35] transition-colors flex items-center gap-2">
                    <span>{step.title}</span>
                  </div>
                  <div className="text-xs text-[#6E625A] truncate group-hover:text-[#2F2520]">
                    {step.desc}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-[#6B4A35] opacity-80 group-hover:opacity-100 shrink-0 ml-3">
                <span className="hidden sm:inline">Jump</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#DED2C5] bg-[#F8F3EB] flex items-center justify-between text-xs text-[#6E625A]">
          <span>Official Statistical System Intelligence Prototype</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#EEE4D8] text-[#3A2921] font-semibold hover:bg-[#DED2C5] border border-[#CBB9A7] transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
