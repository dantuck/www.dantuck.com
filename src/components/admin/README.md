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
```

### 2. Run the dev server

```bash
pnpm admin:dev
```

Starts Astro dev (port 4321, HMR) behind Wrangler (port 8788, Functions). Visit `http://localhost:8788/admin`.

> **Note:** `pnpm dev` (Astro only) will 404 on all `/admin/api/*` routes — use `pnpm admin:dev` when working on the CMS.

### 3. Local mode (no credentials needed)

Set `LOCAL_MODE=true` in `.dev.vars`. All API endpoints return mock data — no GitHub or Cloudflare tokens required. The dashboard shows 3 sample articles and the editor loads sample content. Saves, publishes, and schedules are no-ops.

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

## Production Setup

### Cloudflare Access (authentication)

Cloudflare Zero Trust → Access → Applications → Add application:

- Type: Self-hosted
- Domain: `www.dantuck.com/admin*`
- Policy: Allow your email address

### Pages environment variables

Pages → www-dantuck → Settings → Environment variables → Production:

| Key | Value |
|---|---|
| `GITHUB_TOKEN` | GitHub PAT (contents + pull_requests write) |
| `GITHUB_REPO` | `dantuck/www.dantuck.com` |
| `CF_API_TOKEN` | Cloudflare API token (Pages read) |
| `CF_ACCOUNT_ID` | `8c84992709d375b2c9bba48b7e8a2361` |
| `CF_PAGES_PROJECT` | `www-dantuck` |

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
| Library | `src/lib/admin/` | Slug utility, frontmatter parser, GitHub client |
| Worker | `worker/src/index.ts` | Hourly scheduled publish (auto-merge PRs) |

---

## Draft Lifecycle

| Status | Condition |
|---|---|
| **Draft** | Open PR, no `publishDate` |
| **Scheduled** | Open PR with future `publishDate` |
| **Building** | PR merged, deploy in progress |
| **Live** | On `master`, no open PR |

---

## API Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /admin/api/articles` | List all articles with PR status |
| `GET /admin/api/articles?slug=…` | Read single article (frontmatter + body) |
| `POST /admin/api/save` | Commit to branch, create PR on first save |
| `POST /admin/api/publish` | Merge PR immediately |
| `POST /admin/api/schedule` | Set `publishDate`, re-label PR as `scheduled` |
| `GET /admin/api/status` | Latest Cloudflare Pages deploy state |
| `POST /admin/api/upload` | Commit image binary to draft branch |
