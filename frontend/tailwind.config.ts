import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./providers/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary:   "#6E54FF",
        surface:   "#160D2E",
        highlight: "#DDD7FE",
        success:   "#3DDC97",
        error:     "#FF5A5A",
      },
      borderRadius: {
        brand: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
