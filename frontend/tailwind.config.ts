import type { Config } from "tailwindcss";
const config: Config = {
  darkMode: ["class", ".theme-dark"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui"] },
      boxShadow: { glass: "0 20px 70px rgba(0,0,0,.25)" }
    }
  },
  plugins: []
};
export default config;
