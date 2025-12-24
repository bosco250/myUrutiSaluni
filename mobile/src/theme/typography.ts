/**
 * Mobile Typography System
 * Optimized for mobile readability and performance
 * Uses native system fonts (Roboto on Android, SF Pro on iOS)
 */

export const typography = {
  // Screen Title / Large Heading
  h1: {
    fontSize: 28,
    lineHeight: 36, // 1.29 ratio
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  
  // Section Heading
  h2: {
    fontSize: 22,
    lineHeight: 30, // 1.36 ratio
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  
  // Subsection Heading
  h3: {
    fontSize: 18,
    lineHeight: 26, // 1.44 ratio
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  
  // Card Title / List Item Title
  h4: {
    fontSize: 16,
    lineHeight: 24, // 1.5 ratio
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  
  // Body Text (Primary)
  body: {
    fontSize: 16,
    lineHeight: 24, // 1.5 ratio
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  
  // Body Text (Secondary / Medium)
  bodyMedium: {
    fontSize: 16,
    lineHeight: 24, // 1.5 ratio
    fontWeight: '500' as const,
    letterSpacing: 0,
  },
  
  // Small Body Text
  bodySmall: {
    fontSize: 14,
    lineHeight: 20, // 1.43 ratio
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  
  // Caption / Helper Text
  caption: {
    fontSize: 12,
    lineHeight: 16, // 1.33 ratio
    fontWeight: '400' as const,
    letterSpacing: 0.2,
  },
  
  // Button Text
  button: {
    fontSize: 16,
    lineHeight: 20, // 1.25 ratio (tighter for buttons)
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
  
  // Label Text
  label: {
    fontSize: 14,
    lineHeight: 20, // 1.43 ratio
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

// Font family definitions (uses native system fonts)
export const fontFamilies = {
  // Regular weight
  regular: 'System',
  // Medium weight
  medium: 'System',
  // Semibold weight
  semibold: 'System',
  // Bold weight
  bold: 'System',
};

// Typography scale type
export type Typography = typeof typography;
export type TypographyKey = keyof typeof typography;

