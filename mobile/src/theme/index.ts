import { SIZES, FONTS, SPACING } from '../constants';
import { colors } from './colors';

export const theme = {
  colors,
  sizes: SIZES,
  fonts: FONTS,
  spacing: SPACING,
};

export type Theme = typeof theme;

// Re-export colors for convenience
export { colors };

