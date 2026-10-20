/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#EEF1F8',
          100: '#D6DDEF',
          200: '#B0BDD9',
          300: '#8A9DC3',
          400: '#6B80AE',
          500: '#4E6499',
          600: '#3E4A63',
          700: '#2D3748',
          800: '#1B2A4A',
          900: '#0F1A2E',
        },
        amber: {
          50: '#FFF8EB',
          100: '#FFECC4',
          200: '#FFD98A',
          300: '#FFC94D',
          400: '#E8A33D',
          500: '#D4912E',
          600: '#B87A1F',
          700: '#8C5D18',
        },
        mint: {
          50: '#E8F8F4',
          100: '#C5EDE5',
          200: '#9FE2D5',
          300: '#63C7B2',
          400: '#4DAA9A',
          500: '#3A9082',
        },
      },
    },
  },
  plugins: [],
};
