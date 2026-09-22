import React, { useState } from 'react';
import { MISCONCEPTIONS_LIBRARY } from '../../data/mockData';
import { Misconception } from '../../types';
import { NavPageId } from '../common/Sidebar';
import {
  BrainCircuit,
  Search,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Code2,
  BookOpen,
  FileCheck2,
  XCircle,
} from 'lucide-react';

interface MisconceptionLibraryPageProps {
  onNavigate: (page: NavPageId) => void;
}

/** Severity derived from evidenceStrength */
function getSeverity(m: Misconception): { label: string; color: string; bg: string } {
  if (m.evidenceStrength === 'Strong')    return { label: 'High Severity',   color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-200' };
  if (m.evidenceStrength === 'Moderate')  return { label: 'Medium Severity', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' };
  return                                         { label: 'Low Severity',    color: 'text-slate-600',  bg: 'bg-slate-50 border-slate-200' };
}

/** Frequency label derived from confidenceLevel */
function getFrequency(m: Misconception): { label: string; color: string } {
  if (m.confidenceLevel === 'Very High') return { label: 'Very Common', color: 'text-rose-700' };
  if (m.confidenceLevel === 'High')      return { label: 'Common',      color: 'text-amber-700' };
  return                                        { label: 'Occasional',  color: 'text-slate-600' };
}

export const MisconceptionLibraryPage: React.FC<MisconceptionLibraryPageProps> = ({ onNavigate }) => {
  const [selectedId, setSelectedId] = useState<string>(MISCONCEPTIONS_LIBRARY[0].id);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = MISCONCEPTIONS_LIBRARY.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.shortDesc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedMisconception =
    MISCONCEPTIONS_LIBRARY.find((m) => m.id === selectedId) || MISCONCEPTIONS_LIBRARY[0];
  const severity = getSeverity(selectedMisconception);
  const frequency = getFrequency(selectedMisconception);

  return (
    <div className="space-y-5 pb-12 animate-fadeIn">

      {/* ── Header ──────────────────────────────────── */}
      <div className="officer-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge badge-unverified uppercase">Cognitive Diagnostic Ontology</span>
            <span className="text-[11px] text-slate-400">{MISCONCEPTIONS_LIBRARY.length} Core Statistical Rules</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Misconception Library</h1>
          <p className="text-sm text-slate-500 mt-1">
            Structured repository of recurring statistical traps and cognitive fallacies in official statistical work.
          </p>
        </div>
        <div className="relative shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search misconceptions…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white w-56"
          />
        </div>
      </div>

      {/* ── Main Grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left — List */}
        <div className="lg:col-span-4 space-y-2">
          <div className="section-label">
            Statistical Misconceptions ({filtered.length})
          </div>

          {filtered.map((m) => {
            const isSelected = m.id === selectedId;
            const sev = getSeverity(m);
            const freq = getFrequency(m);
            return (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-[#0c1a30] border-blue-900 shadow-md'
                    : 'officer-card hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-blue-400' : 'text-slate-400'}`}>
                    {m.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${isSelected ? 'bg-blue-900 text-blue-200 border-blue-700' : sev.bg}`}>
                      {sev.label}
                    </span>
                  </div>
                </div>

                <h3 className={`text-xs font-bold leading-snug ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {m.name}
                </h3>

                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] font-semibold ${isSelected ? 'text-blue-300' : freq.color}`}>
                    {freq.label}
                  </span>
                  <span className={`text-[10px] ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>·</span>
                  <span className={`text-[10px] ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                    Confidence: {m.confidenceLevel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right — Detail Panel */}
        <div className="lg:col-span-8">
          <div className="officer-card p-5 sm:p-6 space-y-5">

            {/* Header */}
            <div className="pb-4 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                <div>
                  <span className="badge badge-unverified uppercase mb-2 inline-block">
                    {selectedMisconception.category}
                  </span>
                  <h2 className="text-xl font-black text-slate-900">{selectedMisconception.name}</h2>
                  <p className="text-xs text-slate-500 mt-1">{selectedMisconception.statisticalContext}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0 text-[10px] font-semibold">
                  <span className={`px-2.5 py-1 rounded border ${severity.bg} ${severity.color}`}>
                    {severity.label}
                  </span>
                  <span className={`${frequency.color}`}>
                    Occurrence: {frequency.label}
                  </span>
                </div>
              </div>
            </div>

            {/* 3-Column Contrast Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Correct concept */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Correct Concept
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed flex-1">
                  {selectedMisconception.remediationSnippet}
                </p>
              </div>

              {/* Common misconception */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Common Misconception
                </div>
                <p className="text-xs text-amber-900 leading-relaxed flex-1">
                  {selectedMisconception.shortDesc}
                </p>
              </div>

              {/* High-confidence error */}
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-rose-700">
                  <XCircle className="w-3.5 h-3.5" />
                  High-Confidence Error
                </div>
                <p className="text-xs text-rose-900 leading-relaxed flex-1">
                  {selectedMisconception.detailedExplanation}
                </p>
              </div>
            </div>

            {/* Counter-example */}
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                Field Counter-Example
              </div>
              <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-950 font-mono leading-relaxed">
                {selectedMisconception.counterExample}
              </div>
            </div>

            {/* Detection rule */}
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-2">
                <Code2 className="w-3.5 h-3.5 text-violet-600" />
                Automated Detection Rule
              </div>
              <div className="p-3.5 rounded-lg bg-[#0f1923] text-slate-200 text-[11px] font-mono leading-relaxed overflow-x-auto">
                {selectedMisconception.detectionRule}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs text-slate-500">
                Ready to address this misconception?
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('learning')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Micro-Learning
                </button>
                <button
                  onClick={() => onNavigate('assessments')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0c1a30] hover:bg-[#102a4e] text-white text-xs font-bold transition-all"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  Practice This Area
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
