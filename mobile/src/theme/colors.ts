// ============================================
// THEME COLOR CONFIGURATION
// ============================================
// This file contains all color definitions for the app.
// Colors are organized by category for easy maintenance.
//
// TO UPDATE COLORS FROM FIGMA:
// 1. Open your Figma design: https://www.figma.com/design/LKgSURFglBrrUuvrRAXYCu/Salon-Association?node-id=61-102
// 2. Select any element and check the color in the right panel
// 3. Copy the hex code and replace the corresponding value below
//
// CURRENTLY USED COLORS (from codebase):
// - primary: Links, input focus, icons
// - buttonPrimary: Sign In button background
// - background, backgroundSecondary: Screen and input backgrounds
// - text, textSecondary, textTertiary: Text hierarchy
// - border: Input borders
// - error, success: Validation and feedback
// - facebookBlue: Facebook icon color
//
// UNUSED BUT AVAILABLE COLORS:
// These colors are defined for future use and design system completeness.
// They provide flexibility for hover states, variants, and future features.

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
  successDark: "#2AB04A", // Dark success variant

  warning: "#FF9500", // Warning messages, caution states
  warningLight: "#FFB340", // Light warning background
  warningDark: "#E68500", // Dark warning variant

  error: "#FF3B30", // Error states, validation errors
  errorLight: "#FF6B63", // Light error background
  errorDark: "#E62E24", // Dark error variant

  info: "#C89B68", // Info messages (matches primary)
  infoLight: "#D4B896", // Light info background
  infoDark: "#A67C52", // Dark info variant

  // ============================================
  // BACKGROUND COLORS
  // ============================================
  background: "#FFFFFF", // Main screen background
  backgroundSecondary: "#F5F5F5", // Input fields, cards background
  backgroundTertiary: "#FAFAFA", // Subtle backgrounds, dividers
  backgroundDark: "#000000", // Dark mode background (if needed)

  // ============================================
  // TEXT COLORS
  // ============================================
  text: "#000000", // Primary text color (headings, body)
  textSecondary: "#8E8E93", // Secondary text (labels, hints, subtitles)
  textTertiary: "#C7C7CC", // Tertiary text (placeholders, disabled)
  textInverse: "#FFFFFF", // Text on dark backgrounds (buttons)
  textDisabled: "#C7C7CC", // Disabled text color

  // ============================================
  // BORDER COLORS
  // ============================================
  border: "#C6C6C8", // Default border color
  borderLight: "#E5E5EA", // Light borders, dividers
  borderDark: "#8E8E93", // Dark borders, emphasis
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
  gray700: "#636366", // Darker gray
  gray800: "#48484A", // Very dark gray
  gray900: "#1C1C1E", // Darkest gray

  // ============================================
  // OVERLAY & MODAL COLORS
  // ============================================
  overlay: "rgba(0, 0, 0, 0.5)", // Standard overlay for modals
  overlayLight: "rgba(0, 0, 0, 0.3)", // Light overlay
  overlayDark: "rgba(0, 0, 0, 0.7)", // Dark overlay for emphasis
};

// Type for colors
export type Colors = typeof colors;
