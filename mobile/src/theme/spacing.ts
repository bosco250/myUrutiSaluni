/**
 * Mobile Spacing System
 * Strict 8dp/8px grid system for consistent spacing
 * All spacing values are multiples of 8
 */

export const spacing = {
  // Base unit: 8dp
  xs: 4,   // 0.5x base (4dp) - tight spacing
  sm: 8,   // 1x base (8dp) - small spacing
  md: 16,  // 2x base (16dp) - medium spacing
  lg: 24,  // 3x base (24dp) - large spacing
  xl: 32,  // 4x base (32dp) - extra large spacing
  xxl: 40, // 5x base (40dp) - section spacing
  xxxl: 48, // 6x base (48dp) - screen edge padding
};

// Touch target sizes (minimum 44dp for accessibility)
export const touchTargets = {
  minimum: 44,  // Minimum touch target (iOS/Android standard)
  comfortable: 48, // Comfortable touch target
  large: 56,    // Large touch target for primary actions
};

// Component-specific spacing
export const componentSpacing = {
  // Button padding
  buttonVertical: 12,   // 1.5x base (12dp)
  buttonHorizontal: 24, // 3x base (24dp)
  
  // Input padding
  inputVertical: 12,   // 1.5x base (12dp)
  inputHorizontal: 16, // 2x base (16dp)
  
  // Card padding
  cardPadding: 16,      // 2x base (16dp)
  cardPaddingLarge: 24, // 3x base (24dp)
  
  // Screen padding
  screenPadding: 16,    // 2x base (16dp)
  screenPaddingLarge: 24, // 3x base (24dp)
  
  // List item spacing
  listItemPadding: 16,  // 2x base (16dp)
  listItemGap: 12,      // 1.5x base (12dp)
  
  // Section spacing
  sectionGap: 24,       // 3x base (24dp)
  sectionGapLarge: 32,  // 4x base (32dp)
};

export type Spacing = typeof spacing;
export type ComponentSpacing = typeof componentSpacing;

