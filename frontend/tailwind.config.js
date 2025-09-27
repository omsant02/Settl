/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        delius: ["var(--font-delius)"],
        "comic-neue": ["var(--font-comic-neue)"],
      },
    },
  },
  plugins: [],
};
