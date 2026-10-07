import '@/global.css';

import { Platform } from 'react-native';

// Paleta iPsiquiatra: azul, roxo e branco (ver docs/identidade-visual).
export const Tokens = {
  color: {
    background: '#F5F6FC',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF0FA',
    text: '#1B2559',
    muted: '#5B6487',
    border: '#E1E4F2',
    blue: '#2F45B5',
    blueSoft: '#E8ECFB',
    blueBorder: '#C9D2F5',
    brand: '#6B3FD9',
    brandDeep: '#4A1F9A',
    brandSoft: '#EFEAFD',
    brandBorder: '#D9CCFA',
    onBrand: '#FFFFFF',
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
    backgroundSelected: Tokens.color.brandSoft,
    textSecondary: Tokens.color.muted,
  },
  dark: {
    text: '#F3F4FF',
    background: '#0F1330',
    backgroundElement: '#1A1F45',
    backgroundSelected: '#2D2363',
    textSecondary: '#B8BEDC',
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
