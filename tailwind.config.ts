import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: "var(--bg-900)",
          800: "var(--bg-800)",
          700: "var(--bg-700)",
          600: "var(--bg-600)",
          500: "var(--bg-500)",
          400: "var(--bg-400)",
          300: "var(--bg-300)",
          200: "var(--bg-200)",
          100: "var(--bg-100)",
        },
        accent: {
          blue: "var(--accent-blue)",
          green: "var(--accent-green)",
          purple: "var(--accent-purple)",
          orange: "var(--accent-orange)",
          red: "var(--accent-red)",
        },
      },
      screens: {
        xs: "400px",
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
