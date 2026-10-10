import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        "layer-01": "var(--layer-01)",
        "layer-02": "var(--layer-02)",
        "border-subtle": "var(--border-subtle)",
        "border-strong": "var(--border-strong)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-helper": "var(--text-helper)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        link: "var(--link)",
        error: "var(--error)",
        success: "var(--success)",
        warning: "var(--warning)",
        "warning-marker": "var(--warning-marker)",
      },
      fontFamily: {
        sans: ["var(--font-ibm-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0px",
        sm: "2px",
        none: "0px",
      },
    },
  },
  plugins: [],
};

export default config;
