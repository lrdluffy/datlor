/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B1E28',
        canvas: '#F6F5F2',
        accent: '#3457D5',
        accentDeep: '#243B99',
        line: '#DEDBD3',
      },
      fontFamily: {
        display: ['"Vazirmatn"', '"Segoe UI"', 'sans-serif'],
        body: ['"Vazirmatn"', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
