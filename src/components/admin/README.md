# CMS — Setup & Reference

Notion-style headless CMS at `/admin`. Drafts live on GitHub branches with Cloudflare Pages preview URLs. Publishing merges the PR.

---

## Local Development

### 1. Fill in `.dev.vars`

Create `.dev.vars` in the project root (gitignored):

```
GITHUB_TOKEN=ghp_yourtoken
GITHUB_REPO=dantuck/www.dantuck.com
CF_API_TOKEN=your_cf_token
CF_ACCOUNT_ID=8c84992709d375b2c9bba48b7e8a2361
CF_PAGES_PROJECT=www-dantuck

# Set to "true" to run without real credentials
LOCAL_MODE=false

# Optional: see Authentication section
ADMIN_SECRET=
```

### 2. Run the dev server

```bash
pnpm admin:dev
```

Starts Astro dev (port 4321, HMR) behind Wrangler (port 8788, Functions). Visit `http://localhost:8788/admin`.

> **Note:** `pnpm dev` (Astro only) will 404 on all `/admin/api/*` routes — use `pnpm admin:dev` when working on the CMS.

### 3. Filesystem local mode (no credentials needed)

Run Astro dev directly — no wrangler, no tokens:

```bash
pnpm admin:dev:local
```

Visit `http://localhost:8788/admin`. The CMS reads and writes real files in `src/pages/article/`. Changes appear on disk immediately and Astro HMR picks them up. No GitHub or Cloudflare credentials required.

This uses a Vite dev middleware (`src/integrations/admin-local-api.ts`) that intercepts `/admin/api/*` routes before Astro's SSG renderer, so no mock data is involved — everything is real.

### 4. Wrangler local mode (mock data)

Set `LOCAL_MODE=true` in `.dev.vars` and run `pnpm admin:dev`. All API endpoints return mock data — useful for testing the UI without touching real files.

---

## GitHub Token

GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens:

- Repository access: `dantuck/www.dantuck.com`
- Permissions: **Contents** read/write, **Pull requests** read/write, **Metadata** read

---

## Cloudflare API Token

Only needed for the deploy status indicator (the pulsing "Building..." button after publish).

Cloudflare → My Profile → API Tokens → Create Token → "Read all resources" template.

---

## Authentication

The CMS supports two layers of authentication that can be used independently or together.

### Cloudflare Access (recommended for production)

Cloudflare Zero Trust → Access → Applications → Add application:

- Type: Self-hosted
- Domain: `www.dantuck.com/admin*`
- Policy: Allow your email address

This blocks all unauthenticated requests at the network edge before they reach any Function.

### ADMIN_SECRET (code-level bearer token)

An optional per-request token enforced by `functions/admin/api/_middleware.ts`. When `ADMIN_SECRET` is set, every `/admin/api/*` request must include:

```
Authorization: Bearer <your-secret>
```

The admin UI stores the token in `sessionStorage` after you enter it once per browser session. If a request returns 401, the UI shows a token prompt automatically.

**To enable:**

1. Generate a random token:
   ```bash
   openssl rand -hex 32
   ```
2. Set it as a Cloudflare Pages environment variable (`ADMIN_SECRET=<token>`).
3. On first visit to `/admin`, the UI will prompt for the token.

**If `ADMIN_SECRET` is not set**, the middleware is a no-op — auth is delegated entirely to Cloudflare Access (or skipped in local dev).

Using both layers together is the most secure setup: Cloudflare Access blocks the browser, and `ADMIN_SECRET` blocks direct API calls that bypass the browser.

---

## Production Setup

### Pages environment variables

Pages → www-dantuck → Settings → Environment variables → Production:

| Key | Value | Required |
|---|---|---|
| `GITHUB_TOKEN` | GitHub PAT (contents + pull_requests write) | Yes |
| `GITHUB_REPO` | `dantuck/www.dantuck.com` | Yes |
| `CF_API_TOKEN` | Cloudflare API token (Pages read) | Yes |
| `CF_ACCOUNT_ID` | `8c84992709d375b2c9bba48b7e8a2361` | Yes |
| `CF_PAGES_PROJECT` | `www-dantuck` | Yes |
| `ADMIN_SECRET` | Random token (`openssl rand -hex 32`) | Optional |

### Worker secrets (scheduled publishing)

```bash
cd worker
wrangler secret put GITHUB_TOKEN
wrangler secret put GITHUB_REPO
pnpm run deploy
```

---

## Architecture

| Layer | Location | Purpose |
|---|---|---|
| Pages | `src/pages/admin/` | Static HTML shells, Svelte islands |
| Components | `src/components/admin/` | Dashboard, Editor, PublishButton, ArticleCard |
| Functions | `functions/admin/api/` | Edge API — GitHub + Cloudflare calls |
| Middleware | `functions/admin/api/_middleware.ts` | Optional bearer token auth |
| Library | `src/lib/admin/` | Slug utility, frontmatter parser, GitHub client, auth helper |
| Vite plugin | `src/integrations/admin-local-api.ts` | Local filesystem API (replaces Functions in `admin:dev:local`) |
| Worker | `worker/src/index.ts` | Hourly scheduled publish (auto-merge PRs) |

