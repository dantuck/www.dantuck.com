---
layout: '../../layouts/BlogPost.astro'
publishDate: 26 Oct 2026
title: "Astro Lighthouse Audit: Script It, Then Fix What It Finds"
author: dantuck
description: |
    Script a repeatable Astro Lighthouse audit against your built site, then fix what it finds: inline CSS, font preloads, cache headers and accessibility gaps.
tags:
- developer-tools
- accessibility
- tools
---

A Lighthouse score you ran once in DevTools is a mood. A score you can reproduce from one command is a measurement. This article builds that command for an Astro site, then uses it to find and fix real problems.

The site is this one: Astro 6, static output, deployed to Cloudflare Pages.

## Audit the build, not the dev server

The dev server is the wrong target. It serves unbundled modules, injects tooling, and skips minification. Lighthouse would be grading your development setup.

Audit `./dist` instead. The script serves the production build from a small Node server, launches headless Chrome, and runs Lighthouse against a handful of pages:

```bash
pnpm build
pnpm lighthouse                       # mobile, default pages
pnpm lighthouse --desktop --min=90    # desktop, fail below 90
pnpm lighthouse --url=/about/         # specific pages
```

It audits the home page, the about page, the first article and the first recipe. It prints a score table, writes an HTML report per page to `.lighthouse/`, and exits with code `1` if any category falls below `--min`. That exit code is the useful part. It turns a score into a gate you can drop into CI.

The static server has one job beyond serving files. It mirrors Cloudflare Pages routing, so `/about/` resolves to `dist/about/index.html`. It also sends the same long-lived cache headers that production sends for `/_astro/` and `/fonts/`. A local server does not read a `_headers` file, so without this the cache audit would lie.

## A desktop score that looked wrong

My first run put mobile performance at 96 and desktop at 78 to 81. Desktop should not be slower than a throttled phone.

It was not. The script handled `--desktop` like this:

```js
const config = {
  extends: 'lighthouse:default',
  settings: { formFactor: 'desktop', screenEmulation: { disabled: true } },
};
```

That changes the form factor. It does not change the throttling. The report showed the desktop run still using a 150 ms round trip, 1.6 Mbps and a 4x CPU slowdown. That is the mobile profile in a desktop viewport.

Lighthouse ships a proper desktop preset. Use it:

```js
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

const config = desktop ? desktopConfig : undefined;
```

Desktop performance went to 100 on every page. The site never had a desktop problem. The script did.

If a number surprises you, read the report's config before you read its opportunities.

---

## The fixes, measured

I ran the audit on three commits: the one that added the script, the accessibility fixes, and the performance fixes. Same machine, same pages, same method. The ranges cover the four audited pages.

| State | Mobile perf | Mobile a11y | Desktop perf | Desktop a11y |
|---|---|---|---|---|
| Baseline | 92 to 93 | 88 to 91 | 100 | 92 to 95 |
| After accessibility fixes | 92 to 93 | 100 | 100 | 100 |
| After performance fixes | 95 to 97 | 100 | 100 | 100 |

The accessibility fixes moved accessibility to 100 and left performance alone. The performance fixes moved mobile performance by three to four points and left accessibility alone. Each batch did what it said.

## Performance: three small changes

All three landed in one commit, so I cannot tell you how many points each one earned. Together they took mobile performance from 92 or 93 to 95 to 97.

**Inline the CSS.** One option in `astro.config.mjs`:

```js
build: {
  inlineStylesheets: 'always',
},
```

The stylesheet no longer blocks rendering behind its own request. The cost is that the CSS ships inside every page instead of being cached once. For a site this small, the trade is easy.

**Preload the fonts.** Fonts are discovered late, after the CSS is parsed. A preload tells the browser up front. Importing the files with `?url` gives you the hashed production URL, so the preload does not break when the hash changes:

```astro
---
import comfortaaRegular from '../fonts/comfortaa-v28-greek_latin-ext_vietnamese_cyrillic-ext-regular.woff2?url';
import fraunces from '@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2?url';

const preloadFonts = [comfortaaRegular, fraunces];
---
{preloadFonts.map((href) => <link rel="preload" href={href} as="font" type="font/woff2" crossorigin />)}
```

The `crossorigin` attribute is required even for same-origin fonts. Without it the browser fetches the font twice.

**Cache static assets.** Cloudflare Pages reads a `_headers` file from `public/`:

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable
```

`immutable` with a one-year lifetime is only safe for files whose names change when their content changes. Astro hashes everything under `/_astro/`, so it qualifies. Check that before you copy the second rule.

## Accessibility: four fixes

**Contrast.** The muted text color was the same text color at 60% opacity. It failed. I raised it to 75% in light mode and 90% in dark mode. Code blocks had a separate problem. The Dracula theme draws comments in `#6272a4`, which is 3.0:1 against the code background. AA needs 4.5:1. Shiki writes colors as inline styles, so a normal rule cannot beat them:

```css
pre.astro-code span[style*="#6272A4" i] {
  color: #8e9fcf !important;
}
```

It is ugly. It is also contained, and the `!important` is doing real work.

**Landmarks.** Page content lived in an `<article>`. I changed it to `<main>`. Screen reader users jump between landmarks, and a page without a `main` is a page without a front door.

**The mobile drawer.** The closed navigation drawer was hidden with `aria-hidden`. That hides it from assistive technology but not from the keyboard, so Tab could still land on invisible links. The `inert` attribute removes the whole subtree from both the tab order and the accessibility tree:

```svelte
<div
  aria-modal="true"
  aria-label="Navigation menu"
  aria-hidden={!isOpen}
  inert={!isOpen}
>
```

**Heading order.** Several older articles opened with `###` or `####` directly under the page title, skipping the levels in between. I fixed each one by pulling the headings up a level. It was the least interesting change and it touched the most files.

---

None of this took long. The script took the longest, and it is the part that keeps the rest honest. Run `pnpm lighthouse --min=90` before you ship, and the next regression shows up as a failing exit code instead of a feeling.
