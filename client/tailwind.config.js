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
          50:  '#fff5ec',
          100: '#ffe7d2',
          200: '#ffcba8',
          300: '#f5a477',
          400: '#df7952',
          500: '#bd5940',
          600: '#914131',
        },
        lavender: {
          50:  '#eef6ff',
          100: '#dcecff',
          200: '#bdd8f4',
          300: '#91b9e5',
          400: '#6298d0',
        },
        peach: {
          50:  '#fff8ed',
          100: '#ffebc7',
          200: '#ffd398',
          300: '#f3ae55',
        },
        sky: {
          pastel: '#e0f2fe',
        },
        // ── Paleta psicólogo — azul petróleo profesional ──
        indigo: {
          50:  '#eef4ff',
          100: '#dce8ff',
          200: '#bfd2f5',
          400: '#6c91cf',
          500: '#466eae',
          600: '#34578e',
          700: '#294775',
          800: '#223a60',
          900: '#192b48',
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
