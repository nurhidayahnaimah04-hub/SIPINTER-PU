/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.jsx',
  ],

  theme: {
    extend: {
      colors: {
        pupr: {
          blue: '#0A3D7A',
          'blue-dark': '#062754',
          'blue-light': '#1E5FA8',
          yellow: '#FDB913',
          'yellow-dark': '#E5A200',
        },

        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
    },
  },

  plugins: [],
}
