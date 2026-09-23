import React from 'react';
import { User } from '../../types';
import { NavPageId } from './Sidebar';
import { resolveGapXStage } from '../../utils/gapxResolver';
import { Sparkles, LogOut, Activity } from 'lucide-react';
import { AccessibilityMenu } from './AccessibilityMenu';

interface HeaderProps {
  user: User;
  activePage: NavPageId;
  onOpenLogout?: () => void;
  onLogoutRequest?: () => void;
  onOpenWalkthrough: () => void;
  onOpenAssistant?: () => void;
  onToggleMobileNav?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activePage,
  onOpenLogout,
  onLogoutRequest,
  onOpenWalkthrough,
  onOpenAssistant,
  onToggleMobileNav = () => {},
}) => {
  const handleLogout = onOpenLogout || onLogoutRequest || (() => {});
  const activeStage = resolveGapXStage(activePage);

  return (
    <header className="sticky top-0 z-30 bg-[#FBF8F2] border-b border-[#DED2C5] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 py-2">

          {/* ── Left: Brand ─────────────────────────────── */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile nav toggle */}
            <button
              onClick={onToggleMobileNav}
              className="lg:hidden p-2 rounded-lg text-[#8A6A52] hover:text-[#2F2520] hover:bg-[#EEE4D8] focus:outline-none transition-colors"
              aria-label="Toggle navigation"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              {/* Emblem */}
              <div className="w-8 h-8 rounded-lg bg-[#3A2921] border border-[#4D3628] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#CBB9A7]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3 3h18v2H3V3zm0 4h12v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2zm0 4h18v2H3v-2z"/>
                </svg>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold tracking-tight text-[15px] text-[#2A1E19] leading-none">
                    STAT-GAP <span className="text-[#6B4A35]">AI</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#EEE4D8] text-[#6B4A35] border border-[#CBB9A7] leading-none">
                    MoSPI
                  </span>
                </div>
                <p className="text-[10px] text-[#93877D] font-medium hidden md:block leading-tight mt-0.5 truncate max-w-48">
                  National Statistical Systems — Competency Intelligence
                </p>
              </div>
            </div>
          </div>

          {/* ── Center: Active GAP-X Stage Indicator ─────── */}
          <div className="hidden md:flex items-center gap-2 flex-1 justify-center">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold tracking-wide transition-all bg-[#EEE4D8] border-[#CBB9A7]"
              title={`Active workspace: ${activeStage.label} — ${activeStage.description}`}
              aria-label={`GAP-X Intelligence Cycle: currently at ${activeStage.label} stage`}
            >
              <Activity className="w-3 h-3 text-[#6B4A35]" aria-hidden="true" />
              <span className="text-[#93877D] text-[10px] font-semibold uppercase tracking-wider hidden lg:inline">
                GAP-X Stage:
              </span>
              <span className="text-[#3A2921] uppercase font-bold">
                {activeStage.label}
              </span>
              <span className="hidden lg:inline text-[#B8A28F] text-[10px]">
                — {activeStage.description}
              </span>
            </div>
          </div>

          {/* ── Right: Controls ──────────────────────────── */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Accessibility menu */}
            <AccessibilityMenu />

            {/* AI Assistant trigger */}
            {onOpenAssistant && (
              <button
                onClick={onOpenAssistant}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#3A2921] text-[#F8F3EB] hover:bg-[#4D3628] border border-[#4D3628] shadow-sm transition-all"
                title="Open AI Statistical Assistant"
                aria-label="Open AI Statistical Assistant"
              >
                <Sparkles className="w-3 h-3 text-[#CBB9A7]" aria-hidden="true" />
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            )}

            {/* Demo Guide trigger */}
            <button
              onClick={onOpenWalkthrough}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#EEE4D8] text-[#6B4A35] hover:bg-[#DED2C5] border border-[#CBB9A7] shadow-sm transition-all"
              title="Step-by-step hackathon demo flow"
            >
              <Sparkles className="w-3 h-3 text-[#8A6A52]" aria-hidden="true" />
              <span className="hidden sm:inline">Demo Guide</span>
            </button>

            {/* Officer identity */}
            <div className="flex items-center gap-2 pl-2 sm:pl-2.5 border-l border-[#DED2C5]">
              <div className="relative shrink-0">
                {user.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover border border-[#CBB9A7]"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#3A2921] flex items-center justify-center text-[11px] font-bold text-[#F8F3EB] border border-[#4D3628]">
                    {user.name.charAt(0)}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-[#547A5A] border border-[#FBF8F2] rounded-full" aria-hidden="true" />
              </div>

              <div className="hidden sm:block text-left min-w-0">
                <div className="text-[11px] font-bold text-[#2F2520] leading-tight truncate max-w-28">
                  {user.name}
                </div>
                <div className="text-[10px] text-[#93877D] truncate max-w-28">
                  {user.designation}
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 text-[#B8A28F] hover:text-[#9A4B42] hover:bg-[#EEE4D8] rounded-lg transition-colors"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

