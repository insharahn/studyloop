/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        paper: "#fffaf0",
        lemon: "#ffd84d",
        aqua: "#39d5c8",
        berry: "#ff57ce",
        iris: "#6d73ff",
        grass: "#6ee56b",
        coral: "#ff6f61"
      },
      boxShadow: {
        sticker: "0 18px 0 rgba(0, 0, 0, 0.16)",
        hard: "8px 8px 0 #171717",
        glow: "0 24px 70px rgba(109, 115, 255, 0.35)"
      },
      fontFamily: {
        display: ["Impact", "Haettenschweiler", "Arial Narrow", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
