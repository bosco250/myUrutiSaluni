import { colors } from './colors';
import { typography, fontFamilies } from './typography';
import { spacing, touchTargets, componentSpacing } from './spacing';
import { sizes } from './sizes';

/**
 * Complete Mobile Theme System
 * Production-ready theme with mobile-first design tokens
 */
export const theme = {
  colors,
  typography,
  fontFamilies,
  spacing,
  touchTargets,
  componentSpacing,
  sizes,
  // Backward compatibility - use fontFamilies instead
  fonts: fontFamilies,
};

export type Theme = typeof theme;

// Re-export for convenience
export { colors, typography, spacing, sizes };

