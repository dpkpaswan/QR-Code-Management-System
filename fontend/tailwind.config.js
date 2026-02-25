/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: {
          primary: '#0A0A0F',
          secondary: '#0F0F1A',
          card: 'rgba(15, 15, 30, 0.7)',
        },
        accent: {
          blue: '#3B82F6',
          cyan: '#06B6D4',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
          purple: '#8B5CF6',
        },
        border: {
          subtle: 'rgba(59, 130, 246, 0.15)',
          glow: 'rgba(59, 130, 246, 0.5)',
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
        scanLine: 'scanLine 2s ease-in-out infinite alternate',
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
        meshPulse: 'meshPulse 12s ease-in-out infinite alternate',
        slideInTop: 'slideInTop 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards',
        fadeIn: 'fadeIn 0.3s ease forwards',
        shake: 'shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        scanLine: {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)' },
          '50%': { boxShadow: '0 0 25px rgba(16, 185, 129, 0.8), 0 0 50px rgba(16, 185, 129, 0.3)' },
        },
        meshPulse: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0.7' },
        },
        slideInTop: {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-8px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(8px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};