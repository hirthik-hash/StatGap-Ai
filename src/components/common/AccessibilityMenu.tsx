/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef, useState } from 'react';
import { Accessibility, Type, Contrast, Wind, RotateCcw, Check } from 'lucide-react';
import { useAccessibility, FontSize } from './AccessibilityContext';

export const AccessibilityMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { fontSize, highContrast, reducedMotion, setFontSize, setHighContrast, setReducedMotion, reset } =
    useAccessibility();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const fontSizeOptions: { value: FontSize; label: string }[] = [
    { value: 'default', label: 'Default' },
    { value: 'large', label: 'Large' },
    { value: 'xl', label: 'Extra Large' },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold
          text-[#6B4A35] bg-[#EEE4D8] hover:bg-[#DED2C5] border border-[#D8CABC] shadow-sm transition-all
          focus-visible:outline-2 focus-visible:outline-[#6B4A35]"
        aria-label="Accessibility settings"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Accessibility settings"
      >
        <Accessibility className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Accessibility</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Accessibility settings menu"
          className="absolute right-0 top-full mt-2 w-64 bg-[#FFFDFC] border border-[#DED2C5] rounded-xl
            shadow-xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-[#F8F3EB] border-b border-[#DED2C5]">
            <p className="text-xs font-bold text-[#2F2520] uppercase tracking-wide">Accessibility</p>
            <p className="text-[11px] text-[#93877D] mt-0.5">Customize display preferences</p>
          </div>

          {/* Font size */}
          <div className="px-4 py-3 border-b border-[#EEE4D8]">
            <div className="flex items-center gap-1.5 mb-2">
              <Type className="w-3.5 h-3.5 text-[#6B4A35]" />
              <span className="text-[11px] font-semibold text-[#3A2921] uppercase tracking-wide">Text Size</span>
            </div>
            <div className="flex gap-1.5">
              {fontSizeOptions.map((opt) => (
                <button
                  key={opt.value}
                  role="menuitemradio"
                  aria-checked={fontSize === opt.value}
                  onClick={() => setFontSize(opt.value)}
                  className={`flex-1 py-1.5 px-2 text-[11px] rounded-lg border font-medium transition-all
                    focus-visible:outline-2 focus-visible:outline-[#6B4A35] ${
                    fontSize === opt.value
                      ? 'bg-[#6B4A35] text-white border-[#6B4A35]'
                      : 'bg-[#F8F3EB] text-[#6E625A] border-[#DED2C5] hover:border-[#B8A28F]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="px-4 py-2 border-b border-[#EEE4D8] space-y-1">
            <button
              role="menuitemcheckbox"
              aria-checked={highContrast}
              onClick={() => setHighContrast(!highContrast)}
              className="w-full flex items-center justify-between py-2.5 px-0 text-left
                focus-visible:outline-2 focus-visible:outline-[#6B4A35] rounded"
            >
              <div className="flex items-center gap-2">
                <Contrast className="w-3.5 h-3.5 text-[#6B4A35]" />
                <span className="text-[12px] text-[#2F2520]">High Contrast</span>
              </div>
              <div
                className={`w-9 h-5 rounded-full transition-colors flex items-center ${
                  highContrast ? 'bg-[#6B4A35]' : 'bg-[#DED2C5]'
                }`}
                aria-hidden="true"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    highContrast ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>

            <button
              role="menuitemcheckbox"
              aria-checked={reducedMotion}
              onClick={() => setReducedMotion(!reducedMotion)}
              className="w-full flex items-center justify-between py-2.5 px-0 text-left
                focus-visible:outline-2 focus-visible:outline-[#6B4A35] rounded"
            >
              <div className="flex items-center gap-2">
                <Wind className="w-3.5 h-3.5 text-[#6B4A35]" />
                <span className="text-[12px] text-[#2F2520]">Reduced Motion</span>
              </div>
              <div
                className={`w-9 h-5 rounded-full transition-colors flex items-center ${
                  reducedMotion ? 'bg-[#6B4A35]' : 'bg-[#DED2C5]'
                }`}
                aria-hidden="true"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    reducedMotion ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Status summary */}
          {(fontSize !== 'default' || highContrast || reducedMotion) && (
            <div className="px-4 py-2 border-b border-[#EEE4D8] bg-[#F8F3EB]">
              <div className="flex items-center gap-1.5 text-[11px] text-[#547A5A]">
                <Check className="w-3 h-3" />
                <span>
                  {[
                    fontSize !== 'default' && `Text: ${fontSize}`,
                    highContrast && 'High contrast',
                    reducedMotion && 'Reduced motion',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            </div>
          )}

          {/* Reset */}
          <div className="px-4 py-2">
            <button
              role="menuitem"
              onClick={() => { reset(); setOpen(false); }}
              className="w-full flex items-center gap-2 py-2 text-[11px] text-[#8A6A52] hover:text-[#2F2520]
                transition-colors focus-visible:outline-2 focus-visible:outline-[#6B4A35] rounded"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
