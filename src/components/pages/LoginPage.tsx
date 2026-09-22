import React, { useState } from 'react';
import { User } from '../../types';
import { AuthService } from '../../services/authService';
import { Eye, EyeOff, Lock, UserCheck, Shield, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User, welcomeMsg: string) => void;
  onNavigateRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateRegister }) => {
  const [iGotId, setIGotId] = useState('IGOT202600123');
  const [password, setPassword] = useState((import.meta.env.VITE_DEMO_PASSWORD as string) || '');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    if (import.meta.env.VITE_DEMO_PASSWORD) {
      setPassword(import.meta.env.VITE_DEMO_PASSWORD as string);
    }
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c1a30] via-[#0f2444] to-[#0a1526] text-white flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top tricolor bar */}
      <div className="h-1.5 w-full flex">
        <div className="w-1/3 bg-[#FF9933]"></div>
        <div className="w-1/3 bg-white"></div>
        <div className="w-1/3 bg-[#138808]"></div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-md w-full">
          {/* Government / Institutional Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-400/30 text-amber-400 shadow-xl mb-4">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
              STAT-GAP <span className="text-blue-400">AI</span>
            </h1>
            <p className="text-sm font-semibold text-blue-200 mt-1">
              Competency Intelligence for India's Official Statistical System
            </p>
            <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto">
              From Training Completion to Competency Verification (MoSPI / iGOT Karmayogi)
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-8 text-slate-900 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Officer Authentication</h2>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                iGOT Secure
              </span>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* iGOT ID */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  iGOT ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={iGotId}
                    onChange={(e) => setIGotId(e.target.value)}
                    placeholder="e.g. IGOT202600123"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    aria-label="Show or hide password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Remember Me</span>
                </label>
                <span className="text-[11px] text-blue-700 font-semibold cursor-pointer hover:underline">
                  Need Help?
                </span>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-900 hover:bg-blue-800 active:scale-98 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Login to Competency Portal</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Fill Helper */}
            <div className="mt-5 pt-4 border-t border-slate-100 bg-blue-50/60 rounded-lg p-3">
              <div className="flex items-center justify-between text-xs text-blue-950 font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Official Demo Account:
                </span>
                <button
                  type="button"
                  onClick={handleUseDemo}
                  className="text-[11px] text-blue-700 hover:text-blue-900 underline font-bold cursor-pointer"
                >
                  Auto-Fill
                </button>
              </div>
              <div className="text-[11px] text-slate-600 font-mono leading-relaxed">
                ID: <span className="font-bold text-slate-900">IGOT202600123</span> | Pass: <span className="font-bold text-slate-900">Stat@123</span>
                <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                  Officer: Ananya Sharma (Official Statistics Division)
                </div>
              </div>
            </div>

            {/* Register Link */}
            <div className="mt-6 text-center pt-2 text-xs text-slate-600">
              New Statistical Officer or Trainee?{' '}
              <button
                type="button"
                onClick={onNavigateRegister}
                className="font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
              >
                Register Here
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>National Statistical Systems Training Academy (NSSTA) &bull; MoSPI</span>
          <span>GAP-X Intelligence Architecture &bull; Non-LMS Competency Verification</span>
        </div>
      </footer>
    </div>
  );
};
