import React, { useState } from 'react';
import { MISCONCEPTIONS_LIBRARY } from '../../data/mockData';
import { Misconception } from '../../types';
import { NavPageId } from '../common/Sidebar';
import {
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
  if (m.evidenceStrength === 'Strong')    return { label: 'High Severity',   color: 'text-[#7A2E2A]',   bg: 'bg-[#FBF0EF] border-[#D4958F]' };
  if (m.evidenceStrength === 'Moderate')  return { label: 'Medium Severity', color: 'text-[#7A4F1E]',  bg: 'bg-[#FDF6EC] border-[#D4A96A]' };
  return                                         { label: 'Low Severity',    color: 'text-[#6E625A]',  bg: 'bg-[#F8F3EB] border-[#DED2C5]' };
}

/** Frequency label derived from confidenceLevel */
function getFrequency(m: Misconception): { label: string; color: string } {
  if (m.confidenceLevel === 'Very High') return { label: 'Very Common', color: 'text-[#9A4B42]' };
  if (m.confidenceLevel === 'High')      return { label: 'Common',      color: 'text-[#A97838]' };
  return                                        { label: 'Occasional',  color: 'text-[#6E625A]' };
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
            <span className="text-[11px] text-[#6E625A] font-medium">{MISCONCEPTIONS_LIBRARY.length} Core Statistical Rules</span>
          </div>
          <h1 className="text-2xl font-black text-[#2F2520] tracking-tight">Misconception Library</h1>
          <p className="text-sm text-[#6E625A] mt-1">
            Structured repository of recurring statistical traps and cognitive fallacies in official statistical work.
          </p>
        </div>
        <div className="relative shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#93877D]" />
          <input
            type="text"
            placeholder="Search misconceptions…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-2 bg-[#FBF8F2] border border-[#CBB9A7] rounded-lg text-xs text-[#2F2520] focus:outline-none focus:ring-2 focus:ring-[#6B4A35] focus:bg-[#FFFDFC] w-56"
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
                    ? 'bg-[#3A2921] border-[#2A1E19] text-[#FBF8F2] shadow-md ring-1 ring-[#6B4A35]'
                    : 'officer-card hover:border-[#CBB9A7]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-[#DED2C5]' : 'text-[#93877D]'}`}>
                    {m.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${isSelected ? 'bg-[#2A1E19] text-[#F3E9D8] border-[#8A6A52]' : sev.bg}`}>
                      {sev.label}
                    </span>
                  </div>
                </div>

                <h3 className={`text-xs font-bold leading-snug ${isSelected ? 'text-[#FBF8F2]' : 'text-[#2F2520]'}`}>
                  {m.name}
                </h3>

                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] font-semibold ${isSelected ? 'text-[#EDD8B4]' : freq.color}`}>
                    {freq.label}
                  </span>
                  <span className={`text-[10px] ${isSelected ? 'text-[#B8A28F]' : 'text-[#93877D]'}`}>·</span>
                  <span className={`text-[10px] ${isSelected ? 'text-[#DED2C5]' : 'text-[#6E625A]'}`}>
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
            <div className="pb-4 border-b border-[#EEE4D8]">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                <div>
                  <span className="badge badge-unverified uppercase mb-2 inline-block">
                    {selectedMisconception.category}
                  </span>
                  <h2 className="text-xl font-black text-[#2F2520]">{selectedMisconception.name}</h2>
                  <p className="text-xs text-[#6E625A] mt-1">{selectedMisconception.statisticalContext}</p>
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
              <div className="p-4 rounded-xl bg-[#EFF6EF] border border-[#A8C9AC] flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-[#2E5B34]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#547A5A]" />
                  Correct Concept
                </div>
                <p className="text-xs text-[#1F5E2A] leading-relaxed flex-1">
                  {selectedMisconception.remediationSnippet}
                </p>
              </div>

              {/* Common misconception */}
              <div className="p-4 rounded-xl bg-[#FDF6EC] border border-[#D4A96A] flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-[#7A4F1E]">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#A97838]" />
                  Common Misconception
                </div>
                <p className="text-xs text-[#7A4F1E] leading-relaxed flex-1">
                  {selectedMisconception.shortDesc}
                </p>
              </div>

              {/* High-confidence error */}
              <div className="p-4 rounded-xl bg-[#FBF0EF] border border-[#D4958F] flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-[#7A2E2A]">
                  <XCircle className="w-3.5 h-3.5 text-[#9A4B42]" />
                  High-Confidence Error
                </div>
                <p className="text-xs text-[#7A2E2A] leading-relaxed flex-1">
                  {selectedMisconception.detailedExplanation}
                </p>
              </div>
            </div>

            {/* Counter-example */}
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#2F2520] uppercase tracking-wide mb-2">
                <Lightbulb className="w-3.5 h-3.5 text-[#A97838]" />
                Field Counter-Example
              </div>
              <div className="p-3.5 rounded-lg bg-[#FDF6EC] border border-[#D4A96A] text-xs text-[#7A4F1E] font-mono leading-relaxed">
                {selectedMisconception.counterExample}
              </div>
            </div>

            {/* Detection rule */}
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#2F2520] uppercase tracking-wide mb-2">
                <Code2 className="w-3.5 h-3.5 text-[#6B4A35]" />
                Automated Detection Rule
              </div>
              <div className="p-3.5 rounded-lg bg-[#2A1E19] text-[#EEE4D8] text-[11px] font-mono leading-relaxed overflow-x-auto border border-[#4D3628]">
                {selectedMisconception.detectionRule}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#EEE4D8] flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs text-[#6E625A]">
                Ready to address this misconception?
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('learning')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#EEE4D8] hover:bg-[#DED2C5] text-[#3A2921] border border-[#CBB9A7] text-xs font-semibold transition-all"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#6B4A35]" />
                  Micro-Learning
                </button>
                <button
                  onClick={() => onNavigate('assessments')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#6B4A35] hover:bg-[#523625] text-[#FBF8F2] text-xs font-bold transition-all shadow-xs"
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
