import type { Config } from "tailwindcss";

/**
 * CASCADE-EPC design system.
 * Brand palette is derived from the logo SVGs (blue gate, orange accent, steel C).
 * Semantic surface/text/border tokens are CSS variables (see styles/index.css) so
 * light/dark themes flip without changing component classes.
 */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ---- Brand (static across themes) ----
        brand: {
          blue: {
            light: "#65A3FF",
            DEFAULT: "#0057FF",
            dark: "#003DBF",
          },
          orange: {
            light: "#FFC46B",
            DEFAULT: "#E07C00",
            dark: "#A94F00",
          },
          green: "#00B37A",
        },
        steel: {
          50: "#FFFFFF",
          100: "#E8EDF5",
          200: "#BAC5D3",
          300: "#9AA8BA",
          400: "#79889A",
          500: "#566476",
          600: "#3A4757",
          700: "#283543",
          800: "#1B2636",
          900: "#0F1723",
        },
        // ---- WBS status (display status) ----
        status: {
          notstarted: "#79889A",
          progress: "#0057FF",
          done: "#00B37A",
          blocked: "#E5484D",
        },
        // ---- Priority flags ----
        priority: {
          p1: "#E5484D",
          p2: "#E07C00",
          p3: "#79889A",
        },
        // ---- Semantic, theme-driven (CSS vars) ----
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-dim": "rgb(var(--ink-dim) / <alpha-value>)",
        "ink-mute": "rgb(var(--ink-mute) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
      },
      fontFamily: {
        brand: ['"Orbitron"', '"Arial Black"', "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "Segoe UI", "Roboto", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "Consolas", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        card: "0.5rem",
      },
      boxShadow: {
        panel: "0 14px 28px -12px rgba(0, 8, 20, 0.45)",
        inset: "inset 0 0 0 1px rgb(var(--line))",
      },
      backgroundImage: {
        // Engineering grid background — fine + coarse lines.
        grid: "var(--grid-bg)",
      },
      backgroundSize: {
        "grid-fine": "24px 24px",
      },
    },
  },
  plugins: [],
} satisfies Config;
