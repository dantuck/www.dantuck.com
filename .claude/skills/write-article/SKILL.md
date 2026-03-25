---
name: write-article
description: Write a new blog article for this site
argument-hint: <topic>
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Agent
---

You are helping write a new article for dantuck.com, an Astro-based developer blog. The topic is: $ARGUMENTS

Follow these phases in order. Do not skip phases or combine them.

---

## Phase 1 — Dispatch + questions (parallel)

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

## Phase 2 — Adaptive follow-up (conditional)

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

### Step 1 — Read writing style memory

Look for `writing-style.md` in the project memory directory (the same directory where `MEMORY.md` lives for this project — at `~/.claude/projects/-home-daniel-Code-DOMAINS-dantuck-com-www-dantuck-com/memory/writing-style.md`).

- If found: read it and apply its guidance throughout the article.
- If not found (first run): use Glob to get `src/pages/article/**/*.{md,mdx}` sorted by modification time. Read the 3 most recently modified articles in full. Extract style observations:
  - Tone (e.g., "direct, second-person, no filler phrases")
  - Heading conventions (e.g., "sentence case, ## for main sections")
  - Link patterns (e.g., "inline contextual links, never 'click here'")
  - Structural patterns (e.g., "open with scenario, end with concrete next action")
  - Tag taxonomy (list of tags seen)
  Then write `writing-style.md` to the memory directory with these observations. Apply the style when writing.

### Step 2 — Determine output path

| Article type | Output path |
|---|---|
| Standalone article | `src/pages/article/<slug>.md` |
| New series, first part | `src/pages/article/<series-name>/part-1.md` |
| Extending existing series | `src/pages/article/<existing-series-dir>/part-N.md` |
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

Tags: use existing tags from the writing style memory taxonomy. Lowercase, hyphenated. Only introduce a new tag if none of the existing ones fit.

Body rules:
- Weave cross-links from the research report inline where they add value
- Do not add a "see also" or "related articles" section at the end — links belong in context
- Follow the writing style from memory exactly
- Match the tone, heading style, link patterns, and structural patterns observed

### Step 5 — Update writing style memory

After writing, append any new observations to `writing-style.md`. Do not rewrite the whole file — only add or update entries that changed based on what was just written. Add any new tags used to the taxonomy list.

---

## Edge cases

- **No user answers received:** proceed with topic only; treat audience as "general developer"
- **No related articles found:** write as standalone, skip cross-links
- **Series detected but user didn't confirm:** include as a note in the research report, let user decide
