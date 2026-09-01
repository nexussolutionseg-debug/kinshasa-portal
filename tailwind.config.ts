import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Editorial display serif for headline moments (hero titles, page
        // titles, commune names). Uses a system/web-safe serif stack —
        // deliberately not a Google Font — so headline rendering never
        // depends on a build-time or runtime network fetch.
        display: ["Georgia", "'Times New Roman'", "'Noto Serif'", "serif"],
      },
      colors: {
        brand: {
          navy: "#0B1E3A",
          "navy-light": "#14294A",
          "navy-border": "#22385C",
          gold: "#C8992E",
          "gold-light": "#E4C767",
          green: "#2F6B45",
          river: "#5FA8C9",
          cream: "#F4F1E9",
          muted: "#9C9284",
          plum: "#6E4A63",
          danger: "#C4453A",
        },
      },
    },
  },
  plugins: [],
};
export default config;
