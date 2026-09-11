/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#2563EB',
        'primary-dark': '#1D4ED8',
        navy: '#0F172A',
        'body-gray': '#64748B',
        'hero-bg': '#EFF6FF',
        'card-border': '#E5E7EB',
        'footer-bg': '#0F1B3D',
        'footer-text': '#C7D2FE',
      },
      letterSpacing: {
        tight2: '-0.02em',
      },
    },
  },
  plugins: [],
}
