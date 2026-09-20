/**
 * Design tokens. Two palettes share one structure so every component reads
 * colors by role, never by literal value.
 *
 * Night mode is warm on purpose: amber and warm greys preserve dark
 * adaptation far better than blue-shifted light, and text sits below pure
 * white so it doesn't glare in a dark cockpit.
 */

export interface Palette {
  canvas: string;
  surface: string;
  ink: string;
  muted: string;
  faint: string;
  accent: string;
  accentSoft: string;
  hairline: string;
  track: string;
  warning: string;
  warningSoft: string;
  warningLine: string;
  danger: string;
  dangerSoft: string;
  dangerLine: string;
  ok: string;
  okSoft: string;
  okLine: string;
}

export const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    canvas: '#F8F6F3',
    surface: '#FFFFFF',
    ink: '#1C1B19',
    muted: '#79736B',
    faint: '#A39C93',
    accent: '#2F6F6B',
    accentSoft: '#E4EDEC',
    hairline: '#E8E3DC',
    track: '#E3DDD5',
    warning: '#8A6528',
    warningSoft: '#FAF2E2',
    warningLine: '#EADCBE',
    danger: '#A3402F',
    dangerSoft: '#FBEDEA',
    dangerLine: '#EED2CB',
    ok: '#2F6F4F',
    okSoft: '#E8F2EC',
    okLine: '#CAE3D6',
  },
  dark: {
    canvas: '#0E0E10',
    surface: '#16161A',
    ink: '#E5DDD1',
    muted: '#918A7E',
    faint: '#6E675E',
    accent: '#E0A458',
    accentSoft: '#241C12',
    hairline: '#26252A',
    track: '#2A2930',
    warning: '#E0A458',
    warningSoft: '#241C12',
    warningLine: '#3A2E1C',
    danger: '#E08472',
    dangerSoft: '#271713',
    dangerLine: '#3D211B',
    ok: '#7FC0A0',
    okSoft: '#13201A',
    okLine: '#1F3329',
  },
};

/**
 * Custom fonts need an explicit family per weight — React Native's
 * fontWeight does not select the right file for a bundled family on Android.
 */
export const fonts = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

export const typeScale = {
  /** Screen title. */
  title: { fontFamily: fonts.semibold, fontSize: 21, letterSpacing: -0.3 },
  /** The big primary readouts (MP, RPM). */
  display: { fontFamily: fonts.semibold, fontSize: 34, letterSpacing: -0.6 },
  /** Secondary readouts in a stat row. */
  stat: { fontFamily: fonts.semibold, fontSize: 22, letterSpacing: -0.2 },
  /** Right-hand value on an input row. */
  value: { fontFamily: fonts.semibold, fontSize: 15 },
  body: { fontFamily: fonts.regular, fontSize: 15 },
  /** Small uppercase section/field labels. */
  label: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.1 },
  caption: { fontFamily: fonts.regular, fontSize: 12 },
  unit: { fontFamily: fonts.medium, fontSize: 11 },
} as const;
