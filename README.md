# www.dantuck.com

Personal site for [dantuck.com](https://www.dantuck.com) — articles, recipes, and a resume. Built with Astro.

## Stack

- **[Astro](https://astro.build) 6.x** — static site generator
- **SCSS / Sass 1.98** — styling with Shevy vertical rhythm
- **Svelte** — footer component
- **pnpm** — package manager
- **Node 22**

## Project Structure

```
src/
├── components/
│   ├── Recipe/          # Recipe-specific components
│   ├── BlogPostPreview  # Article list card
│   ├── RecipePreview    # Recipe list card
│   ├── Header           # Fixed nav (centered two-row)
│   ├── Footer           # Svelte footer with reading progress
│   └── Tags             # Tag links
├── data/
│   └── resume.json      # Resume data (experience, skills, education)
├── layouts/
│   ├── BlogPost.astro
│   ├── Recipe.astro
│   ├── Resume.astro
│   └── About.astro
├── pages/
│   ├── article/         # Markdown articles
│   ├── recipe/          # Markdown recipes
│   ├── tags/            # Tag index and tag pages
│   ├── resume.astro     # Resume page
│   └── about.md
└── styles/
    ├── _defs.scss        # Variables, breakpoints, --main-width
    ├── _grid.scss        # Layout, nav, main, footer
    ├── _override.scss    # Post/recipe preview cards
    ├── _resume.scss      # Resume page styles
    └── main.scss         # Entry point
```

## Commands

All commands run from the project root:

| Command                | Action                                                       |
| :--------------------- | :----------------------------------------------------------- |
| `pnpm install`         | Install dependencies                                         |
| `pnpm dev`             | Start dev server at `localhost:4321`                         |
| `pnpm dev:search`      | Build + index + dev server (enables search during dev)       |
| `pnpm build`           | Build to `./dist/`                                           |
| `pnpm preview`         | Preview production build locally                             |
| `pnpm publish-preview` | Build + deploy to Cloudflare Pages preview branch            |
| `pnpm publish-release` | Build + deploy to Cloudflare Pages production                |
| `pnpm screenshots`     | Capture portfolio screenshots via Playwright                 |
| `pnpm worker:deploy`   | Deploy the scheduled-publish Cloudflare Worker               |
| `pnpm worker:tail`     | Stream live logs from the scheduled-publish Worker           |

## Content

**Articles** — add a `.md` file under `src/pages/article/`. Frontmatter fields: `title`, `publishDate`, `description`, `tags[]`, `author`.

**Recipes** — add a `.md` file under `src/pages/recipe/`. Frontmatter fields: `title`, `publishDate`, `description`, `tags[]`, `prepTime`, `cookTime`, `ingredients[]`.

**Resume** — edit `src/data/resume.json`. The resume page is generated from this file. Contact info uses CSS obfuscation — keep the `email` field as-is, do not add a `phone` field.

## Drafts and Scheduled Publishing

Content can be kept unpublished in two ways:

**Draft** — add `draft: true` to frontmatter. The post is excluded from all listings in production but remains accessible by direct URL.

**Scheduled** — set a future `publishDate` (and omit `draft: true`). The post is hidden in production until the date arrives.

In dev mode (`pnpm dev`) all drafts and scheduled posts are visible in listings. A fixed banner at the top of the page indicates status:

- **DRAFT** — `draft: true` is set
- **SCHEDULED · publishes YYYY-MM-DD** — `publishDate` is in the future

A Cloudflare Worker (`worker/`) triggers a Pages rebuild daily at 06:00 UTC so scheduled posts go live automatically on their publish date.

## Tags

Tags work across both articles and recipes. Any `tags` value in a page's frontmatter automatically generates a `/tags/<tag>` page listing all content with that tag.

## Cloudflare Worker

The `worker/` directory contains a small Cloudflare Worker that POSTs to a Pages deploy hook on a daily cron schedule.

**Deploy:** `pnpm worker:deploy` (or push changes to `worker/` — GitHub Actions handles it automatically).

**Logs:** `pnpm worker:tail`

**Change schedule:** Edit `crons` in `worker/wrangler.toml`, then redeploy.

The deploy hook URL is stored as a secret (`DEPLOY_HOOK_URL`) and never committed. To set or rotate it:

```bash
npx wrangler secret put DEPLOY_HOOK_URL --cwd worker
```

GitHub Actions requires a `CLOUDFLARE_API_TOKEN` secret in the repo settings (use the **Edit Cloudflare Workers** token template).
