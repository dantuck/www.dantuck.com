import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [presetUno()],
  theme: {
    colors: {
      'site-bg': 'rgb(45,54,66)',
      'site-text': 'rgb(170,170,170)',
      'site-text-muted': '#ccc',
      'orange': 'rgb(255,140,0)',
      'code-bg': '#282A36',
      'primary': 'rgb(241,241,241)',
      'code-color': 'rgb(244,191,117)',
    },
    fontFamily: {
      sans: ['Comfortaa', 'sans-serif'],
      mono: ['Consolas', 'Monaco', '"Andale Mono"', '"Ubuntu Mono"', 'monospace'],
    },
  },
  shortcuts: {
    'nav-tagline': 'text-[0.75rem] uppercase tracking-[0.08em] text-site-text/60 no-underline hover:text-orange',
    'max-content': 'max-w-[min(800px,calc(100vw-3rem))] mx-auto',
  },
})
