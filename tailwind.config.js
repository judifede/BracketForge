/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./src/**/*.css",
  ],
  theme: {
    extend: {
      spacing: {
        'form_gap': '2.5rem',
      },
      colors: {
        deep: 'var(--bg-deep)',
        stage: 'var(--bg-stage)',
        panel: 'var(--bg-panel)',
        slot: 'var(--bg-slot)',
        subtle: 'var(--border-subtle)',
        muted: 'var(--border-muted)',
        live: 'var(--accent-live)',
        win: 'var(--accent-win)',
        brand: 'var(--accent-brand)',
        'text-muted': 'var(--text-muted)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      keyframes: {
        'setup-enter': {
          from: { opacity: '0', transform: 'translateY(0.5rem)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'champion-pop': {
          from: { opacity: '0', transform: 'translateY(-0.35rem) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'drawer-in': {
          from: { transform: 'translateX(1rem)', opacity: '0.6' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'scroll-hint-fade': {
          from: { opacity: '0', transform: 'translateY(-0.25rem)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'trophy-pulse': {
          '0%': {
            filter: 'drop-shadow(0 0 2px color-mix(in srgb, var(--accent-win) 25%, transparent))',
            opacity: '0.85',
          },
          '45%': {
            filter: 'drop-shadow(0 0 16px color-mix(in srgb, var(--accent-win) 80%, transparent))',
            opacity: '1',
          },
          '100%': {
            filter: 'drop-shadow(0 0 10px color-mix(in srgb, var(--accent-win) 70%, transparent))',
            opacity: '1',
          },
        },
      },
      animation: {
        'setup-enter': 'setup-enter 0.45s ease-out',
        'champion-pop': 'champion-pop 0.45s ease-out',
        'drawer-in': 'drawer-in 0.28s ease-out',
        'scroll-hint-fade': 'scroll-hint-fade 0.35s ease-out',
        'trophy-pulse': 'trophy-pulse 1.2s ease-out',
      },
    },
  },
  plugins: [],
}
