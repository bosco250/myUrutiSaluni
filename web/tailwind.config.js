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
        primary: '#0891b2', // Deep Teal
        'background-light': '#f8fafc',
        'background-dark': '#0c1416',
        'text-light': '#111814',
        'text-dark': '#e2e8f0',
        'border-light': '#e2e8f0',
        'border-dark': '#334155',
        'surface-light': '#ffffff',
        'surface-dark': '#1e293b',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        // Additional colors for variety
        'slate-400': '#94a3b8',
        'slate-500': '#64748b',
        'slate-600': '#475569',
        'slate-700': '#334155',
      },
      backgroundColor: {
        'background-light': '#f8fafc',
        'background-dark': '#0c1416',
        'surface-light': '#ffffff',
        'surface-dark': '#1e293b',
      },
      textColor: {
        'text-light': '#111814',
        'text-dark': '#e2e8f0',
      },
      borderColor: {
        'border-light': '#e2e8f0',
        'border-dark': '#334155',
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

