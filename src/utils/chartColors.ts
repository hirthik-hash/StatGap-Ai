/**
 * STAT-GAP AI — Standard Chart Palette
 * Warm beige, espresso, taupe, and muted semantic status tones.
 */

export const STAT_CHART_COLORS = {
  // Brand & Core
  primary: '#6B4A35',
  secondary: '#8A6A52',
  tertiary: '#B8A28F',
  espresso: '#2A1E19',
  brown900: '#3A2921',
  brown800: '#3A2921',
  brown700: '#4D3628',
  brown600: '#6B4A35',
  brown500: '#8A6A52',
  taupe: '#B8A28F',

  // Surfaces & Borders
  bg: '#F5EFE6',
  surface: '#FFFDFC',
  surfaceSoft: '#F8F3EB',
  surfaceMuted: '#EEE4D8',
  border: '#DED2C5',
  borderStrong: '#CBB9A7',

  // Text
  text: '#2F2520',
  textSecondary: '#6E625A',
  textMuted: '#93877D',

  // Statuses
  success: '#547A5A',
  successBg: '#EFF6EF',
  warning: '#A97838',
  warningBg: '#FDF6EC',
  critical: '#9A4B42',
  criticalBg: '#FBF0EF',
  info: '#657A82',
  infoBg: '#EEF0EE',

  // Categorical palette for multi-series charts
  palette: [
    '#6B4A35',
    '#8A6A52',
    '#547A5A',
    '#A97838',
    '#B8A28F',
    '#657A82',
    '#9A4B42',
    '#3A2921',
  ],

  // Gradients definition for Recharts SVG defs
  gradients: {
    primary: { start: '#6B4A35', stop: '#8A6A52' },
    espresso: { start: '#2A1E19', stop: '#3A2921' },
    success: { start: '#547A5A', stop: '#8CBF94' },
    warning: { start: '#A97838', stop: '#D4A96A' },
    critical: { start: '#9A4B42', stop: '#D4958F' },
    info: { start: '#657A82', stop: '#9FB1B8' },
  }
};
