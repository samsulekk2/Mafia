/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mafia: {
          bg: '#0a0a0f',
          'bg-light': '#f4f4f8',
          card: '#13131a',
          'card-2': '#1c1c2e',
          'card-light': '#ffffff',
          accent: '#c41e3a',
          gold: '#d4a853',
          muted: '#6b7280',
          'muted-light': '#4b5563',
          primary: '#3b82f6',
        },
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
      },
      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [],
};
