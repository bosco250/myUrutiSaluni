/**
 * Mobile Typography System
 * Optimized for mobile readability and performance
 * Uses native system fonts (Roboto on Android, SF Pro on iOS)
 */

// Font family definitions (using Manrope to match web)
export const fontFamilies = {
  // Regular weight
  regular: 'Manrope_400Regular',
  // Medium weight
  medium: 'Manrope_500Medium',
  // Semibold weight
  semibold: 'Manrope_600SemiBold',
  // Bold weight
  bold: 'Manrope_700Bold',
};

export const typography = {
  // Screen Title / Large Heading
  h1: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: fontFamilies.bold,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  
  // Section Heading
  h2: {
    fontSize: 22,
    lineHeight: 30,
    fontFamily: fontFamilies.semibold,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  
  // Subsection Heading
  h3: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: fontFamilies.semibold,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  
  // Card Title / List Item Title
  h4: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: fontFamilies.semibold,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  
  // Body Text (Primary)
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: fontFamilies.regular,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  
  // Body Text (Secondary / Medium)
  bodyMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: fontFamilies.medium,
    fontWeight: '500' as const,
    letterSpacing: 0,
  },
  
  // Small Body Text
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fontFamilies.regular,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  
  // Caption / Helper Text
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fontFamilies.regular,
    fontWeight: '400' as const,
    letterSpacing: 0.2,
  },
  
  // Button Text
  button: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: fontFamilies.semibold,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
  
  // Label Text
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fontFamilies.medium,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
  },
  
  // Overline / Small Label
  overline: {
    fontSize: 10,
    lineHeight: 14, // 1.4 ratio
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
};

// Typography scale type
export type Typography = typeof typography;
export type TypographyKey = keyof typeof typography;

