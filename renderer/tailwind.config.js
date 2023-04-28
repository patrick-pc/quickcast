const colors = require('tailwindcss/colors')

module.exports = {
  content: ['./renderer/pages/**/*.{js,ts,jsx,tsx}', './renderer/components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      black: colors.black,
      white: colors.white,
      transparent: colors.transparent,
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
