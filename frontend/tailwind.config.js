/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0F',
        surface: '#111118',
        elevated: '#1A1A24',
        border: 'rgba(255,255,255,0.06)',
        amber: {
          DEFAULT: '#F5C842',
          hover: '#F7D36A',
          muted: 'rgba(245,200,66,0.15)',
        },
        indigo: {
          DEFAULT: '#6366F1',
          muted: 'rgba(99,102,241,0.15)',
        },
        success: '#10B981',
        danger: '#EF4444',
        text: {
          primary: '#F1F0ED',
          secondary: '#8B8A8F',
          tertiary: '#4A4A55',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-amber': 'pulse-amber 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-amber': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245,200,66,0)' },
          '50%': { boxShadow: '0 0 20px 6px rgba(245,200,66,0.25)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      backgroundImage: {
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
