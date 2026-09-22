import React from 'react';
import { User } from '../../types';
import { NavPageId } from './Sidebar';
import { resolveGapXStage } from '../../utils/gapxResolver';
import { Sparkles, LogOut, Activity } from 'lucide-react';

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
    <header className="sticky top-0 z-30 bg-[#0c1a30] text-white border-b border-slate-800/80 shadow-lg">
      {/* Government of India tricolor stripe */}
      <div className="h-0.5 w-full flex">
        <div className="w-1/3 bg-[#FF9933]" />
        <div className="w-1/3 bg-white" />
        <div className="w-1/3 bg-[#138808]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 py-2.5">

          {/* ── Left: Brand ─────────────────────────────── */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile nav toggle */}
            <button
              onClick={onToggleMobileNav}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none transition-colors"
              aria-label="Toggle navigation"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              {/* Emblem */}
              <div className="w-8 h-8 rounded-md bg-blue-900/70 border border-blue-500/25 flex items-center justify-center shrink-0">
                <svg className="w-4.5 h-4.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold tracking-tight text-[15px] text-white leading-none">
                    STAT-GAP <span className="text-sky-400">AI</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-400/20 leading-none">
                    MoSPI
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium hidden md:block leading-tight mt-0.5 truncate max-w-48">
                  National Statistical Systems — Competency Intelligence
                </p>
              </div>
            </div>
          </div>

          {/* ── Center: Active GAP-X Stage Indicator ─────── */}
          <div className="hidden md:flex items-center gap-2 flex-1 justify-center">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold tracking-wide transition-all ${activeStage.bgColor} ${activeStage.borderColor}`}
              title={`Active workspace: ${activeStage.label} — ${activeStage.description}`}
              aria-label={`GAP-X Intelligence Cycle: currently at ${activeStage.label} stage`}
            >
              <Activity className={`w-3 h-3 ${activeStage.color}`} />
              <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider hidden lg:inline">
                GAP-X Stage:
              </span>
              <span className={`${activeStage.color} uppercase`}>
                {activeStage.label}
              </span>
              <span className="hidden lg:inline text-slate-500 text-[10px]">
                — {activeStage.description}
              </span>
            </div>
          </div>

          {/* ── Right: Controls ──────────────────────────── */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* AI Assistant trigger */}
            {onOpenAssistant && (
              <button
                onClick={onOpenAssistant}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-600/80 text-white hover:bg-indigo-500 border border-indigo-400/30 shadow-sm transition-all"
                title="Open AI Statistical Assistant"
              >
                <Sparkles className="w-3 h-3 text-indigo-300" />
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            )}

            {/* Demo Guide trigger */}
            <button
              onClick={onOpenWalkthrough}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-600/80 text-white hover:bg-blue-500 border border-blue-400/30 shadow-sm transition-all"
              title="Step-by-step hackathon demo flow"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span className="hidden sm:inline">Demo Guide</span>
            </button>

            {/* Officer identity */}
            <div className="flex items-center gap-2 pl-2 sm:pl-2.5 border-l border-slate-700/60">
              <div className="relative shrink-0">
                {user.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover border border-blue-400/30"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-800/80 flex items-center justify-center text-[11px] font-bold text-white border border-blue-400/30">
                    {user.name.charAt(0)}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-[#0c1a30] rounded-full" />
              </div>

              <div className="hidden sm:block text-left min-w-0">
                <div className="text-[11px] font-bold text-slate-100 leading-tight truncate max-w-28">
                  {user.name}
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-28">
                  {user.designation}
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-500 hover:text-rose-300 hover:bg-slate-800/60 rounded-lg transition-colors"
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
