---
layout: '../../../layouts/BlogPost.astro'
publishDate: 06 Apr 2026
title: "Claude Code, Part 2: Isolated, Parallel Workers with Subagents"
author: dantuck
series: claude-code-series
seriesPart: 2
description: |
    Claude Code subagents run in isolated contexts and return results to your session. How they work, how to spawn them, and patterns for parallel execution.
tags:
- claude-code
- ai
- developer-tools
- workflow
---

Part 1 covered skills — reusable instruction files that give Claude a playbook. This part covers subagents: the isolated workers that execute that playbook in parallel.

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

**Via a custom agent definition:** Create `.claude/agents/<name>.md` to define a reusable subagent with specific instructions and tool constraints:

```yaml
---
name: security-auditor
description: Specialized security review agent
allowed-tools: Glob, Grep, Read
---

Review the codebase for security vulnerabilities. Focus on authentication,
input validation, and dependency risks. Return a structured report.
```

The `allowed-tools` field restricts which tools the subagent can use. The agent's instructions — the body of the file — are its complete context at launch. No tools beyond what you allow, no knowledge beyond what you write.

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

Part 3 puts skills and subagents together: a decision framework for choosing between them, and a real end-to-end example showing a single command orchestrating three parallel specialized workers.
