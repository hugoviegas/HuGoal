/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Perplexity-inspired teal
        primary: {
          50: "#f0fdff",
          100: "#ccf7fe",
          200: "#99edfd",
          300: "#4dd9f5",
          400: "#17bedc",
          500: "#0ea5b0",
          600: "#0d8a98",
          700: "#0b7080",
          800: "#0a5e6c",
          900: "#084e5a",
        },
        accent: {
          50: "#ecfdf8",
          100: "#d1faef",
          200: "#a7f3de",
          300: "#6ee7c5",
          400: "#34d3a6",
          500: "#1db89a",
          600: "#169a82",
          700: "#127d6b",
          800: "#0f6459",
          900: "#0c524a",
        },
        dark: {
          bg: "#16181C",
          card: "#16181C",
          border: "#2A2D3A",
          surface: "#22252F",
        },
        light: {
          bg: "#FFFFFF",
          card: "#FFFFFF",
          border: "#E0E4EF",
          surface: "#F2F5FB",
        },
      },
      fontFamily: {
        sans: ["Inter"],
        mono: ["SpaceMono"],
      },
    },
  },
  plugins: [],
};
