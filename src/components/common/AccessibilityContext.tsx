/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type FontSize = 'default' | 'large' | 'xl';

interface AccessibilitySettings {
  fontSize: FontSize;
  highContrast: boolean;
  reducedMotion: boolean;
}

interface AccessibilityContextValue extends AccessibilitySettings {
  setFontSize: (size: FontSize) => void;
  setHighContrast: (on: boolean) => void;
  setReducedMotion: (on: boolean) => void;
  reset: () => void;
}

const STORAGE_KEY = 'stat-gap-a11y';

const defaultSettings: AccessibilitySettings = {
  fontSize: 'default',
  highContrast: false,
  reducedMotion: false,
};

const AccessibilityContext = createContext<AccessibilityContextValue>({
  ...defaultSettings,
  setFontSize: () => {},
  setHighContrast: () => {},
  setReducedMotion: () => {},
  reset: () => {},
});

function applyToDOM(settings: AccessibilitySettings): void {
  const html = document.documentElement;
  if (settings.fontSize === 'default') {
    html.removeAttribute('data-font-size');
  } else {
    html.setAttribute('data-font-size', settings.fontSize);
  }
  if (settings.highContrast) {
    html.setAttribute('data-high-contrast', 'true');
  } else {
    html.removeAttribute('data-high-contrast');
  }
  if (settings.reducedMotion) {
    html.setAttribute('data-reduced-motion', 'true');
  } else {
    html.removeAttribute('data-reduced-motion');
  }
}

function loadSettings(): AccessibilitySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { ...defaultSettings };
}

function saveSettings(s: AccessibilitySettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    const loaded = loadSettings();
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced && !loaded.reducedMotion) {
      loaded.reducedMotion = true;
    }
    return loaded;
  });

  useEffect(() => {
    applyToDOM(settings);
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setSettings((prev) => ({ ...prev, reducedMotion: true }));
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setFontSize = useCallback((fontSize: FontSize) => {
    setSettings((prev) => ({ ...prev, fontSize }));
  }, []);

  const setHighContrast = useCallback((highContrast: boolean) => {
    setSettings((prev) => ({ ...prev, highContrast }));
  }, []);

  const setReducedMotion = useCallback((reducedMotion: boolean) => {
    setSettings((prev) => ({ ...prev, reducedMotion }));
  }, []);

  const reset = useCallback(() => {
    setSettings({ ...defaultSettings });
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{ ...settings, setFontSize, setHighContrast, setReducedMotion, reset }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export function useAccessibility(): AccessibilityContextValue {
  return useContext(AccessibilityContext);
}
