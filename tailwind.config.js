/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#55A630",
          600: "#489128",
          700: "#3d7d22",
          800: "#33691d",
          foreground: "#ffffff",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 20px rgba(15, 23, 42, 0.06)",
        "card-lg": "0 2px 4px rgba(15, 23, 42, 0.04), 0 12px 32px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};
