module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          50: '#fdfbf4',
          100: '#faf5e1',
          200: '#f5e9c3',
          300: '#efd99a',
          400: '#e7c370',
          500: '#D4A94A',  // Lighter gold
          600: '#B8913A',  // BookedBarber Gold (from logo)
          700: '#9A7630',
          800: '#7d5f2a',
          900: '#664d25',
          950: '#3b2c13'
        },
        olive: {
          50: '#f4f5f4',
          100: '#e5e7e5',
          200: '#c9cec9',
          300: '#a5aea6',
          400: '#7a8a7c',
          500: '#546355',  // Primary Light
          600: '#3C4A3E',  // Primary (Deep Olive)
          700: '#2A352D',  // Primary Dark
          800: '#232b24',
          900: '#1a201b',
          950: '#0f120f'
        },
        gold: {
          50: '#faf8f3',
          100: '#f3eedd',
          200: '#e8ddb9',
          300: '#D4B878',  // Secondary Light
          400: '#C5A35B',  // Secondary (Rich Gold)
          500: '#C5A35B',  // Also at 500 for consistency
          600: '#A58341',  // Secondary Dark
          700: '#8a6d36',
          800: '#6e572c',
          900: '#5a4724',
          950: '#2a2011'
        },
        sand: {
          50: '#fdfcfa',
          100: '#f5f2eb',
          200: '#EAE3D2',  // Light Sand (background)
          300: '#dfd1b5',
          400: '#cdb894',
          500: '#b89968',
          600: '#9e7e53',
          700: '#806544',
          800: '#6a5439',
          900: '#5a4732',
        },
        charcoal: {
          50: '#f3f4f3',
          100: '#e2e3e2',
          200: '#c5c7c5',
          300: '#9ea19e',
          400: '#6f746f',
          500: '#4a4f4a',
          600: '#383d39',
          700: '#2C322D',  // Charcoal Olive (dark bg)
          800: '#1F2320',  // Gunmetal (text)
          900: '#171a18',
          950: '#0b0c0b'
        },
        warmgray: {
          50: '#faf9f7',
          100: '#f2efe9',
          200: '#e5dfd2',
          300: '#d1c8b4',
          400: '#BEB7A7',  // Warm Gray (dark mode text)
          500: '#a59886',
          600: '#8a7b6b',
          700: '#70635a',
          800: '#5d524b',
          900: '#4f4540',
        },
        moss: {
          50: '#f2f8f2',
          100: '#e0f0df',
          200: '#c1e1bf',
          300: '#96cb94',
          400: '#70b46d',
          500: '#6BA368',  // Success
          600: '#5a8958',
          700: '#456844',
          800: '#395538',
          900: '#30472f',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#E6B655',  // Warning
          600: '#d4a343',
          700: '#b59031',
          800: '#92400e',
          900: '#78350f',
        },
        softred: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#D9534F',  // Error
          600: '#c4403c',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}