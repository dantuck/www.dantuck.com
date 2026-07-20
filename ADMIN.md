# Astro CMS

A self-contained headless CMS add-on for Astro + Cloudflare Pages projects. Drop it into any existing project in about 15 minutes.

**What it does:** Notion-style editor at `/admin`. Drafts live on GitHub branches with Cloudflare Pages preview URLs. Publish merges the PR. Future-dated articles auto-publish via a Cloudflare Worker.

---

## Table of Contents

- [Package Contents](#package-contents)
- [Quick Install](#quick-install)
- [Manual Install](#manual-install)
- [Local Development](#local-development)
- [Production Setup](#production-setup)
- [Authentication](#authentication)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Draft Lifecycle](#draft-lifecycle)
- [API Reference](#api-reference)

---

## Package Contents

All CMS code lives in isolated directories — nothing modifies existing site files except the three config changes in [Manual Install](#manual-install).

```
functions/admin/api/          Edge API (Cloudflare Pages Functions) — platform constraint, must stay here
src/admin/                    All other CMS code lives here
  components/                 Svelte UI: Dashboard, Editor, PublishButton, ArticleCard
  lib/                        Types, frontmatter parser, GitHub client, slug util
  pages/                      Astro page templates (served via injectRoute, not file-based routing)
  admin.css                   Admin-only styles (dark theme)
  integration.ts              Astro integration: registers routes + Vite dev middleware
worker/                       Optional: Cloudflare Worker for scheduled auto-publish
vitest.config.ts              Test runner config
```

**Config changes required in the host project:**
1. `astro.config.mjs` — register the Astro integration
2. `package.json` — add 4 scripts + 10 dependencies
3. `.dev.vars` — credentials for local dev (gitignored)

---

## Quick Install

Run this from the root of your Astro project. It copies all CMS files and prints the manual steps.

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/dantuck/www.dantuck.com/feature/cms/scripts/install-admin.sh)
```

Or clone and run locally:

```bash
git clone -b feature/cms https://github.com/dantuck/www.dantuck.com /tmp/astro-cms
bash /tmp/astro-cms/scripts/install-admin.sh
```

The script copies files, installs dependencies, and prints the 3 manual config steps. Then follow [Local Development](#local-development) to verify.

---

## Manual Install

If you prefer to do it step-by-step.

### 1. Copy files

From the root of this repo, run:

```bash
TARGET=/path/to/your/project

cp -r functions/admin "$TARGET/functions/"
cp -r src/admin "$TARGET/src/"
cp vitest.config.ts "$TARGET/"          # skip if you already have one
cp -r worker "$TARGET/"                 # optional: scheduled auto-publish
touch "$TARGET/public/_redirects"
```

### 2. Install dependencies

```bash
# Runtime (Milkdown rich-text editor)
pnpm add @milkdown/core @milkdown/crepe @milkdown/preset-commonmark \
         @milkdown/plugin-block @milkdown/plugin-history \
         @milkdown/plugin-listener @milkdown/plugin-slash

# Dev
pnpm add -D concurrently vitest @cloudflare/workers-types
```

### 3. Register the Astro integration in `astro.config.mjs`

```js
import adminCms from './src/admin/integration.ts';

export default defineConfig({
  // ...
  integrations: [
    // ...existing integrations
    adminCms(),
  ],
});
```

### 4. Add scripts to `package.json`

```json
{
  "scripts": {
    "admin:dev":       "concurrently \"astro dev --port 4321\" \"wrangler pages dev --proxy 4321 --port 8788\"",
    "admin:dev:local": "astro dev --port 8788",
    "test":            "vitest run",
    "test:watch":      "vitest"
  }
}
```

### 5. Update `wrangler.toml`

Change the `name` field to match your project:

```toml
name = "your-project-name"
compatibility_date = "2025-01-01"
pages_build_output_dir = "dist"
```

### 6. Set site name (optional)

The CMS reads `PUBLIC_SITE_NAME` for the browser tab title and top-bar brand. Add it to your `.env` or `.dev.vars`:

```
PUBLIC_SITE_NAME=your-site.com
```

---

## Local Development

### No-credentials mode (recommended for first run)

```bash
pnpm admin:dev:local
```

Starts Astro on port 8788. Reads and writes real article files in `src/pages/article/`. No GitHub or Cloudflare tokens needed. Astro HMR picks up changes as you save.

Visit `http://localhost:8788/admin`.

### Full Cloudflare Functions mode

Create `.dev.vars` in the project root (gitignored):

```
GITHUB_TOKEN=ghp_yourtoken
GITHUB_REPO=owner/repo-name
CF_API_TOKEN=your_cf_api_token
CF_ACCOUNT_ID=your_cloudflare_account_id
CF_PAGES_PROJECT=your-pages-project-name
PUBLIC_SITE_NAME=your-site.com

# Set to "true" to use mock data instead of real credentials
LOCAL_MODE=false
```

```bash
pnpm admin:dev
# visit http://localhost:8788/admin
```

> `pnpm dev` (Astro only) will 404 on `/admin/api/*` — always use `pnpm admin:dev` or `pnpm admin:dev:local` for CMS work.

### Mock data mode

Set `LOCAL_MODE=true` in `.dev.vars` and run `pnpm admin:dev`. All API endpoints return mock data — useful for UI work without any credentials.

---

## Production Setup

### GitHub Token

GitHub → Settings → Developer settings → Personal access tokens → Fine-grained:

- Repository access: your repo
- Permissions: **Contents** read/write, **Pull requests** read/write, **Metadata** read

### Cloudflare API Token

Only needed for the deploy status indicator (the "Building…" pulse after publish).

Cloudflare → My Profile → API Tokens → Create Token → "Read all resources" template.

### Pages Environment Variables

Non-secret values (`GITHUB_REPO`, `CF_ACCOUNT_ID`, `CF_PAGES_PROJECT`) live in `[vars]` in `wrangler.toml` and are committed — they're not sensitive. Only actual credentials go through Wrangler secrets or the dashboard:

```bash
npx wrangler pages secret put GITHUB_TOKEN --project-name=your-project
npx wrangler pages secret put CF_API_TOKEN --project-name=your-project
```

| Key | Value | Where |
|---|---|---|
| `GITHUB_TOKEN` | Fine-grained PAT | Secret (Wrangler or dashboard) |
| `CF_API_TOKEN` | Cloudflare API token | Secret (Wrangler or dashboard) |
| `GITHUB_REPO` | `owner/repo-name` | `wrangler.toml` `[vars]` |
| `CF_ACCOUNT_ID` | Your Cloudflare account ID | `wrangler.toml` `[vars]` |
| `CF_PAGES_PROJECT` | Your Pages project name | `wrangler.toml` `[vars]` |
| `PUBLIC_SITE_NAME` | Your site's display name (optional) | Dashboard env var, or `wrangler.toml` `[vars]` |

### Scheduled Publishing Worker (optional)

Auto-merges PRs whose `publishDate` has passed, once per hour. Required if you use the Schedule feature.

```bash
cd worker

# Update wrangler.toml name to something unique for your project
# e.g. name = "mysite-scheduled-publish"

wrangler secret put DEPLOY_HOOK_URL   # Pages → Settings → Deploy hooks → Create hook
wrangler secret put GITHUB_TOKEN
wrangler secret put GITHUB_REPO       # owner/repo-name
pnpm run deploy
```

---

## Authentication

Guarded by Cloudflare Access, which blocks unauthenticated requests at the network edge before any Function runs — the admin UI itself has no login of its own.

Cloudflare Zero Trust → Access → Applications → Add application:

- Type: Self-hosted
- Domain: `your-domain.com/admin*`
- Policy: Allow your email address

This covers both the `/admin*` pages and `/admin/api/*` under one policy.

---

## How It Works

1. `/admin` shows the article dashboard (all articles, filter by status).
2. Click an article or "New Article" to open the Milkdown editor.
3. **Save** commits to a `draft/<slug>` branch on GitHub and opens a draft PR with a Cloudflare Pages preview URL.
4. **Publish** merges the PR to `master`, triggering a production deploy.
5. **Schedule** sets a future `publishDate` in frontmatter and labels the PR `scheduled`. The hourly worker auto-merges it once the date passes.
6. **Unpublish** sets `draft: true` on `master` and optionally adds a redirect to `public/_redirects`.
7. **Delete** closes the PR + deletes the branch (drafts) or commits the file deletion to `master` (live).

---

## Architecture

| Layer | Location | Purpose |
|---|---|---|
| Pages | `src/admin/pages/` | Astro page templates (served via injectRoute) |
| Components | `src/admin/components/` | Dashboard, Editor, PublishButton, ArticleCard |
| Functions | `functions/admin/api/` | Edge API — GitHub + Cloudflare API calls |
| Library | `src/admin/lib/` | Types, frontmatter parser, GitHub client, slug util |
| Integration | `src/admin/integration.ts` | Astro integration: registers routes + Vite dev middleware |
| Worker | `worker/src/index.ts` | Hourly: trigger deploy + auto-merge scheduled PRs |

### Assumptions about the host project

The CMS assumes articles are at `src/pages/article/**/*.{md,mdx}` with this frontmatter shape:

```yaml
title: My Article
publishDate: 27 Mar 2026 14:00 UTC
description: A short summary.
tags: [astro, webdev]
author: Your Name
draft: true   # optional; omit when published
```

If your article path differs, update:
- `ARTICLES_DIR` in `src/admin/integration.ts`
- The glob patterns in `functions/admin/api/articles.ts`
- The slug ↔ path conversion in `src/admin/lib/slug.ts`

---

## Draft Lifecycle

| Status | Condition |
|---|---|
| **Draft** | `draft: true` in frontmatter, or no `publishDate` |
| **Scheduled** | Open PR labelled `scheduled` with future `publishDate` |
| **Building** | PR merged, Cloudflare Pages deploy in progress |
| **Live** | On `master`, past `publishDate`, `draft` not set |

---

## API Reference

All routes are gated by Cloudflare Access (see [Authentication](#authentication)). All POST bodies are JSON. Paths with `..` are rejected with 400.

### `GET /admin/api/articles`

List all articles sorted newest first.

**Response:** `ArticleSummary[]`
```json
[{
  "slug": "article/my-post",
  "path": "src/pages/article/my-post/index.md",
  "title": "My Post",
  "publishDate": "27 Mar 2026 14:00 UTC",
  "description": "...",
  "tags": ["astro"],
  "status": "live | draft | scheduled",
  "prNumber": 42,
  "branch": "draft/my-post",
  "previewUrl": "https://draft-my-post.project.pages.dev"
}]
```

### `GET /admin/api/articles?slug=article/my-post`

Get full article content for editing.

**Response:** `ArticleDetail`
```json
{
  "slug": "article/my-post",
  "path": "src/pages/article/my-post/index.md",
  "fileSha": "abc123",
  "branch": "draft/my-post",
  "prNumber": 42,
  "frontmatter": { "title": "...", "publishDate": "...", "tags": [] },
  "imports": "",
  "body": "Markdown body...",
  "extra": []
}
```

### `POST /admin/api/save`

Commit to draft branch. Creates branch + draft PR on first save.

**Body:** `{ slug, path, fileSha, frontmatter, imports, body, extra[] }`

**Response:** `{ ok: true, fileSha, prNumber?, branch?, previewUrl? }`

### `POST /admin/api/publish`

Merge draft PR to `master`.

**Body:** `{ prNumber, title }`  **Response:** `{ ok: true }`

### `POST /admin/api/schedule`

Set future `publishDate`, label PR `scheduled`.

**Body:** `{ prNumber, slug, path, branch, publishDate }`  **Response:** `{ ok: true }`

### `GET /admin/api/status`

Latest Pages deploy state.

**Response:** `{ status: "live | building | failed" }`

### `POST /admin/api/upload`

Commit image to draft branch.

**Body:** `{ slug, branch, filename, base64, existingSha? }`

**Response:** `{ ok: true, path: "./hero.webp", fullPath: "src/pages/article/my-post/hero.webp" }`

### `POST /admin/api/unpublish`

Set `draft: true` on `master`, optionally add redirect.

**Body:** `{ slug, path, fileSha, redirectTo? }`  **Response:** `{ ok: true }`

### `POST /admin/api/delete`

Delete article. Drafts: close PR + delete branch. Live: commit deletion to `master`.

**Body:** `{ slug, path, fileSha, branch, prNumber? }`  **Response:** `{ ok: true }`
