# CLAUDE.md

## Commands

```bash
pnpm dev              # Dev server (search disabled — shows "production only")
pnpm dev:search       # Build + index + dev — enables search; re-run after content changes
pnpm build            # Production build → ./dist
pnpm preview          # Preview production build locally
pnpm publish-preview  # Build + deploy to Cloudflare Pages preview branch
pnpm publish-release  # Build + deploy to Cloudflare Pages production
```

```bash
cd worker
pnpm run deploy       # Deploy scheduled publish worker to Cloudflare
pnpm run tail         # Stream live worker logs
```

## Architecture

**Stack**: Astro 6 (SSG) + Svelte 5 + SCSS + Cloudflare Pages.

### Content Types

`src/pages/` uses Astro file-based routing. Three content types:

1. **Articles** — `src/pages/article/**/*.{md,mdx}`
   - Frontmatter: `title`, `publishDate`, `description`, `tags[]`, `author`; optional `draft: true`
   - `publishDate` accepts date (`27 Mar 2026`) or datetime (`27 Mar 2026 14:00 UTC`)
   - Future-dated and draft posts are excluded from all listings and OG image generation
   - Use `.mdx` when the article needs co-located images (see Images below)
   - Co-located images must **not** start with `_` — `.gitignore` excludes `src/pages/**/_*`

2. **Recipes** — `src/pages/recipe/**/*.md`
   - Same frontmatter as articles plus `prepTime`, `cookTime`, `ingredients[]`

3. **Resume** — `src/data/resume.json` → rendered by `src/pages/resume.astro`

### Scheduled Publishing

`worker/` is a Cloudflare Worker (`dantuck-scheduled-publish`) that POSTs to the Cloudflare Pages deploy hook **every hour**, triggering a rebuild. Future-dated articles go live automatically within ~1 hour of their `publishDate`. The `DEPLOY_HOOK_URL` is a Cloudflare secret — not in the repo.

### Images

Use `.mdx` + Astro's `<Image>` for responsive, optimized images:

```mdx
import { Image } from 'astro:assets';
import hero from './hero.webp';

<Image src={hero} alt="..." widths={[400, 800, 1300]} sizes="(max-width: 600px) 400px, (max-width: 1000px) 800px, 1300px" />
```

Images must be under `src/` (not `public/`) and not prefixed with `_`.

### Styling

SCSS + **Shevy** vertical rhythm (`src/styles/shevy/`). Entry: `src/styles/main.scss`.
- `_defs.scss` — CSS variables, breakpoints, `--main-width`
- `_grid.scss` — page layout (nav, main, footer)
- Syntax highlighting: Shiki Dracula theme (`astro.config.mjs`)

### Tags

Derived dynamically from frontmatter via `import.meta.glob()`. `src/pages/tags/[tag].astro` generates one page per tag.

### Data Loading

Index pages use `import.meta.glob()` with `{ eager: true }`, filter drafts + future dates, sort by `publishDate` descending.

### Svelte

Only `src/components/Footer.svelte` — reading progress indicator via `ResizeObserver`.

## Git Notes

Files with `[...]` in their names (e.g. `src/pages/tags/[tag].astro`, `src/pages/og/[...slug].png.ts`) cannot be staged with `git add <path>` — git expands the brackets as globs. Use:

```bash
git add -u src/pages/tags/
git add -u src/pages/og/
```
