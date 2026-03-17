# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install       # Install dependencies
pnpm dev           # Start dev server (search shows "production only" message)
pnpm dev:search    # Build + index + dev server — enables search during development
                   # Re-run after content changes to keep the search index current
pnpm build         # Build for production (outputs to ./dist)
pnpm preview       # Preview production build locally
pnpm publish-preview   # Build + deploy to Cloudflare Pages preview branch
pnpm publish-release   # Build + deploy to Cloudflare Pages production
```

## Architecture

**Stack**: Astro 6 (SSG) + Svelte 5 (interactive components) + SCSS/Sass + Cloudflare Pages deployment.

### Content Types

Content lives in `src/pages/` using Astro's file-based routing. There are three content types:

1. **Articles** — `src/pages/article/**/*.{md,mdx}`
   - Required frontmatter: `title`, `publishDate`, `description`, `tags[]`, `author`
   - Optional: `draft: true` (excluded from listings)
   - Layout: `src/layouts/BlogPost.astro`

2. **Recipes** — `src/pages/recipe/**/*.md`
   - Same frontmatter as articles plus: `prepTime`, `cookTime`, `ingredients[]`
   - Layout: `src/layouts/Recipe.astro`

3. **Resume** — `src/data/resume.json` (structured data rendered by `src/pages/resume.astro`)

### Tags

Tags are derived dynamically from article/recipe frontmatter via `import.meta.glob()`. The `src/pages/tags/[tag].astro` dynamic route generates one page per tag.

### Data Loading Pattern

Index pages use `import.meta.glob()` with `{ eager: true }` to collect all content, filter out drafts, and sort by `publishDate` descending.

### Styling

SCSS with a **Shevy** vertical rhythm system (`src/styles/shevy/`). Entry point is `src/styles/main.scss`. Key files:
- `_defs.scss` — CSS variables, breakpoints, `--main-width`
- `_grid.scss` — Page layout (nav, main, footer)
- Syntax highlighting uses Shiki (Dracula theme, configured in `astro.config.mjs`)

### Svelte Usage

Only `src/components/Footer.svelte` uses Svelte — it provides the reading progress indicator using `ResizeObserver`.
