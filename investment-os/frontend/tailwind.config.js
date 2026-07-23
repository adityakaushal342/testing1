/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2563eb",
          dark: "#1e40af",
        },
        up: "#16a34a",
        down: "#dc2626",
      },
    },
  },
  plugins: [],
};
