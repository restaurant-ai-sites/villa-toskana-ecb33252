/** @type {import('tailwindcss').Config} */
// reservation_01 — Zarif & Beyaz-Gri: fine dining, mat antrasit vurgu
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#fcfcfb",
        sand: "#efefed",
        coffee: "#232323",
        terra: "#1f2937",
        terradark: "#111827",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
