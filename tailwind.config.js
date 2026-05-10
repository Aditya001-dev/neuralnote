/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'nn-bg':      '#0a0a0f',
        'nn-surface': '#0d0d14',
        'nn-card':    '#16161f',
        'nn-border':  '#1e1e2e',
        'nn-text':    '#e8e8f0',
        'nn-muted':   '#6666aa',
        'nn-accent':  '#00e5a0',
      },
      fontFamily: {
        display: ['Syne', 'system-ui'],
        sans:    ['Space Grotesk', 'system-ui'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      fontWeight: { 700: '700' },
    },
  },
  plugins: [],
};
