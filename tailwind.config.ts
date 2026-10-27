/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090B',
        surface: '#18181B',
        'surface-2': '#27272A',
        border: 'rgba(255,255,255,0.10)',
        'border-strong': 'rgba(255,255,255,0.18)',
        text: '#FFFFFF',
        muted: '#A1A1AA',
        accent: '#D4D4D8',
        danger: '#EF4444',
        'danger-dim': 'rgba(239,68,68,0.15)',
        success: '#22C55E',
        'success-dim': 'rgba(34,197,94,0.15)',
        warning: '#F59E0B',
        'warning-dim': 'rgba(245,158,11,0.15)',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-noise': "url('/noise.svg')",
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255,255,255,0.1)' },
          '100%': { boxShadow: '0 0 20px rgba(255,255,255,0.3)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
