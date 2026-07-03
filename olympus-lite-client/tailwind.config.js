/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 8px 30px rgb(0 0 0 / 0.12)',
        'premium-hover': '0 20px 40px rgb(0 0 0 / 0.18)',
        'glass': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)',
      }
    },
  },
  plugins: [],
}
