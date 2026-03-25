---
layout: '../../../layouts/BlogPost.astro'
publishDate: 24 Mar 2026
draft: true
title: "Claude Code, Part 2: Isolated, Parallel Workers with Subagents"
author: dantuck
description: |
    Subagents are isolated Claude instances that do work in their own context and return a summary. Here is how they work, how they are spawned, and the advanced patterns that make parallel execution practical.
tags:
- claude-code
- ai
- developer-tools
- workflow
---

> [Claude Code, Part 1: Give Claude a Playbook with Skills](/article/claude-code-series/part-1)<br />
> ➜ Claude Code, Part 2: Isolated, Parallel Workers with Subagents<br />
> [Claude Code, Part 3: Skills and Subagents Working Together](/article/claude-code-series/part-3)

[Part 1](/article/claude-code-series/part-1) covered skills — reusable instruction files that give Claude a playbook. This part covers subagents: the isolated workers that execute that playbook in parallel.

---

## What a subagent is

A subagent is an isolated Claude instance. It has its own fresh context window. It does not inherit your conversation history or the skills you have invoked in your session. It does the work, then returns a summary to your main session.

That isolation is the point. Your main conversation stays clean — you get the result, not every intermediate step.

---

## What a subagent receives

When a subagent is spawned, its context contains:

- The system prompt (shared with parent for cache efficiency)
- Your CLAUDE.md files
- Git status
- The task prompt from the parent session
- Any skills explicitly preloaded by name

It does **not** receive your conversation history or session-invoked skills. If you want a subagent to know your style guide, you tell it explicitly.

---

## How subagents are spawned

**Automatically:** Claude Code uses an `Agent` tool call internally when it decides to delegate. You do not configure this directly.

**Via a skill:** Add `context: fork` to your skill's frontmatter. When that skill runs, it spawns a subagent and uses the skill content as the task prompt:

```yaml
---
name: deep-research
description: Research a topic thoroughly across the codebase
context: fork
agent: Explore
---

Research $ARGUMENTS:
1. Find relevant files with Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

The `agent` field picks the subagent type: `Explore` (read-only codebase tools), `Plan` (architect), `general-purpose` (all tools), or a custom agent you define. Omit it and you get `general-purpose`.

**Via a custom agent definition:** Create `.claude/agents/<name>.md` to define a reusable subagent with specific instructions and preloaded skills:

```yaml
---
name: security-auditor
description: Specialized security review agent
skills:
  - security-checklist
  - owasp-patterns
---

Review the codebase for security vulnerabilities. Focus on authentication,
input validation, and dependency risks. Return a structured report.
```

The `skills:` field preloads those skills fully at launch — unlike session skills where only descriptions load until invoked. The subagent starts with complete knowledge of your checklist and patterns.

---

## Parallel dispatch

Multiple subagents run simultaneously and independently. Two bundled skills use this heavily:

**`/simplify`** spawns three review agents in parallel — one for code reuse, one for quality, one for efficiency. It aggregates their findings and applies the fixes.

**`/batch`** accepts a large task (like "migrate all components from React to Svelte"), decomposes it into 5 to 30 independent units, and spawns one agent per unit. This requires a git repository.

---

## Subagents and git worktrees

When parallel agents modify files, they need isolated working copies or they will conflict. `/batch` handles this by creating one git worktree per agent. Each agent works in a separate directory, runs tests, and opens a pull request. The worktrees are cleaned up if the agent makes no changes.

You can request this isolation manually: ask Claude to run parallel agents on independent tasks that modify files and it will manage worktree creation. This is what makes true parallel implementation possible — not just parallel reading.

---

## Agent-to-agent handoffs

Some tasks exceed a single context window. The handoff pattern solves this: one agent writes a structured summary to a markdown file (what it did, what it found, what comes next), and a second agent loads that file to resume with full context.

No shared memory is required. The handoff document is the interface. This works across sessions too — stop one session, start a new one, and point Claude at the handoff file.

---

## When to use a subagent

- The task reads many files but you only need the result — keeps your context clean
- You have 2+ independent tasks that can run simultaneously
- Parallel tasks will modify the same files — add worktrees
- A task spans multiple sessions or context windows — use handoffs

---

[Part 3](/article/claude-code-series/part-3) puts skills and subagents together: a decision framework for choosing between them, and a real end-to-end example showing a single command orchestrating three parallel specialized workers.
