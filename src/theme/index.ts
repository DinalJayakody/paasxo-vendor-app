// `white`/`black` are deliberately NOT flipped between palettes — used as much
// for icon/text tint on colored surfaces as for literal backgrounds. Surfaces
// meant to invert in dark mode use `surface`/`background`/the tint tokens
// instead — those ARE flipped. Same convention as the User App's
// src/styles/colors.ts (lightColors/darkColors).
export const lightColors = {
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

  // Trainer-role accent — matches the User App's reserved Colors.trainer palette
  // (src/styles/colors.ts), which now shares the same blue Paasxo theme as the
  // rest of the app rather than a separate accent color.
  trainerAccent: '#2977C2',
  trainerAccentDark: '#184E85',
  trainerAccentLight: '#EAF3FC',
  trainerHeroStart: '#2977C2',
  trainerHeroMid: '#1F63A3',
  trainerHeroEnd: '#184E85',
};

export const darkColors: typeof lightColors = {
  primary: '#5FA8E0',
  primaryDark: '#2977C2',
  primaryDarker: '#184E85',
  primaryLight: '#8FC4EC',
  primarySoft: '#173049',   // dark tint for surfaces/chips
  primaryTint: '#1D3A57',
  background: '#0B1622',
  surface: '#101E2E',
  text: '#EAF2FA',
  textMuted: '#8CA3BC',
  border: '#233345',
  success: '#4ADE80',
  successLight: '#123321',
  warning: '#FBBF24',
  warningLight: '#3A2A0C',
  danger: '#F87171',
  dangerLight: '#3A1414',
  info: '#38BDF8',
  premium: '#F5B400',
  premiumLight: '#3A2E08',
  teal: '#2DD4BF',
  black: '#000000',
  white: '#FFFFFF',

  gradientStart: '#101E2E',
  gradientMid: '#173049',
  gradientEnd: '#1D3A57',
  glass: 'rgba(16,30,46,0.72)',
  glassBorder: 'rgba(95,168,224,0.20)',
  glassStrong: 'rgba(16,30,46,0.9)',
  orb1: '#5FA8E0',
  orb2: '#8FD3E8',
  orb3: '#F5B400',
  mutedOnDark: '#8CA3BC',

  heroStart: '#173049',
  heroMid: '#1D3A57',
  heroEnd: '#2977C2',

  trainerAccent: '#5FA8E0',
  trainerAccentDark: '#2977C2',
  trainerAccentLight: '#173049',
  trainerHeroStart: '#173049',
  trainerHeroMid: '#1D3A57',
  trainerHeroEnd: '#2977C2',
};

export type ThemeColors = typeof lightColors;

// Static default export — kept for any screen not yet migrated to
// useThemeColors() (see src/context/ThemeContext.tsx). Always resolves to the
// light palette; screens using this directly won't react to a dark-mode switch.
export const colors = lightColors;

/** Role-aware palette — same shape as the shared blue tokens above, swapped to
 *  orange for a Trainer-logged-in session. Use via useRoleTheme() in components,
 *  which supplies the current theme's palette (light or dark) as `palette` so
 *  the role accent composes with the light/dark axis instead of being replaced
 *  by it. Defaults to the static light `colors` for any caller not yet passing
 *  a theme-aware palette. */
export function paletteForRole(accountType?: string, palette: ThemeColors = colors) {
  if (accountType === 'TRAINER') {
    return {
      accent: palette.trainerAccent,
      accentDark: palette.trainerAccentDark,
      accentLight: palette.trainerAccentLight,
      heroStart: palette.trainerHeroStart,
      heroMid: palette.trainerHeroMid,
      heroEnd: palette.trainerHeroEnd,
    };
  }
  return {
    accent: palette.primary,
    accentDark: palette.primaryDark,
    accentLight: palette.primarySoft,
    heroStart: palette.heroStart,
    heroMid: palette.heroMid,
    heroEnd: palette.heroEnd,
  };
}

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
