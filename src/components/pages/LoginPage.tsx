import React, { useState } from 'react';
import { User } from '../../types';
import { AuthService } from '../../services/authService';
import {
  Eye, EyeOff, Lock, UserCheck, ShieldCheck, ArrowRight,
  AlertCircle, CheckCircle2, X, BookOpen, Activity,
  GraduationCap, Zap,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User, welcomeMsg: string) => void;
  onNavigateRegister: () => void;
  onNavigateIntro?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateRegister, onNavigateIntro }) => {
  const [iGotId, setIGotId] = useState('IGOT202600123');
  const [password, setPassword] = useState((import.meta.env.VITE_DEMO_PASSWORD as string) || 'DemoPassword@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!iGotId.trim()) {
      setError('Please enter your official iGOT ID.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await AuthService.login(iGotId, password, rememberMe);
      setIsLoading(false);
      if (res.success && res.user) {
        onLoginSuccess(res.user, res.message);
      } else {
        setError(res.message);
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
    }
  };

  const handleUseDemo = () => {
    setIGotId('IGOT202600123');
    setPassword((import.meta.env.VITE_DEMO_PASSWORD as string) || 'DemoPassword@123');
    setError(null);
  };

  const gapxCycle = ['OBSERVE', 'MAP', 'DIAGNOSE', 'LEARN', 'ASSESS', 'VERIFY'];

  return (
    <div className="min-h-screen bg-[#F1E8DC] flex flex-col lg:flex-row">

      {/* LEFT PANEL — Brand & Editorial */}
      <div className="lg:w-[55%] relative overflow-hidden flex flex-col">
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none"
          viewBox="0 0 600 700"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <path d="M0 400 C100 380 200 350 300 320 S500 280 600 260" stroke="#3A2921" strokeWidth="1.5" fill="none"/>
          <path d="M0 480 C80 460 180 420 280 400 S450 370 600 340" stroke="#6B4A35" strokeWidth="1" fill="none"/>
          <path d="M0 300 C120 290 220 270 320 250 S480 230 600 210" stroke="#3A2921" strokeWidth="1" fill="none"/>
          <rect x="40" y="500" width="28" height="80" rx="2" fill="#3A2921"/>
          <rect x="80" y="520" width="28" height="60" rx="2" fill="#6B4A35"/>
          <rect x="120" y="490" width="28" height="90" rx="2" fill="#3A2921"/>
          <rect x="160" y="510" width="28" height="70" rx="2" fill="#8A6A52"/>
          <rect x="200" y="480" width="28" height="100" rx="2" fill="#3A2921"/>
          <rect x="240" y="505" width="28" height="75" rx="2" fill="#6B4A35"/>
          {[[120,200],[200,160],[280,220],[360,180],[440,150],[520,170],[100,320],[220,300],[340,280],[460,260]].map(([x,y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill="#3A2921"/>
          ))}
          <line x1="0" y1="150" x2="600" y2="150" stroke="#3A2921" strokeWidth="0.5" strokeDasharray="4 8"/>
          <line x1="0" y1="250" x2="600" y2="250" stroke="#3A2921" strokeWidth="0.5" strokeDasharray="4 8"/>
          <line x1="0" y1="350" x2="600" y2="350" stroke="#3A2921" strokeWidth="0.5" strokeDasharray="4 8"/>
        </svg>

        <div className="relative z-10 flex flex-col h-full p-8 lg:p-12">
          <div className="mb-8 lg:mb-12">
            <div
              onClick={onNavigateIntro}
              className={`inline-flex items-center gap-3 mb-1 ${onNavigateIntro ? 'cursor-pointer hover:opacity-85 transition-opacity' : ''}`}
              title={onNavigateIntro ? 'Return to SYNCOREE intro' : undefined}
            >
              <div className="w-9 h-9 rounded-xl bg-[#3A2921] flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#D8CABC]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3 3h18v2H3V3zm0 4h12v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2zm0 4h18v2H3v-2z"/>
                </svg>
              </div>
              <div>
                <div className="text-[22px] font-extrabold tracking-tight text-[#2A1E19] leading-none">
                  STAT-GAP <span className="text-[#6B4A35]">AI</span>
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-[#8A6A52] mt-0.5">
                  Competency Intelligence Platform
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#8A6A52] mb-4">
              India's Official Statistical System
            </p>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-[#2A1E19] tracking-tight leading-tight mb-4">
              From training completion<br />to verified competency.
            </h1>
            <p className="text-[15px] text-[#6E625A] leading-relaxed mb-8 max-w-md">
              STAT-GAP AI transforms learning and assessment evidence into an actionable view of statistical competency — identifying gaps, diagnosing their root causes, and verifying real improvement.
            </p>

            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A6A52] mb-3">
                GAP-X Intelligence Cycle
              </p>
              <div className="flex items-center gap-1 flex-wrap">
                {gapxCycle.map((stage, i) => (
                  <React.Fragment key={stage}>
                    <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                      i === 2
                        ? 'bg-[#3A2921] text-[#F8F3EB] border-[#3A2921]'
                        : 'bg-[#F1E8DC] text-[#6B4A35] border-[#CBB9A7]'
                    }`}>
                      {stage}
                    </div>
                    {i < gapxCycle.length - 1 && (
                      <span className="text-[#CBB9A7] text-xs" aria-hidden="true">›</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <p className="text-[11px] text-[#93877D] mt-2 italic">
                Evidence-driven. Adaptive. Continuously verified.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: BookOpen, label: 'iGOT Karmayogi Integration' },
                { icon: Activity, label: 'Evidence-Based Analysis' },
                { icon: Zap, label: 'AI-Assisted Learning' },
                { icon: CheckCircle2, label: 'Continuous Verification' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-[11px] text-[#6E625A]">
                  <Icon className="w-3.5 h-3.5 text-[#6B4A35] shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-[#CBB9A7]/50">
            <p className="text-[10px] text-[#93877D]">
              National Statistical Systems Training Academy (NSSTA) · MoSPI
            </p>
            <p className="text-[10px] text-[#B8A28F] mt-0.5">
              GAP-X Intelligence Architecture · Non-LMS Competency Verification
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Login Form */}
      <div className="lg:w-[45%] bg-[#FBF8F2] flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-sm">

          <div className="lg:hidden mb-8 text-center">
            <div className="text-2xl font-extrabold text-[#2A1E19]">
              STAT-GAP <span className="text-[#6B4A35]">AI</span>
            </div>
            <p className="text-xs text-[#93877D] mt-1">Competency Intelligence Platform</p>
          </div>

          <div className="bg-[#FFFDFC] border border-[#DED2C5] rounded-2xl p-7 shadow-sm">

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#EFF6EF] text-[#2E5B34] border border-[#A8C9AC]">
                  <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                  Secure iGOT Authentication
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#2A1E19] leading-tight">
                Welcome back
              </h2>
              <p className="text-sm text-[#6E625A] mt-1">
                Sign in to continue your competency intelligence journey.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-5 p-3.5 rounded-xl bg-[#F8EAE7] border border-[#E2B8B1] flex items-start gap-2.5 animate-shake"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-[#9A4B42] mt-0.5" aria-hidden="true" />
                <span className="text-sm text-[#7A2E2A] leading-snug">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="igot-id" className="block text-xs font-bold uppercase tracking-wider text-[#6B4A35] mb-1.5">
                  iGOT ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <UserCheck className="w-4 h-4 text-[#B8A28F]" aria-hidden="true" />
                  </div>
                  <input
                    id="igot-id"
                    type="text"
                    required
                    value={iGotId}
                    onChange={(e) => setIGotId(e.target.value)}
                    placeholder="Enter your official iGOT ID"
                    autoComplete="username"
                    className="w-full pl-10 pr-3.5 py-3.5 bg-[#F8F3EB] border border-[#D8CABC] rounded-xl text-sm text-[#2F2520] font-mono placeholder:font-sans placeholder:text-[#B8A28F] focus:outline-none focus:ring-2 focus:ring-[#6B4A35] focus:border-[#6B4A35] focus:bg-[#FFFDFC] transition-all"
                    aria-describedby="igot-id-hint"
                  />
                </div>
                <p id="igot-id-hint" className="mt-1 text-[11px] text-[#93877D]">
                  e.g. IGOT202600123
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-[#6B4A35] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-[#B8A28F]" aria-hidden="true" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-12 py-3.5 bg-[#F8F3EB] border border-[#D8CABC] rounded-xl text-sm text-[#2F2520] placeholder:text-[#B8A28F] focus:outline-none focus:ring-2 focus:ring-[#6B4A35] focus:border-[#6B4A35] focus:bg-[#FFFDFC] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#B8A28F] hover:text-[#6B4A35] transition-colors focus-visible:outline-2 focus-visible:outline-[#6B4A35]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-[#6E625A]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#CBB9A7] accent-[#6B4A35] focus:ring-[#6B4A35] cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelp(true)}
                  className="text-[#6B4A35] font-semibold hover:text-[#3A2921] hover:underline focus-visible:outline-2 focus-visible:outline-[#6B4A35] rounded"
                >
                  Need help?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-[#5E402E] hover:bg-[#493124] active:bg-[#3A2921] text-[#F8F3EB] text-sm font-bold shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-[#3A2921] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-[#F8F3EB] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    <span>Authenticating…</span>
                  </>
                ) : (
                  <>
                    <span>Sign in to STAT-GAP AI</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-[#EEE4D8]">
              <div className="bg-[#F8F3EB] border border-[#DED2C5] rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-[#6B4A35]" aria-hidden="true" />
                    <span className="text-[11px] font-bold text-[#3A2921] uppercase tracking-wide">Demo access</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseDemo}
                    className="text-[11px] font-bold text-[#6B4A35] hover:text-[#3A2921] hover:underline focus-visible:outline-2 focus-visible:outline-[#6B4A35] rounded cursor-pointer"
                  >
                    Use demo account →
                  </button>
                </div>
                <p className="text-[11px] text-[#6E625A] leading-relaxed">
                  Explore the STAT-GAP competency intelligence workflow using the configured demo account.
                </p>
                <div className="mt-2 text-[11px] text-[#93877D] font-mono">
                  ID: <span className="font-bold text-[#2F2520]">IGOT202600123</span>
                  {' · '}
                  Pass: <span className="font-bold text-[#2F2520]">DemoPassword@123</span>
                </div>
                <div className="text-[10px] text-[#B8A28F] mt-0.5">
                  Officer: Ananya Sharma (Official Statistics Division)
                </div>
              </div>
            </div>

            <div className="mt-5 text-center text-xs text-[#6E625A]">
              New statistical officer or trainee?{' '}
              <button
                type="button"
                onClick={onNavigateRegister}
                className="font-bold text-[#6B4A35] hover:text-[#3A2921] hover:underline focus-visible:outline-2 focus-visible:outline-[#6B4A35] rounded cursor-pointer"
              >
                Register here
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-[11px] font-semibold text-[#6B4A35]">STAT-GAP AI</p>
            <p className="text-[10px] text-[#93877D] mt-0.5">Competency Intelligence Platform</p>
          </div>
        </div>
      </div>

      {showHelp && (
        <div
          className="fixed inset-0 z-50 bg-[#2A1E19]/50 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-dialog-title"
        >
          <div className="bg-[#FFFDFC] border border-[#DED2C5] rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 id="help-dialog-title" className="text-base font-bold text-[#2A1E19]">Login Help</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1.5 rounded-lg text-[#93877D] hover:text-[#2F2520] hover:bg-[#EEE4D8] transition-colors focus-visible:outline-2 focus-visible:outline-[#6B4A35]"
                aria-label="Close help dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-[#6E625A]">
              <p><strong className="text-[#2F2520]">iGOT ID</strong> — Your unique iGOT Karmayogi platform identifier (e.g. IGOT202600123). Provided during onboarding.</p>
              <p><strong className="text-[#2F2520]">Password</strong> — Your iGOT platform password. Contact your department administrator if you need a reset.</p>
              <p><strong className="text-[#2F2520]">Demo account</strong> — Use the "Use demo account" button to auto-fill credentials for an exploration session.</p>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#5E402E] text-[#F8F3EB] text-sm font-semibold hover:bg-[#493124] transition-all focus-visible:outline-2 focus-visible:outline-[#3A2921]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
