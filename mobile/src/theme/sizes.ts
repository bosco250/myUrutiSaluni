/**
 * Mobile Size System
 * Standardized sizes for components and UI elements
 */

export const sizes = {
  // Border radius
  radius: {
    xs: 4,   // Small radius (4dp)
    sm: 8,   // Small radius (8dp)
    md: 12,  // Medium radius (12dp)
    lg: 16,  // Large radius (16dp)
    xl: 24,  // Extra large radius (24dp)
    round: 9999, // Fully rounded
  },
  
  // Icon sizes
  icon: {
    xs: 16,  // Extra small icon (16dp)
    sm: 20,  // Small icon (20dp)
    md: 24,  // Medium icon (24dp) - standard
    lg: 32,  // Large icon (32dp)
    xl: 40,  // Extra large icon (40dp)
  },
  
  // Avatar sizes
  avatar: {
    xs: 24,  // Extra small avatar (24dp)
    sm: 32,  // Small avatar (32dp)
    md: 40,  // Medium avatar (40dp)
    lg: 56,  // Large avatar (56dp)
    xl: 80,  // Extra large avatar (80dp)
  },
  
  // Badge sizes
  badge: {
    sm: 16,  // Small badge (16dp)
    md: 20,  // Medium badge (20dp)
    lg: 24,  // Large badge (24dp)
  },
  
  // Divider/separator
  divider: {
    thin: 1,   // Thin divider (1dp)
    medium: 2, // Medium divider (2dp)
    thick: 4,  // Thick divider (4dp)
  },
  
  // Shadow/elevation
  elevation: {
    none: 0,
    sm: 2,   // Small elevation
    md: 4,   // Medium elevation
    lg: 8,   // Large elevation
    xl: 16,  // Extra large elevation
  },
};

export type Sizes = typeof sizes;

