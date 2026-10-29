/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        // Pantallas bajas (p. ej. notebooks 1366×768): compacta el espaciado vertical
        short: { raw: '(max-height: 820px)' },
      },
      fontFamily: {
        sans: ['Figtree', 'system-ui', 'sans-serif'],
        display: ['Quicksand', 'Figtree', 'sans-serif'],
      },
      colors: {
        // Paleta SOMA: los valores viven en src/theme.css y cambian con el tema
        // ── Paciente: coral / terracota ──
        brand: {
          50: 'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
          950: 'rgb(var(--brand-950) / <alpha-value>)',
        },
        // ── Profesional: terracota tostado ──
        pro: {
          50: 'rgb(var(--pro-50) / <alpha-value>)',
          100: 'rgb(var(--pro-100) / <alpha-value>)',
          200: 'rgb(var(--pro-200) / <alpha-value>)',
          300: 'rgb(var(--pro-300) / <alpha-value>)',
          400: 'rgb(var(--pro-400) / <alpha-value>)',
          500: 'rgb(var(--pro-500) / <alpha-value>)',
          600: 'rgb(var(--pro-600) / <alpha-value>)',
          700: 'rgb(var(--pro-700) / <alpha-value>)',
          800: 'rgb(var(--pro-800) / <alpha-value>)',
          900: 'rgb(var(--pro-900) / <alpha-value>)',
          950: 'rgb(var(--pro-950) / <alpha-value>)',
        },
        // ── Ánimo 1-10: semáforo rojo → amarillo → verde (ver lib/constants.js) ──
        mood: {
          1: '#c43f3e',
          2: '#ce4d2d',
          3: '#d7621d',
          4: '#df7b0c',
          5: '#e69812',
          6: '#e3af19',
          7: '#b6a800',
          8: '#7fa11c',
          9: '#4b943b',
          10: '#1a8748',
        },
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-up':   'slideUp 0.25s ease-out',
        'bounce-soft':'bounceSoft 0.4s ease-in-out',
        'scale-in':   'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp:   { '0%': { transform: 'translateY(10px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        bounceSoft:{ '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.06)' } },
        scaleIn:   { '0%': { transform: 'scale(0.95)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
