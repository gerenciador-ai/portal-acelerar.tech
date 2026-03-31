/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'acelerar-dark-blue': '#1e3a5f',
        'acelerar-light-blue': '#6ab3e4',
        'acelerar-white': '#ffffff',
      },
    },
  },
  plugins: [],
};
