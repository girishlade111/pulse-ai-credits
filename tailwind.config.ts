import type { Config } from "tailwindcss";
// ESM import rather than `require`: this config is loaded as an ES module, and
// the CJS form also trips the no-require-imports rule.
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Design tokens are declared once in src/index.css as HSL channels and mapped
 * here. Radii and the font stack follow DESIGN.md exactly:
 * controls 8px · cards 12px · pills full.
 */
export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: "1.5rem",
			screens: {
				"2xl": "1200px",
			},
		},
		extend: {
			colors: {
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',

				ink: 'hsl(var(--foreground))',
				body: 'hsl(var(--body))',
				canvas: 'hsl(var(--background))',
				"canvas-soft": 'hsl(var(--canvas-soft))',
				"surface-strong": 'hsl(var(--surface-strong))',
				"on-primary": 'hsl(var(--primary-foreground))',

				hairline: {
					DEFAULT: 'hsl(var(--hairline))',
					soft: 'hsl(var(--hairline-soft))',
					strong: 'hsl(var(--hairline-strong))',
				},

				// AI-timeline pastels — scoped to in-product agent visualizations
				timeline: {
					thinking: 'hsl(var(--timeline-thinking))',
					grep: 'hsl(var(--timeline-grep))',
					read: 'hsl(var(--timeline-read))',
					edit: 'hsl(var(--timeline-edit))',
					done: 'hsl(var(--timeline-done))',
				},

				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--primary-foreground))',
				},
				// DEFAULT is muted *text*; use `muted.surface` for fills.
				muted: {
					DEFAULT: 'hsl(var(--muted-foreground))',
					foreground: 'hsl(var(--muted-foreground))',
					surface: 'hsl(var(--muted-surface))',
					soft: 'hsl(var(--muted-soft))',
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
			},
			fontFamily: {
				sans: [
					"Inter",
					"system-ui",
					"-apple-system",
					"'Helvetica Neue'",
					"Helvetica",
					"Arial",
					"sans-serif",
				],
				mono: [
					"'JetBrains Mono'",
					"'Fira Code'",
					"ui-monospace",
					"SFMono-Regular",
					"Menlo",
					"monospace",
				],
			},
			borderRadius: {
				none: "0px",
				xs: "4px",
				sm: "6px",
				md: "8px",
				lg: "12px",
				xl: "16px",
				pill: "9999px",
			},
			maxWidth: {
				page: "1200px",
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
				"fade-in-up": {
					from: { opacity: "0", transform: "translateY(12px)" },
					to: { opacity: "1", transform: "translateY(0)" },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
				"fade-in-up": "fade-in-up 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) both",
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
