import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        mahjong: {
          red: "#8B0000",       
          dark: "#2A0A0A",      
          gold: "#FFD700",      
          goldLight: "#FFFACD", 
          text: "#F5F5DC",      
        }
      },
    },
  },
  plugins: [],
};
export default config;