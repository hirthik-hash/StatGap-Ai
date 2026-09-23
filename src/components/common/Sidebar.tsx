import React from 'react';
import {
  LayoutDashboard,
  Map,
  Compass,
  Sparkles,
  BookOpen,
  FileCheck2,
  ShieldCheck,
  TrendingDown,
  Building2,
  UserCheck,
  FileText,
  HelpCircle,
  LogOut,
  X,
  Activity,
  Target,
  BarChart3,
  Building,
  TrendingUp,
} from 'lucide-react';
import { GAP_X_STAGES, resolveGapXStage } from '../../utils/gapxResolver';

export type NavPageId =
  | 'dashboard'
  | 'competency-map'
  | 'competency-detail'
  | 'digital-twin'
  | 'digital_twin'
  | 'gap-analysis'
  | 'why-gap'
  | 'misconception-library'
  | 'learning'
  | 'assessments'
  | 'verification'
  | 'knowledge-decay'
  | 'task-readiness'
  | 'admin-analytics'
  | 'supervisor-dashboard'
  | 'career-progression'
  | 'career'
  | 'igot-integration'
  | 'igot'
  | 'study-material'
  | 'profile';

interface SidebarProps {
  activePage: NavPageId;
  onNavigate: (page: NavPageId) => void;
  onOpenLogout?: () => void;
  onLogout?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

/** Navigation items grouped by intelligence phase */
const NAV_GROUPS = [
  {
    label: 'Intelligence & Mapping',
    items: [
      { id: 'dashboard' as NavPageId, label: 'Dashboard', icon: LayoutDashboard },
      { id: 'competency-map' as NavPageId, label: 'Competency Map', icon: Map },
      { id: 'digital-twin' as NavPageId, label: 'Competency Digital Twin', icon: Activity, highlight: true },
      { id: 'gap-analysis' as NavPageId, label: 'Gap Analysis', icon: Compass },
    ],
  },

  {
    label: 'Diagnosis & Remediation',
    items: [
      { id: 'why-gap' as NavPageId, label: 'Why-Gap Intelligence', icon: Sparkles, highlight: true },
      { id: 'misconception-library' as NavPageId, label: 'Misconception Library', icon: HelpCircle },
      { id: 'learning' as NavPageId, label: 'Targeted Learning', icon: BookOpen },
    ],
  },
  {
    label: 'Verification & Lifecycle',
    items: [
      { id: 'assessments' as NavPageId, label: 'Adaptive Assessments', icon: FileCheck2 },
      { id: 'verification' as NavPageId, label: 'Competency Verification', icon: ShieldCheck },
      { id: 'knowledge-decay' as NavPageId, label: 'Knowledge Decay', icon: TrendingDown },
      { id: 'task-readiness' as NavPageId, label: 'Task Readiness', icon: Target, highlight: true },
    ],
  },
  {
    label: 'Workforce & Leadership',
    items: [
      { id: 'career-progression' as NavPageId, label: 'Career Progression', icon: TrendingUp, highlight: true },
      { id: 'admin-analytics' as NavPageId, label: 'Cadre Analytics', icon: BarChart3, highlight: true },
      { id: 'supervisor-dashboard' as NavPageId, label: 'Supervisor Oversight', icon: Building, highlight: true },
      { id: 'igot-integration' as NavPageId, label: 'iGOT Karmayogi', icon: Building2 },
      { id: 'study-material' as NavPageId, label: 'Study Material', icon: FileText },
      { id: 'profile' as NavPageId, label: 'Officer Profile', icon: UserCheck },
    ],
  },
];

interface SidebarProps {
  activePage: NavPageId;
  onNavigate: (page: NavPageId) => void;
  onOpenLogout?: () => void;
  onLogout?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  onOpenLogout,
  onLogout,
  mobileOpen = false,
  onCloseMobile = () => {},
}) => {
  const handleLogout = onOpenLogout || onLogout || (() => {});
  const activeStage = resolveGapXStage(activePage);

  const handleItemClick = (id: NavPageId) => {
    onNavigate(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#2F241E] text-[#EEE4D8] select-none">

      {/* ── GAP-X Lifecycle Indicator ─────────────────────── */}
      <div className="px-3 pt-3 pb-2 border-b border-[#3D2E25]/80">
        <div className="flex items-center gap-1.5 mb-2">
          <Activity className="w-3 h-3 text-[#B8A28F] shrink-0" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#6E5A4E]">
            GAP-X Cycle
          </span>
          <button
            onClick={onCloseMobile}
            className="lg:hidden ml-auto p-1 text-[#6E5A4E] hover:text-[#EEE4D8] rounded-md hover:bg-[#3D2E25] transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 9-stage grid */}
        <div className="grid grid-cols-3 gap-1">
          {GAP_X_STAGES.map((stage) => {
            const isCurrent = stage.id === activeStage.id;
            return (
              <div
                key={stage.id}
                title={`${stage.label}: ${stage.description}`}
                className={`px-1.5 py-1 rounded text-center transition-all ${
                  isCurrent
                    ? 'bg-[#5E402E] border border-[#8A6A52]'
                    : 'bg-[#3D2E25]/50 border border-transparent'
                }`}
              >
                <div className={`text-[9px] font-bold leading-tight truncate ${
                  isCurrent ? 'text-[#F8F3EB]' : 'text-[#6E5A4E]'
                }`}>
                  {stage.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Grouped Navigation ───────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-3" aria-label="Main navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="section-label px-1 mb-1 text-[#6E5A4E]">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                const isHighlight = (item as { highlight?: boolean }).highlight;

                let cls =
                  'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[11.5px] font-medium transition-all cursor-pointer ';

                if (isActive) {
                  cls += 'bg-[#EEE4D8] text-[#2A1E19] font-semibold';
                } else if (isHighlight) {
                  cls += 'text-[#CBB9A7] hover:bg-[#3D2E25] hover:text-[#F8F3EB] border border-[#4D3628]/60 bg-[#3D2E25]/30';
                } else {
                  cls += 'text-[#93877D] hover:bg-[#3D2E25] hover:text-[#EEE4D8]';
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={cls}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive
                          ? 'text-[#3A2921]'
                          : isHighlight
                          ? 'text-[#B8A28F]'
                          : 'text-[#6E5A4E]'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ──────────────────────────────────────── */}
      <div className="p-2 border-t border-[#3D2E25]/80 bg-[#251B15]">
        <button
          onClick={() => {
            onCloseMobile();
            handleLogout();
          }}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11.5px] font-medium text-[#C17A73] hover:bg-[#4D2E2A]/40 hover:text-[#E8B0AA] border border-[#7A3530]/20 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout Session</span>
        </button>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-56 shrink-0 border-r border-[#3D2E25] min-h-[calc(100vh-56px)]">
        <div className="sticky top-[56px] h-[calc(100vh-56px)]">{navContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-[#2A1E19]/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 max-w-64 w-full shadow-2xl z-50">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
