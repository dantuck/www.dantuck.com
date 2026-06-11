---
name: write-article
description: Write a new blog article for this site
argument-hint: <topic>
allowed-tools: Read, Write, Glob, Agent
---

You are helping write a new article for dantuck.com, an Astro-based developer blog. The input is: $ARGUMENTS

**First, determine the mode:**

- **Content mode** — `$ARGUMENTS` contains substantial prose (a draft, pasted article, or written content to convert). Skip to Phase 4 directly. Do not dispatch the researcher or ask audience/goal questions.
- **Topic mode** — `$ARGUMENTS` is a short topic, title, or phrase. Follow all phases in order.

If unclear, treat it as topic mode.

---

Follow these phases in order. Do not skip phases or combine them.

---

## Phase 1 — Dispatch + questions (parallel, topic mode only)

Do both of these at the same time:

**A) Dispatch the article-researcher agent immediately** with only this message:
> Research topic: $ARGUMENTS
> Return related articles, cross-link opportunities, series detection, and gaps.

Do not wait for user answers before dispatching. The researcher runs concurrently.

**B) Ask the user these questions** (ask both at once, not one at a time):
1. "Who is the primary reader — someone new to this, or someone already familiar?"
2. "What is the one thing you want them to walk away knowing or able to do?"

If the topic is ambiguous (could apply to non-development contexts or has no clear domain), ask one clarifying question first: "Just to anchor the focus — is this about [likely domain A] or [likely domain B]?" Count this toward the 3-question maximum.

Wait until both the researcher returns AND the user has answered before proceeding to Phase 2.

---

## Phase 2 — Adaptive follow-up (conditional, topic mode only)

With researcher results and user answers in hand:

- If the researcher returned 2+ directly related articles on the same topic: ask — "This overlaps with [X] and [Y] — do you want to build on them, take a distinct angle, or position this as the definitive replacement?"
- Otherwise: proceed directly to Phase 3.

Maximum questions across Phase 1 and Phase 2: 3. Do not ask more.

---

## Phase 3 — Research report + approval

Present findings using this format:

```
## Research findings for: <topic>

**Related articles to link:**
- [Title](path) — link in <suggested section> when mentioning <specific point>

**Tangentially related:**
- [Title](path) — brief mention when discussing <angle>

**Series opportunity:** <if applicable>

**Gaps this article can own:** <angles not covered in existing articles>
```

If no related articles were found: "No existing articles closely related — this will be a standalone piece." Omit the empty sections.

Then say:
> "Does this look right? You can remove articles from the list, add ones I missed, change the positioning (standalone vs. series), or adjust the audience/goal before I write the draft."

Wait for user approval before proceeding.

---

## Phase 4 — Draft writing

### Step 1 — Read writing style

Read `.claude/skills/writing-style.md` from the project root. Apply its guidance throughout the article.

If the file is missing for some reason, fall back to reading the 3 most recently modified articles in `src/pages/article/**/*.{md,mdx}` and extracting style conventions from them.
  Then write `writing-style.md` to the memory directory with these observations. Apply the style when writing.

### Step 2 — Determine output path

| Article type | Output path |
|---|---|
| Standalone article | `src/pages/article/<slug>.md` |
| New series, first part | `src/pages/article/<series-name>/<seo-slug>.md` |
| Extending existing series | `src/pages/article/<existing-series-dir>/<seo-slug>.md` |
| Long standalone with assets | `src/pages/article/<slug>/index.md` |

### Step 3 — Determine layout path

The layout value in frontmatter is relative to the output file:

| Output file location | Layout value |
|---|---|
| `src/pages/article/slug.md` | `../../layouts/BlogPost.astro` |
| `src/pages/article/series/part.md` | `../../../layouts/BlogPost.astro` |
| `src/pages/article/slug/index.md` | `../../../layouts/BlogPost.astro` |

Rule: count directories between the file and `src/pages/`. Each level adds one `../`. `BlogPost.astro` is always at `src/layouts/`.

### Step 4 — Write the article

Use this frontmatter:

```yaml
---
layout: '<computed above>'
publishDate: <today as "DD Mon YYYY", e.g. "24 Mar 2026">
title: "<title>"
author: dantuck
description: |
    <one paragraph, 1-3 sentences>
tags:
- <tag>
---
```

**SEO rules for frontmatter:**

- **Title**: Put the primary keyword within the first 3–4 words. Keep under 60 characters so it displays fully in search results. Avoid leading with "Part N:" or other boilerplate that delays the keyword.
- **Description**: Target 150–160 characters. Include the primary keyword in the first sentence. Write it as a summary that makes someone click — not a teaser. Check length before writing it in.
- **Slug (filename)**: Include the primary keyword in the filename. Prefer `claude-code-skills.md` over `skills-playbook.md` if the article targets "Claude Code skills" as a search phrase.

**SEO rules for body:**

- The first paragraph should include the primary keyword and clearly state what the reader will learn or be able to do. Search engines weight the opening heavily.
- H2 headings should use natural variants of the keyword where it fits — do not stuff, but do not avoid them either.
- Weave cross-links from the research report inline where they add value.
- Do not add a "see also" or "related articles" section at the end — links belong in context.
- Follow the writing style from memory exactly.
- Match the tone, heading style, link patterns, and structural patterns observed.

Tags: use existing tags from the writing style taxonomy in `.claude/skills/writing-style.md`. Lowercase, hyphenated. Only introduce a new tag if none of the existing ones fit — and if you do, add it to the taxonomy list in `.claude/skills/writing-style.md`.

---

## Edge cases

- **No user answers received:** proceed with topic only; treat audience as "general developer"
- **No related articles found:** write as standalone, skip cross-links
- **Series detected but user didn't confirm:** include as a note in the research report, let user decide
