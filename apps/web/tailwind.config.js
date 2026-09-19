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
          50: '#f6f7f9',
          500: '#111827',
          900: '#030712',
        }
      }
    },
  },
  plugins: [],
}
