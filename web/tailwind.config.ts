/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './store/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f9ff',
          100: '#e1ecff',
          200: '#b6d0ff',
          300: '#85b0ff',
          400: '#4c8dff',
          500: '#2563eb',
          600: '#1f51bd',
          700: '#193f8f',
          800: '#142f63',
          900: '#0f2145'
        },
        ink: '#0b1220'
      }
    }
  },
  plugins: []
};
