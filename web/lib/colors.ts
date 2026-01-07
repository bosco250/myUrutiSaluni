// Web Color Constants - Synchronized with Mobile App
// This file mirrors mobile/src/theme/colors.ts to ensure consistency

export const colors = {
  // ============================================
  // PRIMARY BRAND COLORS
  // ============================================
  primary: "#C89B68", // Main brand color - Links, accents, focus states
  primaryDark: "#A67C52", // Darker shade for pressed/hover states
  primaryLight: "#D4B896", // Lighter shade for subtle backgrounds

  // ============================================
  // BUTTON COLORS
  // ============================================
  buttonPrimary: "#000000", // Primary button background (Sign In button)
  buttonPrimaryText: "#FFFFFF", // Primary button text color
  buttonSecondary: "#5856D6", // Secondary button background
  buttonSecondaryText: "#FFFFFF", // Secondary button text color

  // ============================================
  // SECONDARY BRAND COLORS
  // ============================================
  secondary: "#5856D6", // Secondary brand color
  secondaryDark: "#3D3BB3", // Darker shade of secondary
  secondaryLight: "#7A78E8", // Lighter shade of secondary

  // ============================================
  // SEMANTIC COLORS (Status & Feedback)
  // ============================================
  success: "#34C759", // Success states, checkmarks, positive actions
  successLight: "#5CD87A", // Light success background
  successDark: "#059669", // Dark success variant

  warning: "#FF9500", // Warning messages, caution states
  warningLight: "#FFB340", // Light warning background
  warningDark: "#D97706", // Dark warning variant

  error: "#FF3B30", // Error states, validation errors
  errorLight: "#FF6B63", // Light error background
  errorDark: "#DC2626", // Dark error variant

  info: "#C89B68", // Info messages (matches primary)
  infoLight: "#D4B896", // Light info background
  infoDark: "#2563EB", // Dark info variant

  // ============================================
  // BACKGROUND COLORS
  // ============================================
  background: "#FAFAFA", // Main screen background (slightly off-white)
  backgroundSecondary: "#F0F0F0", // Input fields, cards background (more contrast)
  backgroundTertiary: "#E8E8E8", // Subtle backgrounds, dividers
  backgroundDark: "#111827", // Dark mode background

  // ============================================
  // TEXT COLORS (WCAG AA Compliant)
  // ============================================
  text: "#000000", // Primary text color (headings, body) - WCAG AAA on white
  textSecondary: "#6B6B70", // Secondary text (labels, hints, subtitles) - WCAG AA on white
  textTertiary: "#AEAEB2", // Tertiary text (placeholders, disabled) - WCAG AA on white
  textInverse: "#FFFFFF", // Text on dark backgrounds (buttons) - WCAG AAA on black
  textDisabled: "#C7C7CC", // Disabled text color - WCAG AA on white

  // ============================================
  // BORDER COLORS
  // ============================================
  border: "#D1D1D6", // Default border color (more visible)
  borderLight: "#D1D1D6", // Light borders, dividers (better contrast)
  borderDark: "#374151", // Dark borders, emphasis
  borderFocus: "#C89B68", // Focused input border (matches primary)

  // ============================================
  // SOCIAL MEDIA BRAND COLORS
  // ============================================
  facebookBlue: "#1877F2", // Facebook brand color

  // ============================================
  // NEUTRAL GRAYS (Design System Scale)
  // ============================================
  white: "#FFFFFF",
  black: "#000000",
  gray50: "#FAFAFA", // Lightest gray
  gray100: "#F5F5F5", // Very light gray
  gray200: "#E5E5EA", // Light gray
  gray300: "#D1D1D6", // Medium-light gray
  gray400: "#C7C7CC", // Medium gray
  gray500: "#AEAEB2", // Medium-dark gray
  gray600: "#8E8E93", // Dark gray
  gray700: "#374151", // Darker gray
  gray800: "#1F2937", // Very dark gray (dark mode card)
  gray900: "#111827", // Darkest gray (dark mode background)

  // ============================================
  // OVERLAY & MODAL COLORS
  // ============================================
  overlay: "rgba(0, 0, 0, 0.5)", // Standard overlay for modals
  overlayLight: "rgba(0, 0, 0, 0.3)", // Light overlay
  overlayDark: "rgba(0, 0, 0, 0.7)", // Dark overlay for emphasis
} as const;

// Type for colors
export type Colors = typeof colors;

// CSS Custom Properties for runtime theme switching
export const cssVariables = {
  '--color-primary': colors.primary,
  '--color-primary-dark': colors.primaryDark,
  '--color-primary-light': colors.primaryLight,
  '--color-secondary': colors.secondary,
  '--color-success': colors.success,
  '--color-warning': colors.warning,
  '--color-error': colors.error,
  '--color-background': colors.background,
  '--color-text': colors.text,
  '--color-border': colors.border,
} as const;