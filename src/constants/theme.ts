import '@/global.css';

import { Platform } from 'react-native';

export const Tokens = {
  color: {
    background: '#F7F5F2',
    surface: '#FFFFFF',
    surfaceMuted: '#F0ECE8',
    text: '#201A24',
    muted: '#6A6470',
    border: '#E3DDE8',
    brand: '#7B42F6',
    brandDeep: '#4A1F9A',
    brandSoft: '#B99BFF',
    teal: '#2E948A',
    amber: '#B7791F',
  },
  radius: {
    sm: 8,
    md: 12,
  },
} as const;

export const Colors = {
  light: {
    text: Tokens.color.text,
    background: Tokens.color.background,
    backgroundElement: Tokens.color.surface,
    backgroundSelected: '#EEE8FF',
    textSecondary: Tokens.color.muted,
  },
  dark: {
    text: '#F7F2FA',
    background: '#151019',
    backgroundElement: '#241A2D',
    backgroundSelected: '#35234A',
    textSecondary: '#C9C0D0',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 54, android: 82 }) ?? 72;
export const MaxContentWidth = 820;
