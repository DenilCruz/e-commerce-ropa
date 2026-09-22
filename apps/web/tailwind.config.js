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
          50: '#FAF8F5',
          100: '#F5F0E6',
          200: '#EBE3D5',
          500: '#161513',
          900: '#0C0A09',
        },
        cream: {
          50: '#FCFBF9',
          100: '#FAF8F5',
          200: '#F4EFE6',
          300: '#EBE3D5',
          400: '#DDD2C0',
          500: '#C5B59E',
        },
        sand: {
          50: '#FAF7F0',
          100: '#F3EDE2',
          200: '#E8DDCB',
          300: '#D5C4AC',
          400: '#BFA888',
          500: '#9B7B54',
          600: '#83653F',
        },
        taupe: {
          50: '#F7F6F4',
          100: '#EFECE7',
          200: '#E1DBD2',
          300: '#CEC5B7',
          400: '#B3A796',
          500: '#8E7F6B',
        },
        noir: {
          DEFAULT: '#161513',
          soft: '#24221F',
          deep: '#0D0C0B',
        },
        blush: {
          50: '#FBF6F4',
          100: '#F7EBE8',
          200: '#EED9D3',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        display: ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        luxury: '0.18em',
      },
    },
  },
  plugins: [],
}
