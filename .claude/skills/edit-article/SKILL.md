---
name: edit-article
description: Review a blog article against dantuck.com writing style and offer specific suggestions
argument-hint: <article slug or file path>
disable-model-invocation: true
allowed-tools: Read, Glob, Edit
---

You are editing an article for dantuck.com. Your job is to review it against the established writing style and offer specific, actionable suggestions. Do not rewrite the article unless the user asks — offer suggestions first.

---

## Step 1 — Locate the article

If `$ARGUMENTS` is a file path, read it directly.

If `$ARGUMENTS` is a slug (e.g. `project-hail-mary`), find the file:
- `src/pages/article/$ARGUMENTS.md`
- `src/pages/article/$ARGUMENTS.mdx`
- `src/pages/article/$ARGUMENTS/index.md`
- `src/pages/article/$ARGUMENTS/index.mdx`

Read whichever exists.

---

## Step 2 — Read the style guide

Read `.claude/skills/writing-style.md` from the project root.

---

## Step 3 — Review and report

Go through the article carefully. For each issue found, note the specific text and what rule it violates. Group feedback into these categories:

**Contractions** — list every contraction found with suggested expansion

**Sentence length / flow** — flag sentences that run too long or string clauses together where a break would be stronger

**Structure** — headers that are too generic, missing or misplaced `---` breaks, bold labels like "Bottom line:" that should be plain prose

**Voice / word choice** — hedging language, filler qualifiers, anything that drifts from the direct first-person tone

**Other** — anything not covered above

Present the report clearly. For each suggestion, quote the original text and show the proposed change. Be specific — not "this sentence is long" but "consider breaking after X."

End with a summary line: how many issues total, and which category had the most.

---

## Step 4 — Editorial review

After the style report, shift roles. You are now an editor focused on the article's content, argument, and impact — not style compliance. Read the article again with fresh eyes and give honest, specific feedback on:

**Opening** — Does the first sentence or two earn attention immediately? Does it make the reader want to continue, or does it set up instead of hook?

**Thesis / point of view** — Is there a clear argument or perspective the article makes? Or does it describe without taking a position? A good article leaves the reader knowing what you actually think.

**Flow and section order** — Does each section lead naturally to the next? Are there gaps where the reader has to make a leap you have not bridged? Are any sections in the wrong order?

**Specificity** — Are claims backed by concrete detail, or do they stay vague? Flag places where a specific example, number, or scene would make the point land harder.

**Weakest section** — Identify the one section that does the least work. Explain why and suggest what would make it stronger — cut it, combine it, or focus it.

**Closing** — Does the article end on something that sticks, or does it trail off? The last sentence should feel final.

**What is missing** — Is there an obvious angle, question, or piece of information the reader will want that the article does not address?

Present this as a second report, clearly labeled **Editorial feedback**. Be direct. "This section is weak because X" is more useful than "you might consider Y." Suggestions can be structural — rearranging, cutting, expanding — not just word-level.

---

## Step 5 — Apply or discuss

After both reports, ask:
> "Want me to apply style fixes, editorial changes, both, or talk through any of these first?"

Wait for the user's response before making any edits.

If the user says apply, use the Edit tool to make the changes. Do not rewrite sections wholesale — make targeted edits only.
