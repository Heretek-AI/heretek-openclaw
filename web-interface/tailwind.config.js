/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        'collective': {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          accent: '#06b6d4',
          dark: '#1e1b4b',
          light: '#f5f3ff'
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
