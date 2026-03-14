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

| Command          | Action                                |
| :--------------- | :------------------------------------ |
| `pnpm install`   | Install dependencies                  |
| `pnpm dev`       | Start dev server at `localhost:4321`  |
| `pnpm build`     | Build to `./dist/`                    |
| `pnpm preview`   | Preview production build locally      |

## Content

**Articles** — add a `.md` file under `src/pages/article/`. Frontmatter fields: `title`, `publishDate`, `description`, `tags[]`, `author`.

**Recipes** — add a `.md` file under `src/pages/recipe/`. Frontmatter fields: `title`, `publishDate`, `description`, `tags[]`, `prepTime`, `cookTime`, `ingredients[]`.

**Resume** — edit `src/data/resume.json`. The resume page is generated from this file. Contact info uses CSS obfuscation — keep the `email` field as-is, do not add a `phone` field.

## Tags

Tags work across both articles and recipes. Any `tags` value in a page's frontmatter automatically generates a `/tags/<tag>` page listing all content with that tag.
