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

- Its own system prompt, which is the body of the agent file, plus basic environment details such as the working directory. It does not get the Claude Code system prompt
- Your CLAUDE.md files (the built-in Explore and Plan agents skip them)
- A git status snapshot
- The task prompt from the parent session

It does **not** receive your conversation history, the skills you have already invoked, or the files Claude has already read. If you want a subagent to know your style guide, you tell it explicitly.

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
tools: Glob, Grep, Read
---

Review the codebase for security vulnerabilities. Focus on authentication,
input validation, and dependency risks. Return a structured report.
```

The `tools` field restricts which tools the subagent can use. Use `disallowedTools` to remove tools from the inherited set instead. The body of the file is the agent's system prompt. No tools beyond what you allow, and no knowledge beyond what you write and what it reads for itself. Claude Code ignores a frontmatter field it does not recognize, without an error, so a misspelled field fails silently.

---

## Parallel dispatch

Multiple subagents run simultaneously and independently. Two bundled skills use this heavily:

**`/simplify`** runs four review agents in parallel, covering reuse of existing helpers, simplification, efficiency, and whether the change sits at the right level of abstraction. It applies the fixes. It does not look for correctness bugs. Use `/code-review` for those.

**`/batch`** accepts a large task (like "migrate all components from React to Svelte"), researches the codebase, decomposes it into 5 to 30 independent units, and presents a plan. Once you approve, it spawns one background agent per unit. This requires a git repository, or a `WorktreeCreate` hook that creates the worktrees.

---

## Subagents and git worktrees

When parallel agents modify files, they need isolated working copies or they will conflict. `/batch` handles this by creating one git worktree per agent. Each agent works in a separate directory, runs tests, and publishes its change. The worktrees are cleaned up if the agent makes no changes.

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

## Changelog

> **2026-10-26**
>
> * Corrected what a subagent receives. It gets its own system prompt plus environment details, not the Claude Code system prompt.
> * Replaced `allowed-tools` with `tools` in the custom agent example. `allowed-tools` is a skill field, and an agent file ignores it.
> * Corrected `/simplify`, which runs four review agents, and `/batch`, which asks you to approve a plan before it starts.
