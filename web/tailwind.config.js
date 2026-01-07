/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ============================================
        // PRIMARY BRAND COLORS (from mobile)
        // ============================================
        primary: '#C89B68', // Main brand color - Links, accents, focus states
        'primary-dark': '#A67C52', // Darker shade for pressed/hover states
        'primary-light': '#D4B896', // Lighter shade for subtle backgrounds

        // ============================================
        // BUTTON COLORS (from mobile)
        // ============================================
        'button-primary': '#000000', // Primary button background
        'button-primary-text': '#FFFFFF', // Primary button text color
        'button-secondary': '#5856D6', // Secondary button background
        'button-secondary-text': '#FFFFFF', // Secondary button text color

        // ============================================
        // SECONDARY BRAND COLORS (from mobile)
        // ============================================
        secondary: '#5856D6', // Secondary brand color
        'secondary-dark': '#3D3BB3', // Darker shade of secondary
        'secondary-light': '#7A78E8', // Lighter shade of secondary

        // ============================================
        // SEMANTIC COLORS (from mobile)
        // ============================================
        success: '#34C759', // Success states, checkmarks, positive actions
        'success-light': '#5CD87A', // Light success background
        'success-dark': '#059669', // Dark success variant

        warning: '#FF9500', // Warning messages, caution states
        'warning-light': '#FFB340', // Light warning background
        'warning-dark': '#D97706', // Dark warning variant

        error: '#FF3B30', // Error states, validation errors
        danger: '#FF3B30', // Alias for error (backward compatibility)
        'error-light': '#FF6B63', // Light error background
        'error-dark': '#DC2626', // Dark error variant

        info: '#C89B68', // Info messages (matches primary)
        'info-light': '#D4B896', // Light info background
        'info-dark': '#2563EB', // Dark info variant

        // ============================================
        // BACKGROUND COLORS (from mobile)
        // ============================================
        background: '#FFFFFF', // Main screen background
        'background-light': '#FAFAFA', // Light mode background (slightly off-white)
        'background-dark': '#111827', // Dark mode background
        'background-secondary': '#F0F0F0', // Input fields, cards background (more contrast)
        'background-tertiary': '#E8E8E8', // Subtle backgrounds, dividers

        // ============================================
        // SURFACE COLORS (from mobile)
        // ============================================
        'surface-light': '#FFFFFF', // Light surfaces (pure white for cards)
        'surface-dark': '#1F2937', // Dark surfaces

        // ============================================
        // TEXT COLORS (from mobile - WCAG AA Compliant)
        // ============================================
        text: '#000000', // Primary text color
        'text-light': '#000000', // Light mode text
        'text-dark': '#FFFFFF', // Dark mode text
        'text-secondary': '#6B6B70', // Secondary text
        'text-tertiary': '#AEAEB2', // Tertiary text
        'text-inverse': '#FFFFFF', // Text on dark backgrounds
        'text-disabled': '#C7C7CC', // Disabled text color

        // ============================================
        // BORDER COLORS (from mobile)
        // ============================================
        border: '#D1D1D6', // Default border color (more visible)
        'border-light': '#D1D1D6', // Light borders, dividers (more contrast)
        'border-dark': '#374151', // Dark borders, emphasis
        'border-focus': '#C89B68', // Focused input border (matches primary)

        // ============================================
        // SOCIAL MEDIA BRAND COLORS (from mobile)
        // ============================================
        'facebook-blue': '#1877F2', // Facebook brand color

        // ============================================
        // NEUTRAL GRAYS (from mobile - Design System Scale)
        // ============================================
        white: '#FFFFFF',
        black: '#000000',
        'gray-50': '#FAFAFA', // Lightest gray
        'gray-100': '#F5F5F5', // Very light gray
        'gray-200': '#E5E5EA', // Light gray
        'gray-300': '#D1D1D6', // Medium-light gray
        'gray-400': '#C7C7CC', // Medium gray
        'gray-500': '#AEAEB2', // Medium-dark gray
        'gray-600': '#8E8E93', // Dark gray
        'gray-700': '#374151', // Darker gray
        'gray-800': '#1F2937', // Very dark gray (dark mode card)
        'gray-900': '#111827', // Darkest gray (dark mode background)

        // ============================================
        // OVERLAY & MODAL COLORS (from mobile)
        // ============================================
        overlay: 'rgba(0, 0, 0, 0.5)', // Standard overlay for modals
        'overlay-light': 'rgba(0, 0, 0, 0.3)', // Light overlay
        'overlay-dark': 'rgba(0, 0, 0, 0.7)', // Dark overlay for emphasis
      },
      backgroundColor: {
        'background-light': '#FAFAFA',
        'background-dark': '#111827',
        'surface-light': '#FFFFFF',
        'surface-dark': '#1F2937',
      },
      textColor: {
        'text-light': '#000000',
        'text-dark': '#FFFFFF',
      },
      borderColor: {
        'border-light': '#D1D1D6',
        'border-dark': '#374151',
      },
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
}

