/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d9edff',
          200: '#bce0ff',
          300: '#8eceff',
          400: '#59b2ff',
          500: '#3391ff',
          600: '#1a71f5',
          700: '#145ce1',
          800: '#174ab6',
          900: '#19418f',
          950: '#142957',
        },
        energy: {
          wind: '#06b6d4',
          solar: '#f59e0b',
          thermal: '#ef4444',
          green: '#10b981',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
