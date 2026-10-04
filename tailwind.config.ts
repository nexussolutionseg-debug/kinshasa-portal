import type { Config } from "tailwindcss";

// Brand system v4 (2026-10-04) — taken from the client's new logo: a Ferris
// wheel in the Congo flag colors (blue / red / yellow), a blue tower, a red
// "K" with a yellow sun-pin, and a blue river wave. Light, joyful base
// replacing the earlier dark navy/gold "heraldic" theme.
//
// Token names are semantic so pages read naturally:
//   bg / surface / line / ink / muted  — neutrals (page, cards, borders, text)
//   blue / red / yellow                — the three logo colors
//   *-deep / *-dark / *-soft           — tints for text-on-white, hover, chips
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Outfit is self-hosted from npm (@fontsource-variable/outfit) —
        // no Google Fonts request at build or run time, CSP stays 'self'.
        display: ["'Outfit Variable'", "Outfit", "system-ui", "sans-serif"],
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
      },
      colors: {
        brand: {
          bg: "#F5F8FE",
          surface: "#FFFFFF",
          line: "#DCE5F3",
          ink: "#0B2545",
          muted: "#5E6E86",
          blue: "#1A82F5",
          "blue-deep": "#0E5FC9",
          "blue-soft": "#E6F1FF",
          navy: "#0A2A66",
          red: "#D21C2E",
          "red-dark": "#A60E1D",
          "red-soft": "#FDE8EA",
          yellow: "#FCD933",
          "yellow-deep": "#B98A00",
          "yellow-soft": "#FFF7D1",
          danger: "#D21C2E",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,37,69,0.06), 0 8px 24px -12px rgba(11,37,69,0.18)",
        lift: "0 2px 4px rgba(11,37,69,0.06), 0 18px 40px -16px rgba(11,37,69,0.30)",
      },
      keyframes: {
        "wheel-spin": { to: { transform: "rotate(360deg)" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        "pop-in": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        pulse_dot: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".35" } },
      },
      animation: {
        "wheel-spin": "wheel-spin 18s linear infinite",
        marquee: "marquee 60s linear infinite",
        "pop-in": "pop-in .35s ease-out both",
        "live-dot": "pulse_dot 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
