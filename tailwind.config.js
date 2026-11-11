/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cogni: {
          50: '#f0f6ff',
          100: '#e0edff',
          500: '#0052cc',
          600: '#003ea1',
          700: '#002d72',
          800: '#0a2560',
          900: '#03173d',
          950: '#020b1f',
        },
        sphere: {
          50: '#f0fdff',
          100: '#e0f7fa',
          400: '#00e5ff',
          500: '#00c2ff',
          600: '#0099cc',
        },
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        }
      }
    },
  },
  plugins: [],
};
