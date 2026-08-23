/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — deep navy/teal for a serious research platform
        primary: {
          50:  '#eef7ff',
          100: '#d9edff',
          200: '#bcdfff',
          300: '#8ecbff',
          400: '#59adff',
          500: '#348fff',
          600: '#1a6ef7',
          700: '#1358e4',
          800: '#1648b8',
          900: '#183f90',
          950: '#132858',
        },
        // Accent — vibrant teal-cyan for highlights
        accent: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        // Surface — dark backgrounds for the dashboard
        surface: {
          950: '#060b14',
          900: '#0a1020',
          800: '#0e1628',
          700: '#131e35',
          600: '#1a2744',
          500: '#243256',
          400: '#304068',
          300: '#3d5080',
          200: '#4d6396',
          100: '#6178aa',
        },
        // Status colours
        success: { 400: '#34d399', 500: '#10b981', 600: '#059669' },
        warning: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
        danger:  { 400: '#f87171', 500: '#ef4444', 600: '#dc2626' },
        info:    { 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow':  'spin 8s linear infinite',
        'fade-in':    'fadeIn 0.4s ease-out',
        'slide-in':   'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateX(-12px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
