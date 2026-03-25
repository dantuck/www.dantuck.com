---
layout: '../../../layouts/BlogPost.astro'
publishDate: 24 Mar 2026
draft: true
title: "Claude Code, Part 3: Skills and Subagents Working Together"
author: dantuck
description: |
    Skills define the approach. Subagents execute it. Here is a decision framework for choosing between them, and a real example showing both working together in a single command.
tags:
- claude-code
- ai
- developer-tools
- workflow
---

> [Claude Code, Part 1: Give Claude a Playbook with Skills](/article/claude-code-series/part-1)<br />
> [Claude Code, Part 2: Isolated, Parallel Workers with Subagents](/article/claude-code-series/part-2)<br />
> ➜ Claude Code, Part 3: Skills and Subagents Working Together

[Part 1](/article/claude-code-series/part-1) covered skills. [Part 2](/article/claude-code-series/part-2) covered subagents. This part shows how to combine them and when to reach for each.

---

## Decision framework

| Situation | Reach for |
|---|---|
| Repeatable workflow you trigger by name | Skill (action) |
| Reference material Claude needs sometimes | Skill (reference) |
| Workflow with side effects you control explicitly | Skill with `disable-model-invocation: true` |
| Task reads many files, you only need the result | Subagent |
| 2+ independent tasks that can run simultaneously | Parallel subagents |
| Parallel tasks that modify the same files | Subagents + git worktrees |
| Task spans multiple sessions | Agent handoff |
| Skill that needs its own isolated context | Skill with `context: fork` |

The pattern that appears most often: a skill orchestrates, subagents execute. The skill holds the strategy — which agents to spawn, what to preload, how to aggregate results. The subagents do the work in isolation.

---

## Putting it together: `/audit`

Here is how this looks in practice.

You run `/audit src/`. The skill instructs Claude to dispatch three parallel subagents:

- A **security agent** preloaded with a `security-checklist` skill
- A **performance agent** preloaded with a `performance-patterns` skill
- A **style agent** preloaded with a `style-guide` skill

Each subagent runs independently, reads the codebase, and returns a findings report. The main session aggregates those reports into a single audit result.

The `/audit` skill's content drives all of this — it tells Claude to use the `Agent` tool three times in parallel, specifying which skills to preload for each. Claude Code handles spawning, waiting, and collecting results. Your main context window receives one clean summary.

This is the practical payoff of understanding the model: a single `/audit` command becomes a coordinated multi-agent workflow with specialized workers, each using focused knowledge, none stepping on each other.

---

## Getting started

If you have read all three parts, you have the full picture. The practical path forward:

1. **Write one skill** — something you do repeatedly. A commit workflow, a review checklist, a deploy sequence. Put it in `~/.claude/skills/<name>/SKILL.md`. Run it with `/name`.

2. **Try `context: fork`** on a task that reads a lot of files. Watch your main context stay clean while the research happens in isolation.

3. **Combine them** once both feel natural. Write a skill that dispatches parallel subagents, each preloaded with focused knowledge. Start with two agents, see how the aggregation works, then scale up.

The orchestrator model rewards investment. The more precisely you define how Claude approaches your work, the more coordinated and consistent that work becomes.
