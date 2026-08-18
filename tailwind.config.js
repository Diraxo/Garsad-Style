/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0E1526',
          800: '#161F35',
          700: '#232E4A',
          600: '#3C4766',
          500: '#5C6784',
          400: '#8791AA',
          300: '#B7BECF',
          200: '#DDE1EA',
          100: '#EEF1F6',
          50: '#F6F7FB',
        },
        brand: {
          900: '#0F2A6B',
          800: '#123791',
          700: '#1547B8',
          600: '#1E5AE0',
          500: '#2E6BF2',
          400: '#5A8AF5',
          300: '#93B0F8',
          200: '#C6D6FC',
          100: '#E7EEFE',
          50: '#F3F7FF',
        },
        ok: { 700: '#0C6B4F', 600: '#0E8A66', 100: '#E1F5EE' },
        warn: { 700: '#9A5B00', 600: '#B9770A', 100: '#FFF1DB' },
        crit: { 700: '#9C1C2E', 600: '#C4293F', 100: '#FCE4E7' },
      },
      fontFamily: {
        display: ['"Sora"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(14, 21, 38, 0.04), 0 1px 8px 0 rgba(14, 21, 38, 0.04)',
        pop: '0 8px 30px -6px rgba(14, 21, 38, 0.18)',
      },
      borderRadius: {
        xl2: '1.1rem',
      },
    },
  },
  plugins: [],
}
