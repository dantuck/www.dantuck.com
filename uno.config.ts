import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [presetUno()],
  theme: {
    colors: {
      'site-bg': 'var(--color-bg)',
      'site-bg-raised': 'var(--color-bg-raised)',
      'site-text': 'var(--color-text)',
      'site-text-muted': 'var(--color-text-muted)',
      'site-border': 'var(--color-border)',
      'orange': 'var(--color-accent)',
      'code-bg': 'var(--color-code-bg)',
      'primary': 'var(--color-heading)',
      'code-color': 'var(--color-code-text)',
    },
    fontFamily: {
      sans: ['Comfortaa', 'sans-serif'],
      serif: ['"Fraunces Variable"', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      mono: ['Consolas', 'Monaco', '"Andale Mono"', '"Ubuntu Mono"', 'monospace'],
    },
  },
  shortcuts: {
    'nav-tagline': 'text-[0.75rem] uppercase tracking-[0.08em] text-site-text/60 no-underline hover:text-orange',
    'max-content': 'max-w-[min(800px,calc(100vw-3rem))] mx-auto',
    'article-content': 'max-w-[min(1120px,calc(100vw-3rem))] mx-auto',
    'kicker': 'flex items-center gap-3 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-orange before:content-[""] before:block before:w-6 before:h-px before:bg-orange',
    'hairline': 'border-t border-site-border',
    'card-bordered': 'border border-site-border rounded-md bg-site-bg-raised transition-colors duration-150 hover:border-orange/50',
    'pill': 'inline-flex items-center border border-site-border rounded text-[0.72rem] uppercase tracking-[0.04em] px-2 py-0.5 text-site-text-muted',
  },
})
