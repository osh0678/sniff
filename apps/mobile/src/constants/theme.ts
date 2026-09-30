/**
 * sniff design tokens.
 *
 * Concept: an inspection report. Cool neutrals carry the page, one cobalt accent
 * marks actions, and four verdict tones (pass / caution / fail / unknown) are
 * reserved for findings only, never decoration.
 *
 * Radius rule: panels 12, controls 10, stamps 4.
 */
import { Platform } from 'react-native';

export const Colors = {
  light: {
    canvas: '#F2F3F5',
    surface: '#FBFBFC',
    sunken: '#E8EAEE',
    line: '#D9DCE1',
    ink: '#101318',
    inkMuted: '#555C66',
    accent: '#2447D6',
    accentSoft: '#E4E9FB',
    onAccent: '#F8F9FF',
    pass: '#0D7545',
    passSoft: '#E1F2E9',
    caution: '#935700',
    cautionSoft: '#FAEED8',
    fail: '#BA2C23',
    failSoft: '#FAE3E1',
    unknown: '#555C66',
    unknownSoft: '#E8EAEE',
  },
  dark: {
    canvas: '#0D0F12',
    surface: '#15181D',
    sunken: '#1E2228',
    line: '#2B3038',
    ink: '#EDEFF2',
    inkMuted: '#9CA3AD',
    accent: '#86A0FF',
    accentSoft: '#1A2346',
    onAccent: '#0D0F12',
    pass: '#62D29B',
    passSoft: '#11281D',
    caution: '#EFB85A',
    cautionSoft: '#31250F',
    fail: '#FF9087',
    failSoft: '#381614',
    unknown: '#9CA3AD',
    unknownSoft: '#1E2228',
  },
} as const;

export type ThemeColor = keyof (typeof Colors)['light'];
export type Palette = Readonly<Record<ThemeColor, string>>;
/** Verdict tone. Only findings use these colors. */
export type Tone = 'pass' | 'caution' | 'fail' | 'unknown';

export const FontFamily = {
  regular: 'IBMPlexSansKR_400Regular',
  medium: 'IBMPlexSansKR_500Medium',
  semibold: 'IBMPlexSansKR_600SemiBold',
  bold: 'IBMPlexSansKR_700Bold',
  mono: 'IBMPlexMono_500Medium',
  monoBold: 'IBMPlexMono_600SemiBold',
} as const;

/** Type scale. Custom fonts carry their own weight, so no fontWeight here. */
export const Type = {
  display: { fontFamily: FontFamily.bold, fontSize: 28, lineHeight: 38, letterSpacing: -0.6 },
  title: { fontFamily: FontFamily.bold, fontSize: 20, lineHeight: 28, letterSpacing: -0.3 },
  heading: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 },
  bodyStrong: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 23 },
  caption: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: FontFamily.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  mono: { fontFamily: FontFamily.mono, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  score: { fontFamily: FontFamily.monoBold, fontSize: 52, lineHeight: 56, letterSpacing: -1.5 },
} as const;

export type TypeVariant = keyof typeof Type;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
} as const;

export const Radius = {
  stamp: 4,
  control: 10,
  panel: 12,
} as const;

export const IconSize = { small: 16, medium: 20, large: 28 } as const;

export const MaxContentWidth = 640;

export const HairlineWidth = Platform.OS === 'web' ? 1 : 0.5;