---

## Draft Lifecycle

| Status | Condition |
|---|---|
| **Draft** | `draft: true` in frontmatter, or no `publishDate` |
| **Scheduled** | Open PR with future `publishDate` |
| **Building** | PR merged, deploy in progress |
| **Live** | On `master`, past `publishDate`, `draft` not set |

---

## API Endpoints

All endpoints require `Authorization: Bearer <ADMIN_SECRET>` if `ADMIN_SECRET` is configured. All `POST` bodies are JSON (`Content-Type: application/json`). All paths must start with `src/pages/` — requests with `..` in the path are rejected with 400.

### `GET /admin/api/articles`

Returns all articles sorted newest first.

**Response:** `ArticleSummary[]`
```json
[
  {
    "slug": "article/my-post",
    "path": "src/pages/article/my-post/index.md",
    "title": "My Post",
    "publishDate": "27 Mar 2026 14:00 UTC",
    "description": "...",
    "tags": ["astro"],
    "status": "live" | "draft" | "scheduled",
    "prNumber": 42,
    "branch": "draft/my-post",
    "previewUrl": "https://draft-my-post.www-dantuck.pages.dev"
  }
]
```

### `GET /admin/api/articles?slug=article/my-post`

Returns full article content for editing.

**Response:** `ArticleDetail`
```json
{
  "slug": "article/my-post",
  "path": "src/pages/article/my-post/index.md",
  "fileSha": "abc123",
  "branch": "draft/my-post",
  "prNumber": 42,
  "frontmatter": { "title": "...", "publishDate": "...", ... },
  "imports": "import { Image } from 'astro:assets';\n...",
  "body": "Markdown body...",
  "extra": []
}
```

### `POST /admin/api/save`

Commits the article to its draft branch. Creates the branch and a draft PR on first save.

**Body:**
```json
{
  "slug": "article/my-post",
  "path": "src/pages/article/my-post/index.md",
  "fileSha": "abc123",
  "frontmatter": { "title": "...", ... },
  "imports": "",
  "body": "Markdown body...",
  "extra": []
}
```

**Response:**
```json
{
  "ok": true,
  "fileSha": "def456",
  "prNumber": 42,
  "branch": "draft/my-post",
  "previewUrl": "https://draft-my-post.www-dantuck.pages.dev"
}
```
`prNumber`, `branch`, and `previewUrl` are only present on the first save (when the PR is created).

### `POST /admin/api/publish`

Merges the draft PR to `master`, triggering a production deploy.

**Body:**
```json
{ "prNumber": 42, "title": "My Post" }
```

**Response:** `{ "ok": true }`

### `POST /admin/api/schedule`

Sets a future `publishDate` on the draft branch and re-labels the PR as `scheduled`. The hourly worker auto-merges once the date passes.

**Body:**
```json
{
  "prNumber": 42,
  "slug": "article/my-post",
  "path": "src/pages/article/my-post/index.md",
  "branch": "draft/my-post",
  "publishDate": "27 Apr 2026 14:00 UTC"
}
```

**Response:** `{ "ok": true }`

### `GET /admin/api/status`

Returns the latest Cloudflare Pages deploy state. Polled by the UI after publishing.

**Response:** `{ "status": "live" | "building" | "failed" }`

### `POST /admin/api/upload`

Commits an image binary to the draft branch alongside the article file.

**Body:**
```json
{
  "slug": "article/my-post",
  "branch": "draft/my-post",
  "filename": "hero.webp",
  "base64": "<raw base64, no data: prefix>",
  "existingSha": "abc123"
}
```

**Response:**
```json
{ "ok": true, "path": "./hero.webp", "fullPath": "src/pages/article/my-post/hero.webp" }
```
`existingSha` is only needed when replacing an existing image.

### `POST /admin/api/unpublish`

Sets `draft: true` in the article's frontmatter on `master` and optionally adds a redirect rule to `public/_redirects`.

**Body:**
```json
{
  "slug": "article/my-post",
  "path": "src/pages/article/my-post/index.md",
  "fileSha": "abc123",
  "redirectTo": "/"
}
```

`redirectTo` is optional. If provided, a `301` redirect from `/<slug>` to the given path is appended to `public/_redirects` and takes effect on the next deploy.

**Response:** `{ "ok": true }`

### `POST /admin/api/delete`

Permanently deletes an article. For drafts: closes the PR and deletes the branch. For live articles: commits the file deletion to `master`.

**Body:**
```json
{
  "slug": "article/my-post",
  "path": "src/pages/article/my-post/index.md",
  "fileSha": "abc123",
  "branch": "master",
  "prNumber": 42
}
```

`prNumber` is only needed for draft articles. `branch` is `"master"` for live articles or the draft branch name (e.g. `"draft/my-post"`) for drafts.

**Response:** `{ "ok": true }`
