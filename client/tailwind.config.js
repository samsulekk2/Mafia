/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mafia: {
          bg: '#0f0f14',
          card: '#1a1a24',
          accent: '#c41e3a',
          gold: '#d4a853',
          muted: '#6b7280',
        },
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
