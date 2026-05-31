import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#101112",
          900: "#17191c",
          800: "#25282d",
          700: "#343943",
          600: "#4d5562"
        },
        signal: {
          green: "#14855f",
          amber: "#b7791f",
          red: "#c24135",
          blue: "#2563eb"
        }
      },
      boxShadow: {
        panel: "0 1px 2px rgba(16, 17, 18, 0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;

