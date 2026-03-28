#!/usr/bin/env bash
# install-admin.sh — Install the Astro CMS add-on into an existing project.
#
# Usage (from target project root):
#   bash <(curl -fsSL https://raw.githubusercontent.com/dantuck/www.dantuck.com/feature/cms/scripts/install-admin.sh)
#
# Or clone and run locally:
#   git clone -b feature/cms https://github.com/dantuck/www.dantuck.com /tmp/astro-cms
#   bash /tmp/astro-cms/scripts/install-admin.sh
#
# The script auto-detects whether it is running from inside the source repo
# or from a curl pipe, and adjusts accordingly.

set -euo pipefail

# ── colours ──────────────────────────────────────────────────────────────────
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

step()  { echo -e "\n${BOLD}${CYAN}▶ $*${RESET}"; }
ok()    { echo -e "  ${GREEN}✓${RESET} $*"; }
warn()  { echo -e "  ${YELLOW}!${RESET} $*"; }

# ── locate source ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || echo "")"
SOURCE_ROOT=""

# Are we inside the CMS repo?
if [[ -n "$SCRIPT_DIR" && -f "$SCRIPT_DIR/../ADMIN.md" && -d "$SCRIPT_DIR/../functions/admin" ]]; then
  SOURCE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
else
  # Clone the repo to a temp dir
  step "Cloning CMS source…"
  TMP_DIR="$(mktemp -d)"
  trap "rm -rf $TMP_DIR" EXIT
  git clone --depth=1 --branch feature/cms \
    https://github.com/dantuck/www.dantuck.com "$TMP_DIR" --quiet
  SOURCE_ROOT="$TMP_DIR"
  ok "Cloned to $TMP_DIR"
fi

# ── confirm target ────────────────────────────────────────────────────────────
TARGET="$(pwd)"

echo ""
echo -e "${BOLD}Astro CMS Installer${RESET}"
echo -e "Source : ${CYAN}$SOURCE_ROOT${RESET}"
echo -e "Target : ${CYAN}$TARGET${RESET}"
echo ""

if [[ ! -f "$TARGET/astro.config.mjs" && ! -f "$TARGET/astro.config.ts" ]]; then
  echo "ERROR: No astro.config.mjs found in $TARGET. Run this script from your Astro project root."
  exit 1
fi

read -r -p "Install CMS into this directory? [y/N] " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

# ── copy files ────────────────────────────────────────────────────────────────
step "Copying CMS files…"

mkdir -p "$TARGET/functions" "$TARGET/src/components" "$TARGET/src/lib" \
         "$TARGET/src/pages" "$TARGET/src/styles" "$TARGET/src/integrations" \
         "$TARGET/public"

cp -r "$SOURCE_ROOT/functions/admin"  "$TARGET/functions/"
ok "functions/admin/"

cp -r "$SOURCE_ROOT/src/components/admin"  "$TARGET/src/components/"
ok "src/components/admin/"

cp -r "$SOURCE_ROOT/src/lib/admin"  "$TARGET/src/lib/"
ok "src/lib/admin/"

cp -r "$SOURCE_ROOT/src/pages/admin"  "$TARGET/src/pages/"
ok "src/pages/admin/"

cp "$SOURCE_ROOT/src/styles/admin.css"  "$TARGET/src/styles/"
ok "src/styles/admin.css"

cp "$SOURCE_ROOT/src/integrations/admin-local-api.ts"  "$TARGET/src/integrations/"
ok "src/integrations/admin-local-api.ts"

if [[ ! -f "$TARGET/vitest.config.ts" ]]; then
  cp "$SOURCE_ROOT/vitest.config.ts" "$TARGET/"
  ok "vitest.config.ts"
else
  warn "vitest.config.ts already exists — skipped (merge manually if needed)"
fi

if [[ ! -f "$TARGET/public/_redirects" ]]; then
  touch "$TARGET/public/_redirects"
  ok "public/_redirects (created empty)"
fi

# ── optional worker ───────────────────────────────────────────────────────────
echo ""
read -r -p "Install scheduled-publish worker? (needed for auto-publish of future-dated articles) [y/N] " install_worker
if [[ "$install_worker" =~ ^[Yy]$ ]]; then
  cp -r "$SOURCE_ROOT/worker" "$TARGET/"
  ok "worker/"
  warn "Remember to update worker/wrangler.toml name before deploying"
fi

# ── install deps ──────────────────────────────────────────────────────────────
step "Installing dependencies…"

RUNTIME_DEPS=(
  "@milkdown/core"
  "@milkdown/crepe"
  "@milkdown/preset-commonmark"
  "@milkdown/plugin-block"
  "@milkdown/plugin-history"
  "@milkdown/plugin-listener"
  "@milkdown/plugin-slash"
)

DEV_DEPS=(
  "concurrently"
  "vitest"
  "@cloudflare/workers-types"
)

if command -v pnpm &>/dev/null; then
  pnpm add "${RUNTIME_DEPS[@]}"
  pnpm add -D "${DEV_DEPS[@]}"
elif command -v npm &>/dev/null; then
  npm install "${RUNTIME_DEPS[@]}"
  npm install -D "${DEV_DEPS[@]}"
else
  warn "No package manager found — install these manually:"
  echo "  Runtime: ${RUNTIME_DEPS[*]}"
  echo "  Dev:     ${DEV_DEPS[*]}"
fi

# ── print manual steps ────────────────────────────────────────────────────────
ASTRO_CONFIG="astro.config.mjs"
[[ -f "$TARGET/astro.config.ts" ]] && ASTRO_CONFIG="astro.config.ts"

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}  3 manual steps remaining${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

echo ""
echo -e "${BOLD}1. Register the Vite plugin in ${ASTRO_CONFIG}:${RESET}"
cat <<'EOF'
   import { adminLocalApiPlugin } from './src/integrations/admin-local-api.ts';

   export default defineConfig({
     vite: {
       plugins: [adminLocalApiPlugin, /* ...existing plugins */],
     },
   });
EOF

echo ""
echo -e "${BOLD}2. Add scripts to package.json:${RESET}"
cat <<'EOF'
   "admin:dev":       "concurrently \"astro dev --port 4321\" \"wrangler pages dev --proxy 4321 --port 8788\"",
   "admin:dev:local": "astro dev --port 8788",
   "test":            "vitest run",
   "test:watch":      "vitest"
EOF

echo ""
echo -e "${BOLD}3. Create .dev.vars in your project root (gitignored):${RESET}"
cat <<'EOF'
   GITHUB_TOKEN=ghp_yourtoken
   GITHUB_REPO=owner/repo-name
   CF_API_TOKEN=your_cf_api_token
   CF_ACCOUNT_ID=your_cloudflare_account_id
   CF_PAGES_PROJECT=your-pages-project-name
   PUBLIC_SITE_NAME=your-site.com
   ADMIN_SECRET=
   LOCAL_MODE=false
EOF

echo ""
echo -e "${BOLD}Then test locally (no credentials needed):${RESET}"
echo "  pnpm admin:dev:local"
echo "  open http://localhost:8788/admin"
echo ""
echo -e "${BOLD}Full setup:${RESET} see ADMIN.md"
echo ""
echo -e "${GREEN}${BOLD}Done.${RESET}"
