/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Space Grotesk', 'DM Sans', 'sans-serif'],
      },
      colors: {
        // ── Paleta SOMA — bienestar clínico cálido ──
        sage: {
          50:  '#edf8f4',
          100: '#d8f0e7',
          200: '#b4e1d0',
          300: '#7cc7ad',
          400: '#4eaa8b',
          500: '#2f876e',
          600: '#236653',
        },
        lavender: {
          50:  '#eff7f8',
          100: '#d9edf0',
          200: '#b7dce2',
          300: '#83c3cc',
          400: '#55a3b0',
        },
        peach: {
          50:  '#fff6ef',
          100: '#ffe4d3',
          200: '#ffc6aa',
          300: '#f49a73',
        },
        sky: {
          pastel: '#e0f2fe',
        },
        // ── Paleta psicólogo — azul petróleo profesional ──
        indigo: {
          50:  '#edf5f6',
          100: '#d8e9eb',
          200: '#b4d4d8',
          400: '#4e9ca6',
          500: '#267783',
          600: '#1b5d68',
          700: '#154b55',
          800: '#123e47',
          900: '#0d3038',
        },
        // ── Colores de ánimo 1-10 ──
        mood: {
          1:  '#dc2626',
          2:  '#ea580c',
          3:  '#d97706',
          4:  '#ca8a04',
          5:  '#65a30d',
          6:  '#16a34a',
          7:  '#059669',
          8:  '#0d9488',
          9:  '#4f46e5',
          10: '#7c3aed',
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
