---
layout: '../../../layouts/BlogPost.astro'
publishDate: 24 Mar 2026
draft: true
title: "Claude Code, Part 1: Give Claude a Playbook with Skills"
author: dantuck
description: |
    Skills are reusable instruction files that tell Claude Code how to handle a class of task. Here is how they work, how to install them, and when to reach for one.
tags:
- claude-code
- ai
- developer-tools
- workflow
---

> ➜ Claude Code, Part 1: Give Claude a Playbook with Skills<br />
> [Claude Code, Part 2: Isolated, Parallel Workers with Subagents](/article/claude-code-series/part-2)<br />
> [Claude Code, Part 3: Skills and Subagents Working Together](/article/claude-code-series/part-3)

You ask Claude Code to implement a function, write tests, and update the docs. All three come back in parallel, complete and correct. What just happened?

Claude Code detected that the three tasks were independent, delegated them to separate workers each running in isolated context, and coordinated the results. It knew how to approach each task because skills defined the approach. Workers — called subagents — executed the work.

That is the mental model: **Claude Code is an orchestrator. Skills are its playbook. Subagents are its workers.**

---

## What a skill is

A skill is a markdown file that tells Claude Code how to handle a class of task. It has YAML frontmatter describing what it does, followed by the instructions Claude follows when the skill is active. That is all.

```yaml
---
name: explain-code
description: Explains code with visual diagrams and analogies. Use when explaining how code works or teaching about a codebase.
---

When explaining code:
1. Start with a real-world analogy
2. Show an ASCII diagram of the flow
3. Walk through the steps
4. Call out a common mistake
```

Claude Code ships with bundled skills that work out of the box: `/simplify`, `/batch`, `/debug`, `/loop`, and `/claude-api`. You can find the full list in the docs. You can also write your own.

---

## Installing skills

Skills live in a `skills/<name>/SKILL.md` path. Where you put it controls scope:

- `~/.claude/skills/<name>/SKILL.md` — available in all your projects
- `.claude/skills/<name>/SKILL.md` — available in this project only

When the same skill name exists at multiple levels, the higher-priority location wins: enterprise > personal > project.

---

## Invoking skills

There are two invocation modes.

**Manual:** Type `/skill-name` in your prompt. This works regardless of the skill's configuration. Pass arguments like `/fix-issue 123` — the text after the skill name becomes `$ARGUMENTS` in the skill content.

**Auto:** Claude matches your message against skill descriptions and loads relevant ones automatically. The description field in frontmatter is what Claude reads to decide. If your description says "Use when explaining how code works," Claude will load it when you ask how something works.

You control whether auto-invocation is allowed per skill:

```yaml
---
name: deploy
description: Deploy the application to production
disable-model-invocation: true
---
```

With `disable-model-invocation: true`, only you can trigger the skill. Claude will never auto-run it. Use this for workflows with side effects — deploys, commits, Slack messages, anything where you want to be in control of the timing.

---

## Key frontmatter fields

| Field | What it does |
|---|---|
| `name` | Becomes the `/slash-command`. Defaults to directory name. |
| `description` | Tells Claude when to auto-invoke. Omit and Claude won't know when to use it. |
| `disable-model-invocation` | `true` = only you can invoke. Claude cannot. |
| `user-invocable` | `false` = Claude-only. Hidden from the `/` menu. |
| `context` | `fork` = run this skill in an isolated subagent context automatically. |
| `allowed-tools` | Tools Claude can use without per-use approval when this skill is active. |

---

## Context cost

Skill descriptions load at session start so Claude knows what is available. The budget is 2% of the context window (fallback: 16,000 characters). Full skill content only loads when invoked.

Set `disable-model-invocation: true` and the skill costs zero context until you invoke it — nothing loads at session start at all. This is the right choice for any skill you trigger yourself rather than letting Claude decide.

---

## Skills vs CLAUDE.md

CLAUDE.md loads every session, automatically. Use it for always-on rules: build commands, conventions, "never do X" constraints.

Skills load on demand. Use them for reference material Claude needs sometimes, or for repeatable workflows you trigger by name.

They are additive, not competing. If instructions conflict, Claude uses judgment; more specific instructions typically win. A rule of thumb: keep CLAUDE.md under 500 lines. When it grows past that, move reference material into skills.

**Use a skill when:** you have a repeatable workflow with specific steps, or reference material (API docs, style guides, query patterns) Claude should load on demand rather than always.

---

## Getting started

Write one skill today. Pick something you do repeatedly — a commit workflow, a code review checklist, a deploy sequence. Put it in `~/.claude/skills/<name>/SKILL.md` with a clear description. Run it with `/name`.

Once you have a feel for how they work, continue to [Part 2](/article/claude-code-series/part-2) to see how subagents extend the model — isolated workers that run in parallel while your main context stays clean.
