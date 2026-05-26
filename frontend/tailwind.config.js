/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#3b82f6', // blue-500
          focus: '#2563eb',   // blue-600
          content: '#ffffff',
        },
        secondary: {
          DEFAULT: '#8b5cf6', // violet-500
          focus: '#7c3aed',   // violet-600
          content: '#ffffff',
        },
        accent: {
          DEFAULT: '#06b6d4', // cyan-500
          focus: '#0891b2',   // cyan-600
          content: '#ffffff',
        },
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light"], // We only use DaisyUI's light base, handling dark mode manually via Tailwind's 'dark:' classes for total control over the glassmorphism aesthetic.
  },
}
