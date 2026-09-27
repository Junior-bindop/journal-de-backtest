/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        trade: {
          tp: '#10b981',
          sl: '#ef4444',
          be: '#6b7280',
        },
        notion: {
          bg: '#ffffff',
          darkBg: '#191919',
          border: '#e5e7eb',
          darkBorder: '#2f2f2f',
          hover: '#f3f4f6',
          darkHover: '#262626',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
