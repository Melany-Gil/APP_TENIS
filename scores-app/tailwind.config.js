/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',

  theme: {
    extend: {

      // ── COLORES → apuntan a tus CSS variables ─────────────
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--color-brand-rgb) / <alpha-value>)',
          dim:     'var(--color-brand-dim)',
        },
        app: {
          bg:      'var(--bg-primary)',
          sidebar: 'var(--bg-sidebar)',
          card:    'var(--bg-card)',
          input:   'var(--bg-input)',
          hover:   'var(--bg-hover)',
        },
        txt: {
          base:      'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
        },
        border: {
          DEFAULT: 'var(--border-color)',
          hover:   'var(--border-hover)',
          focus:   'var(--border-focus)',
        },
        live:  '#ef4444',
        win:   '#22c55e',
        loss:  '#ef4444',
      },

      // ── TIPOGRAFÍA ─────────────────────────────────────────
      fontFamily: {
        sans: ['Manrope', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },

      // ── ANIMACIONES ────────────────────────────────────────
      keyframes: {
        'fade-up': {
          '0%':   { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'scale-in': {
          '0%':   { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        'slide-left': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },

      animation: {
        'fade-up':    'fade-up 0.3s ease-out both',
        'fade-in':    'fade-in 0.2s ease-out both',
        'scale-in':   'scale-in 0.2s ease-out both',
        'slide-left': 'slide-left 0.3s ease-out',
      },

      // ── BREAKPOINTS ────────────────────────────────────────
      screens: {
        xs: '375px',
      },
    },
  },

  plugins: [],
}
