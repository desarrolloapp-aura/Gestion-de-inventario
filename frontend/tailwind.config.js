/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tema minero Aura
        'minero': {
          'negro': '#0A0A0A',
          'carbono': '#1A1A1A',
          'gris': '#2A2A2A',
          'naranja': '#FF6B35',
          'naranja-oscuro': '#E55A2B',
          'rojo': '#DC2626',
          'rojo-oscuro': '#B91C1C',
        },
      },
      fontFamily: {
        'mono': ['Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}





