import {colors} from './colors';

export const lightTheme = {
  colors: {
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    background: colors.light.background,
    surface: colors.light.surface,
    surfaceAccent: colors.light.surfaceAccent,
    text: colors.light.text,
    textSecondary: colors.light.textSecondary,
    textMuted: colors.light.textMuted,
    border: colors.light.border,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  typography: {
    h1: {fontSize: 32, fontWeight: '700' as const},
    h2: {fontSize: 28, fontWeight: '700' as const},
    h3: {fontSize: 22, fontWeight: '700' as const},
    h4: {fontSize: 18, fontWeight: '700' as const},
    body: {fontSize: 16, fontWeight: '400' as const},
    bodyMedium: {fontSize: 16, fontWeight: '500' as const},
    small: {fontSize: 14, fontWeight: '400' as const},
    xsmall: {fontSize: 12, fontWeight: '400' as const},
  },
};

export const darkTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    background: colors.dark.background,
    surface: colors.dark.surface,
    surfaceAccent: colors.dark.surfaceAccent,
    text: colors.dark.text,
    textSecondary: colors.dark.textSecondary,
    textMuted: colors.dark.textMuted,
    border: colors.dark.border,
  },
};

export type Theme = typeof lightTheme;

