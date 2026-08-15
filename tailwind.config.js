/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0faf1",
          100: "#dcf3df",
          500: "#16a34a",
          600: "#0f8a3d",
          700: "#0b6e30",
        },
      },
    },
  },
  plugins: [],
};
