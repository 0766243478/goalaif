import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: '#141414',
        border: '#1e1e1e',
        accent: {
          red: '#ff4444',
          orange: '#ff8800',
          amber: '#ffaa00',
          green: '#44ff44',
          blue: '#4488ff',
        },
        text: {
          primary: '#e0e0e0',
          secondary: '#808080',
          muted: '#505050',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'code': '0.8125rem',
      },
    },
  },
  plugins: [],
}

export default config
