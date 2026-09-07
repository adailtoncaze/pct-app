import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pct: {
          bg: "#f3f2f1",
          panel: "#ffffff",
          border: "#edebe9",
          accent: "#6264a7",
          accentStrong: "#4f52b3",
          text: "#201f1e",
          muted: "#605e5c",
          success: "#2e7d32",
          warning: "#ffb900",
          info: "#0078d4",
          danger: "#d13438",
        },
      },
      boxShadow: {
        teams: "0 1px 2px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04)",
        teamsInset: "inset 0 0 0 1px rgba(98, 100, 167, 0.12)",
      },
      borderRadius: {
        teams: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
