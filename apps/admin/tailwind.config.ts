import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1a73e8',
          50: '#f8f9fa',
          100: '#e8f0fe',
          200: '#d2e3fc',
          300: '#8ab4f8',
          400: '#4285f4',
          500: '#1a73e8',
          600: '#1967d2',
          700: '#185abc',
          800: '#174ea6',
          900: '#16437e',
        },
        google: {
          blue: '#4285f4',
          red: '#ea4335',
          yellow: '#fbbc05',
          green: '#34a853',
          grey: '#5f6368',
          'border-light': '#dadce0',
          'bg-light': '#f8f9fa',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config;
