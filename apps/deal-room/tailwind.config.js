/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // The Deal Room brand
        ink: '#090909',
        orange: {
          DEFAULT: '#F97316',
          soft: '#FB923C',
        },
        // Control-room surfaces (layered off near-black)
        surface: {
          0: '#090909',
          1: '#121212',
          2: '#1A1A1A',
          3: '#222222',
        },
        edge: '#2A2A2A',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'agent-pulse': {
          '0%, 100%': { opacity: '0.45', transform: 'scale(0.85)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
        'agent-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(249, 115, 22, 0.5)' },
          '100%': { boxShadow: '0 0 0 6px rgba(249, 115, 22, 0)' },
        },
      },
      animation: {
        'agent-pulse': 'agent-pulse 1.6s ease-in-out infinite',
        'agent-ring': 'agent-ring 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
}
