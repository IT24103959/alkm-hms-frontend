/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Base
    text: '#0f1f2e',
    background: '#f4f7fb',
    backgroundElement: '#eef5fb',
    backgroundSelected: '#d2ebff',
    textSecondary: '#486581',
    // Cards & borders
    card: '#ffffff',
    border: '#e2e8f0',
    // Brand
    primary: '#005f73',
    primaryLight: '#0a9396',
    accent: '#ffb703',
    accentMuted: '#f4d28f',
    // Status
    danger: '#c1121f',
    success: '#1d7f49',
  },
  dark: {
    // Base
    text: '#f1f5f9',
    background: '#0f172a',
    backgroundElement: '#1e293b',
    backgroundSelected: '#2e3a4e',
    textSecondary: '#94a3b8',
    // Cards & borders
    card: '#1e293b',
    border: '#1f2937',
    // Brand
    primary: '#0a9396',
    primaryLight: '#2dd4bf',
    accent: '#f4d28f',
    accentMuted: '#fde68a',
    // Status
    danger: '#ef4444',
    success: '#10b981',
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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;