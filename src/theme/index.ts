export const colors = {
  primary: '#2977C2',      // Paasxo blue
  primaryDark: '#184E85',
  primaryDarker: '#0F3660',
  primaryLight: '#5FA8E0',
  primarySoft: '#EAF3FC',   // light tint for surfaces/chips
  primaryTint: '#D6EAFB',   // slightly stronger tint for gradients
  background: '#F4F8FD',
  surface: '#FFFFFF',
  text: '#0F2A44',
  textMuted: '#6B84A0',
  border: '#DCE9F7',
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  info: '#0EA5E9',
  premium: '#F5B400',
  premiumLight: '#FFF4D6',
  teal: '#14B8A6',
  black: '#000000',
  white: '#FFFFFF',

  // Auth / hero surfaces — light, airy gradient backdrop + soft glass cards.
  gradientStart: '#FFFFFF',
  gradientMid: '#EAF3FC',
  gradientEnd: '#D6EAFB',
  glass: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(41,119,194,0.16)',
  glassStrong: 'rgba(255,255,255,0.9)',
  orb1: '#5FA8E0',
  orb2: '#8FD3E8',
  orb3: '#F5B400',
  mutedOnDark: '#6B84A0',

  // Deep gradient used for ScreenHeader hero banners across the app.
  heroStart: '#2977C2',
  heroMid: '#1F63A3',
  heroEnd: '#184E85',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: '800' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
};
