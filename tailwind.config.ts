import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef8ef",
          100: "#d9efdc",
          500: "#3d9b5a",
          700: "#25713d",
          900: "#153f25"
        }
      },
      boxShadow: {
        soft: "0 20px 55px rgba(38, 88, 55, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
