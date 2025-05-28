import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#00ae98",
          foreground: "#ffffff",
          50: "#e6f9f6",
          100: "#ccf3ed",
          200: "#99e7db",
          300: "#66dbc9",
          400: "#33cfb7",
          500: "#00ae98",
          600: "#008b7a",
          700: "#00685b",
          800: "#00463d",
          900: "#00231e",
        },
        secondary: {
          DEFAULT: "#707070",
          foreground: "#ffffff",
          50: "#f0f0f0",
          100: "#e1e1e1",
          200: "#c3c3c3",
          300: "#a5a5a5",
          400: "#878787",
          500: "#707070",
          600: "#595959",
          700: "#434343",
          800: "#2c2c2c",
          900: "#161616",
        },
        accent: {
          DEFAULT: "#ff6b6b",
          foreground: "#ffffff",
          50: "#fff0f0",
          100: "#ffe1e1",
          200: "#ffc3c3",
          300: "#ffa5a5",
          400: "#ff8787",
          500: "#ff6b6b",
          600: "#cc5656",
          700: "#994040",
          800: "#662b2b",
          900: "#331515",
        },
        background: {
          DEFAULT: "#121212",
          foreground: "#ffffff",
        },
        card: {
          DEFAULT: "#1e1e1e",
          foreground: "#ffffff",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 5px #00ae98, 0 0 10px #00ae98, 0 0 15px #00ae98",
          },
          "50%": {
            boxShadow: "0 0 10px #00ae98, 0 0 20px #00ae98, 0 0 30px #00ae98",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "glow-pulse": "glow-pulse 3s infinite",
        float: "float 6s ease-in-out infinite",
        "slide-up": "slide-up 0.5s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
