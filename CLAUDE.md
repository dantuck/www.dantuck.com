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

### Scheduled Publish Worker (`worker/`)

A Cloudflare Worker triggers an automatic production deploy every day at **06:00 UTC** by POSTing to the Cloudflare Pages deploy hook. This is how future-dated articles go live without manual intervention.

```bash
cd worker
pnpm run deploy    # Deploy the worker to Cloudflare
pnpm run tail      # Stream live logs from the worker
```

The deploy hook URL is stored as a `DEPLOY_HOOK_URL` secret in the worker's Cloudflare environment — it is not in the repo. To update it, set the secret via the Cloudflare dashboard or `wrangler secret put DEPLOY_HOOK_URL`.

## Architecture

**Stack**: Astro 6 (SSG) + Svelte 5 (interactive components) + SCSS/Sass + Cloudflare Pages deployment.

### Content Types

Content lives in `src/pages/` using Astro's file-based routing. There are three content types:

1. **Articles** — `src/pages/article/**/*.{md,mdx}`
   - Required frontmatter: `title`, `publishDate`, `description`, `tags[]`, `author`
   - Optional: `draft: true` (excluded from listings)
   - Layout: `src/layouts/BlogPost.astro`
   - Future `publishDate` values are excluded from listings and go live automatically via the scheduled worker
   - Use `.mdx` instead of `.md` when the article needs the Astro `<Image>` component for optimized images
   - Co-located images (in the same directory as the article) must **not** start with `_` — the `.gitignore` pattern `src/pages/**/_*` excludes underscore-prefixed files

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

### Images

For articles with images, prefer `.mdx` and use Astro's built-in `<Image>` component from `astro:assets`:

```mdx
import { Image } from 'astro:assets';
import hero from './hero.webp';

<Image src={hero} alt="..." widths={[400, 800, 1300]} sizes="(max-width: 600px) 400px, (max-width: 1000px) 800px, 1300px" />
```

This generates responsive srcsets, prevents layout shift, and lazy loads by default. Images must live under `src/` (not `public/`) and must not be prefixed with `_`.

### Svelte Usage

Only `src/components/Footer.svelte` uses Svelte — it provides the reading progress indicator using `ResizeObserver`.
