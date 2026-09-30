import type { Config } from "tailwindcss";
import containerQueries from "@tailwindcss/container-queries";

import colors from "tailwindcss/colors";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "360px",
      sm: "480px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1600px",
    },
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
        },
        line: {
          DEFAULT: "var(--line)",
          strong: "var(--line-strong)",
        },
        text: {
          DEFAULT: "var(--text)",
          muted: "var(--text-muted)",
        },
        brass: {
          DEFAULT: "var(--brass)",
          soft: "var(--brass-soft)",
        },
        cyan: {
          ...colors.cyan,
          DEFAULT: "var(--cyan)",
          soft: "var(--cyan-soft)",
        },
        violet: {
          DEFAULT: "var(--violet)",
          soft: "var(--violet-soft)",
        },
        gold: {
          DEFAULT: "var(--gold)",
          light: "var(--gold-light)",
          dark: "var(--gold-dark)",
          glow: "var(--gold-glow)",
        },
        jade: "var(--jade)",
        rust: "var(--rust)",
        amber: {
          ...colors.amber,
          DEFAULT: "var(--amber)",
        },
        grid: "var(--grid)",
        accent: "var(--brass)",
        positive: "var(--jade)",
        negative: "var(--rust)",
        caution: "var(--amber)",
      },
      boxShadow: {
        theme: "var(--shadow)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      transitionDuration: {
        instant: "var(--dur-instant)",
        fast: "var(--dur-fast)",
        base: "var(--dur-base)",
        slow: "var(--dur-slow)",
        story: "var(--dur-story)",
      },
      transitionTimingFunction: {
        "out-custom": "var(--ease-out)",
        "in-custom": "var(--ease-in)",
        "spring-custom": "var(--ease-spring)",
      },
    },
  },
  plugins: [containerQueries],
};

export default config;
