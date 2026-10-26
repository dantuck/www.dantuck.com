---
layout: '../../layouts/BlogPost.astro'
publishDate: 05 Nov 2026 14:00 UTC
title: "Astro Scheduled Posts: Hide Future Pages From the Build"
author: dantuck
description: |
    A future publishDate only hides an Astro post from listings. The page is still built, in the sitemap and reachable by URL. Here is how to remove it until its date.
tags:
- developer-tools
- workflow
---

I told myself that a future `publishDate` kept an article hidden until its day. That was wrong. It hid the article from the lists. The page itself was still there.

This article shows the gap, then closes it with a small Astro integration.

## What a future date actually does

Astro builds a page for every file under `src/pages`. It does not look at your frontmatter first. My index pages filter out drafts and future dates, so the posts never appeared in the article list or the tag pages.

Everything else still worked. I built the site with a future-dated post and looked in `dist`. The page was there. So was its entry in the sitemap, and so was its entry in the search index. Anyone with the URL could read it. Anyone who guessed a slug could find it.

That is fine for a draft you do not mind sharing. It is wrong for a scheduled post you want to appear on its day.

## Remove the page after the build

The fix is a build hook. Astro runs `astro:build:done` after it writes the site to disk. At that point I can find every unpublished page and delete its HTML.

The integration lives in `src/integrations/hide-unpublished.ts`. It has three jobs.

First, decide what counts as unpublished:

```ts
export function isUnpublished(fm: Pick<Frontmatter, 'draft' | 'publishDate'>, now = new Date()): boolean {
  if (fm.draft) return true;
  if (!fm.publishDate) return false;
  const date = new Date(fm.publishDate);
  return !Number.isNaN(date.getTime()) && date > now;
}
```

A draft is always hidden. A future date is hidden. A missing or unparseable date stays visible, because a wrong guess that hides a live page is worse than one that shows a draft.

Second, turn each content file into the pathname it builds to. `article/a/index.md` becomes `/article/a/`. That mapping is the only place the file layout matters.

Third, delete the built files:

```ts
'astro:build:done': ({ dir, logger }) => {
  const out = fileURLToPath(dir);
  const hidden = findUnpublished();
  for (const pathname of hidden) {
    rmSync(join(out, pathname, 'index.html'), { force: true });
    try {
      rmdirSync(join(out, pathname));
    } catch {
      // directory still holds other files — leave it
    }
  }
  logger.info(`removed ${hidden.length} draft/scheduled page(s) from the build`);
},
```

The `rmdirSync` only succeeds on an empty directory. If a post has images beside it, the folder stays and only the HTML goes.

I scoped the whole thing to `article/` and `recipe/`. Pages like the about page have no `publishDate`, and I do not want a rule written for posts to touch them.

---

## The sitemap and search

Removing the HTML does not remove the sitemap entry. The sitemap integration builds its list from the pages Astro generated, not from what is left on disk afterward. It has a `filter` option, so I pass it the same decision:

```js
const unpublished = findUnpublished();

sitemap({ filter: (page) => !page.includes('/admin/') && !isUnpublishedUrl(page, unpublished) }),
```

Search needs nothing extra, but the order matters. My build script runs `astro build && pagefind --site dist`. Pagefind indexes whatever is in `dist` when it starts. Because the hook has already deleted the pages by then, they never reach the index.

## Publishing on the day

A static site only changes when you rebuild it. A cron worker handles that. <a href="https://developers.cloudflare.com/workers/configuration/cron-triggers/" target="_blank" rel="noopener noreferrer">A Cloudflare Worker on a cron trigger</a> posts to the Pages deploy hook every hour. When the build runs after a post's date, the post is no longer unpublished. The hook leaves it alone and it appears.

So a post goes live within about an hour of its time.

One detail trips people up. A date with no time, like `27 Mar 2026`, parses as midnight in the build machine's timezone. If you care about the hour, say so: `28 Oct 2026 14:00 UTC`.

## Testing the rule

The decision function is small and pure, so the tests are cheap. These are the cases I wrote:

```ts
it('switches over at the exact time', () => {
  expect(isUnpublished({ publishDate: '26 Oct 2026 12:00 UTC' }, now)).toBe(false);
  expect(isUnpublished({ publishDate: '26 Oct 2026 12:01 UTC' }, now)).toBe(true);
});

it('keeps pages with no or unparseable date visible', () => {
  expect(isUnpublished({}, now)).toBe(false);
  expect(isUnpublished({ publishDate: 'not a date' }, now)).toBe(false);
});
```

Passing `now` in as an argument is what makes this testable. Without it, every test would depend on the real clock.

After the build I check the result directly. A scheduled page should be absent from `dist`, the sitemap and the search index. If any of the three still has it, something is wrong.

## What I still see in development

`pnpm dev` still shows drafts and scheduled posts, with a banner that says so. I want that. It is how I preview a post before its day. The hook only runs at the end of a production build, so development is unaffected.

The lesson was a small one. A filter on a list is not the same as hiding a page. If a page must not exist yet, remove the page.
