
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'media', // or 'class'
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        'brand-primary': '#4F46E5',
        'brand-secondary': '#10B981',
        'light-bg': '#F9FAFB',
        'dark-bg': '#111827',
        'card-bg': '#FFFFFF',
        'dark-card-bg': '#1F2937',
        'text-main': '#1F2937',
        'text-secondary': '#6B7280',
        'dark-text-main': '#F9FAFB',
        'dark-text-secondary': '#9CA3AF',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out forwards',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
