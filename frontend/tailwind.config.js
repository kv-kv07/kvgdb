/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        reint: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#0F7A3E', // Signature REint Forest Green
          700: '#0c6332',
          800: '#094d26',
          900: '#06381c',
          950: '#032110',
        },
        slate: {
          925: '#0b0f17', // High-performance canvas dark-slate
        },
        cockpit: {
          canvas: '#0b0f17',
          panel: 'rgba(15, 23, 42, 0.75)',
          border: 'rgba(30, 41, 59, 0.85)',
          hover: 'rgba(30, 41, 59, 0.5)',
          actual: '#38bdf8', // Clean Sky / Cyan for Actuals
          forecast: '#10b981', // REint Emerald / Forest for Platform Forecast
          imbalance: '#f59e0b', // Muted Amber for Imbalance / Error
          risk: '#f43f5e', // Soft Rose for Deficit Alarms
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'panel': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
        'emerald': '0 2px 10px rgba(15, 122, 62, 0.25)',
      },
    },
  },
  plugins: [],
}
