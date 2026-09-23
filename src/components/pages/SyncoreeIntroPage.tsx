import React, { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';

interface SyncoreeIntroPageProps {
  onContinue: () => void;
}

export const SyncoreeIntroPage: React.FC<SyncoreeIntroPageProps> = ({ onContinue }) => {
  const [mounted, setMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger staggered entrance sequence
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    setIsExiting(true);
    setTimeout(() => {
      onContinue();
    }, 550);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleContinue();
    }
  };

  return (
    <div
      className={`min-h-screen w-full bg-[#F5EFE6] text-[#2F2520] flex flex-col justify-between relative overflow-hidden select-none transition-all duration-500 ease-out ${
        isExiting ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
      }`}
    >
      {/* ── Subtle Background Statistical Visualization (5–10% opacity) ── */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <svg
          className="w-full h-full opacity-[0.08]"
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Statistical Coordinate Grid */}
          <defs>
            <pattern id="stat-grid-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#6B4A35" strokeWidth="0.75" strokeDasharray="3 3" />
              <circle cx="0" cy="0" r="1.5" fill="#3A2921" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#stat-grid-pattern)" />

          {/* Concentric Analytical Orbital Rings */}
          <circle cx="720" cy="450" r="180" stroke="#3A2921" strokeWidth="1" strokeDasharray="6 6" />
          <circle cx="720" cy="450" r="280" stroke="#6B4A35" strokeWidth="1" strokeDasharray="8 8" />
          <circle cx="720" cy="450" r="420" stroke="#8A6A52" strokeWidth="0.75" />
          <circle cx="720" cy="450" r="580" stroke="#CBB9A7" strokeWidth="0.5" />

          {/* Statistical Normal Distribution Curve (Gaussian) */}
          <path
            d="M 120 720 Q 420 720 570 560 T 720 280 T 870 560 Q 1020 720 1320 720"
            stroke="#6B4A35"
            strokeWidth="1.5"
            fill="none"
          />

          {/* Competency Network Nodes & Pathways */}
          <g stroke="#3A2921" strokeWidth="1.2" fill="#F5EFE6">
            {/* Sampling to Estimation */}
            <line x1="480" y1="360" x2="620" y2="390" strokeDasharray="4 4" />
            <line x1="620" y1="390" x2="720" y2="320" />
            <line x1="720" y1="320" x2="820" y2="390" />
            <line x1="820" y1="390" x2="960" y2="360" strokeDasharray="4 4" />
            
            {/* Lower Harmonic Connections */}
            <line x1="620" y1="390" x2="650" y2="520" />
            <line x1="720" y1="320" x2="720" y2="450" />
            <line x1="820" y1="390" x2="790" y2="520" />
            <line x1="650" y1="520" x2="790" y2="520" />

            {/* Nodes */}
            <circle cx="480" cy="360" r="4" fill="#6B4A35" />
            <circle cx="620" cy="390" r="5" fill="#3A2921" />
            <circle cx="720" cy="320" r="7" fill="#2A1E19" />
            <circle cx="820" cy="390" r="5" fill="#3A2921" />
            <circle cx="960" cy="360" r="4" fill="#6B4A35" />
            <circle cx="650" cy="520" r="5" fill="#8A6A52" />
            <circle cx="720" cy="450" r="6" fill="#6B4A35" />
            <circle cx="790" cy="520" r="5" fill="#8A6A52" />
          </g>

          {/* Data clusters / Sampling dispersion points */}
          <g fill="#3A2921" opacity="0.6">
            <circle cx="340" cy="240" r="2" />
            <circle cx="355" cy="255" r="1.5" />
            <circle cx="370" cy="235" r="2" />
            <circle cx="1080" cy="240" r="2" />
            <circle cx="1100" cy="260" r="1.5" />
            <circle cx="1070" cy="270" r="2" />
            <circle cx="720" cy="180" r="2" />
          </g>
        </svg>
      </div>

      {/* ── Top Micro Institutional Header ── */}
      <header className="w-full max-w-6xl mx-auto px-6 pt-6 sm:pt-8 flex items-center justify-between relative z-10">
        <div
          className={`flex items-center gap-2.5 transition-all duration-700 delay-100 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-[#6B4A35]" />
          <span className="text-[11px] sm:text-xs uppercase tracking-[0.2em] font-bold text-[#6E625A]">
            Competency Intelligence Platform
          </span>
        </div>

        <div
          className={`hidden sm:flex items-center gap-2 text-[11px] font-semibold text-[#8A6A52] tracking-wider uppercase transition-all duration-700 delay-150 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          <ShieldCheck size={13} className="text-[#547A5A]" />
          <span>Evidence-Driven Architecture</span>
        </div>
      </header>

      {/* ── Main Hero Composition (Centered) ── */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 max-w-4xl mx-auto relative z-10 py-8 sm:py-12">
        {/* 1. SYNCOREE Brand Mark (Refined Interconnected Harmonic Network Logo) */}
        <div
          className={`mb-6 sm:mb-8 transition-all duration-700 ease-out transform ${
            mounted ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'
          }`}
        >
          <div className="relative flex items-center justify-center">
            {/* Ambient subtle back-ring */}
            <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-[#DED2C5] opacity-60 animate-pulseGlow" />
            
            {/* SYNCOREE Brand Mark SVG */}
            <svg
              className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-xs"
              viewBox="0 0 80 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="SYNCOREE Brand Symbol"
            >
              {/* Outer orbital nodes & curves creating harmonic S-network */}
              <circle cx="40" cy="40" r="34" stroke="#DED2C5" strokeWidth="1.5" strokeDasharray="4 4" />
              
              {/* Harmonic 'S' curve linking nodes */}
              <path
                d="M 24 26 C 36 18, 56 22, 56 36 C 56 46, 24 48, 24 58 C 24 68, 48 72, 58 62"
                stroke="#3A2921"
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="none"
              />

              {/* Intersecting Synchronized Resonance Arch */}
              <path
                d="M 56 26 C 44 32, 36 48, 40 60"
                stroke="#8A6A52"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeDasharray="2 2"
                fill="none"
              />

              {/* Connected Knowledge Nodes */}
              <circle cx="24" cy="26" r="4.5" fill="#2A1E19" stroke="#F5EFE6" strokeWidth="1.5" />
              <circle cx="56" cy="36" r="5" fill="#6B4A35" stroke="#F5EFE6" strokeWidth="1.5" />
              <circle cx="40" cy="40" r="6" fill="#2A1E19" stroke="#FFFDFC" strokeWidth="2" />
              <circle cx="24" cy="58" r="5" fill="#6B4A35" stroke="#F5EFE6" strokeWidth="1.5" />
              <circle cx="58" cy="62" r="4.5" fill="#8A6A52" stroke="#F5EFE6" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* 2. Primary Title: SYNCOREE */}
        <div
          className={`transition-all duration-700 delay-200 ease-out transform ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-[0.24em] sm:tracking-[0.28em] text-[#2A1E19] uppercase leading-none pl-[0.24em] sm:pl-[0.28em]">
            SYNCOREE
          </h1>
        </div>

        {/* 3. Refined Geometric Divider */}
        <div
          className={`w-28 sm:w-40 h-[1.5px] bg-gradient-to-r from-transparent via-[#CBB9A7] to-transparent my-5 sm:my-7 transition-all duration-700 delay-300 ${
            mounted ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-50'
          }`}
        />

        {/* 4. Product Name: STAT-GAP AI */}
        <div
          className={`flex items-center justify-center gap-2.5 sm:gap-3 transition-all duration-700 delay-400 ease-out transform ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#2F2520]">
            STAT-GAP
          </h2>
          <span className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg bg-[#EEE4D8] border border-[#CBB9A7] text-[#6B4A35] font-black text-lg sm:text-2xl tracking-wide shadow-2xs">
            AI
          </span>
        </div>

        {/* 5. Short Description */}
        <p
          className={`text-sm sm:text-base md:text-lg text-[#6E625A] max-w-xl mx-auto font-medium leading-relaxed mt-4 sm:mt-5 transition-all duration-700 delay-500 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Evidence-driven competency intelligence for the modern statistical workforce.
        </p>

        {/* 6. Subtle Supporting Line (Pillars) */}
        <div
          className={`flex items-center justify-center flex-wrap gap-2 sm:gap-3 text-[11px] sm:text-xs font-semibold tracking-widest text-[#8A6A52] uppercase mt-4 transition-all duration-700 delay-600 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <span>Measure</span>
          <span className="text-[#CBB9A7]">•</span>
          <span>Diagnose</span>
          <span className="text-[#CBB9A7]">•</span>
          <span>Learn</span>
          <span className="text-[#CBB9A7]">•</span>
          <span>Verify</span>
          <span className="text-[#CBB9A7]">•</span>
          <span>Evolve</span>
        </div>

        {/* 7. Action CTA (Continue →) */}
        <div
          className={`mt-8 sm:mt-10 flex flex-col items-center transition-all duration-700 delay-700 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <button
            onClick={handleContinue}
            onKeyDown={handleKeyDown}
            autoFocus
            aria-label="Continue to STAT-GAP AI login"
            className="group relative inline-flex items-center justify-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl bg-[#2A1E19] hover:bg-[#3A2921] active:bg-[#1F1713] text-[#FBF8F2] font-bold text-base sm:text-lg tracking-wide border border-[#4D3628] shadow-md hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#6B4A35] focus:ring-offset-2 focus:ring-offset-[#F5EFE6] cursor-pointer"
          >
            <span>Continue</span>
            <ArrowRight
              size={19}
              className="text-[#EEE4D8] group-hover:translate-x-1.5 transition-transform duration-200"
            />
          </button>

          {/* Button Microcopy */}
          <span className="text-[11px] sm:text-xs text-[#93877D] mt-2.5 font-medium tracking-wide">
            Enter the competency intelligence platform
          </span>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        className={`w-full max-w-6xl mx-auto px-6 pb-6 sm:pb-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#93877D] font-medium border-t border-[#DED2C5]/60 pt-4 relative z-10 transition-all duration-700 delay-750 ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-2 font-semibold text-[#6E625A]">
          <span>SYNCOREE</span>
          <span>•</span>
          <span>STAT-GAP AI</span>
        </div>

        <div className="flex items-center gap-4 text-center">
          <span>Official Statistics Competency Framework</span>
          <span className="hidden sm:inline text-[#CBB9A7]">|</span>
          <span className="hidden sm:inline">Evidence-Led Digital Twin</span>
        </div>
      </footer>
    </div>
  );
};
