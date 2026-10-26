---
layout: '../../../layouts/BlogPost.astro'
publishDate: 12 Nov 2026 14:00 UTC
title: "Claude Code Worktrees: Parallel Sessions Without Conflicts"
author: dantuck
series: claude-code-series
seriesPart: 5
description: |
    Claude Code worktrees give each session its own copy of your files and branch. Learn the --worktree flag, subagent isolation, cleanup rules and what /batch does.
tags:
- claude-code
- ai
- developer-tools
- workflow
---

Two Claude Code sessions in one checkout will eventually edit the same file. One of them wins. The other one is confused about why the code changed underneath it.

Git worktrees fix that, and Claude Code has built-in support for them.

## What a worktree is

A <a href="https://git-scm.com/docs/git-worktree" target="_blank" rel="noopener noreferrer">git worktree</a> is a second working directory attached to the same repository. It has its own files and its own branch. It shares the history and the remote.

That is the whole idea. Session one edits files in one directory. Session two edits files in another. Neither can overwrite the other, and both can push to the same remote.

## Start a session in a worktree

Pass `--worktree` or `-w` with a name:

```bash
claude --worktree feature-auth
```

Claude Code creates the worktree under `.claude/worktrees/feature-auth/` at the repository root, on a new branch named `worktree-feature-auth`. Run the same command with a different name in another terminal and you have a second isolated session. Leave the name off and Claude picks one for you.

Add `.claude/worktrees/` to your `.gitignore`. Otherwise the worktree contents show up as untracked files in your main checkout.

You can also ask for it in the middle of a session. Say "work in a worktree" and Claude enters one with its `EnterWorktree` tool.

### A worktree is a fresh checkout

A new worktree has only tracked files. Your `node_modules` is not there. Neither is your `.env`.

Ask Claude to install dependencies, or run your setup yourself. For gitignored files that every worktree needs, add a `.worktreeinclude` file to the project root. It uses `.gitignore` syntax:

```text
.env
.env.local
config/secrets.json
```

Claude Code copies a file only if it matches a pattern in this file and is also gitignored. Tracked files are never duplicated.

### Where the branch starts

By default a new worktree branches from the default branch on the remote, usually `main`. That gives you a clean tree that matches the remote. Your unpushed commits are not in it.

If you want the worktree to carry your in-progress work, set `worktree.baseRef` to `"head"` in your settings:

```json
{
  "worktree": {
    "baseRef": "head"
  }
}
```

You can also start from a pull request. Quote the argument so your shell does not read `#` as a comment:

```bash
claude --worktree "#1234"
```

---

## Cleanup

When you exit an interactive worktree session, Claude Code checks for work that removal would delete: changed files, untracked files and new commits.

* A clean, unnamed session removes the worktree and its branch for you.
* A clean, named session asks first.
* A worktree with work in it asks whether to keep or remove it. Keeping preserves the directory and the branch. Removing deletes both, along with the work.

To come back to a kept worktree, run `claude --worktree <name> --resume`. Claude Code prints that command when you exit.

Non-interactive runs with `-p` have no exit prompt, so nothing is cleaned up. Remove those by hand with `git worktree remove`.

## Subagents in their own worktrees

Part 2 covered subagents that run in parallel. Parallel reading is safe. Parallel editing is not, because two subagents can change the same file.

Ask Claude to "use worktrees for your agents" and each subagent gets its own. For a custom agent, make it permanent in the frontmatter:

```markdown
---
name: refactorer
description: Applies mechanical refactors across many files
isolation: worktree
---

Apply the requested refactor across every affected file, then run the tests
and report the results.
```

Claude Code removes a subagent's worktree when it finishes without changes. A worktree with changes stays on disk. A periodic sweep removes old subagent worktrees, but it skips any that still hold changed files or unpushed commits.

## What /batch does

`/batch` is a bundled skill that uses all of this. You give it a large change, such as migrating a source folder from JavaScript to TypeScript. It then:

1. Researches the codebase.
2. Splits the work into 5 to 30 independent units.
3. Shows you the plan.
4. After you approve it, starts one background subagent per unit, each in its own worktree.
5. Has each subagent implement its unit, run the tests and publish its change.

It requires a git repository. Outside one, it needs a `WorktreeCreate` hook that makes the worktrees.

The approval step is the useful part. Thirty parallel agents is a lot of changes to review. Read the plan before you say yes, and check that the units really are independent. Two units that touch the same file will conflict, worktrees or not.

---

## What is shared and what is not

A worktree has its own files and branch. It still shares a few things with the main checkout:

* The `.git` directory, so `git commit` works from inside a worktree.
* Project-scope plugins, so you do not reinstall them.
* Permission approvals. Choosing "Yes, and do not ask again" for a command saves the rule to the main checkout, so it applies in every worktree.

One detail matters if you use <a href="/article/claude-code-series/hooks">hooks from part 4</a>. After Claude enters a worktree, `$CLAUDE_PROJECT_DIR` still points at the main project root. A hook that runs `"$CLAUDE_PROJECT_DIR"/.claude/hooks/check.sh` still runs the script from the main checkout. The hook's input JSON has a `cwd` field that follows Claude into the worktree. Read that when a hook needs the worktree path.

Worktree isolation also blocks some tool calls. While a session is isolated, Claude Code refuses edits that target a path in the main checkout. It also refuses a shell command that runs git against the main checkout. That is a safety net. It does not track every file a shell command writes, though, so a `cp` into the main checkout is not caught.

## When to reach for one

Use a worktree when two pieces of work need to run at the same time and might touch the same files. A feature in one session and a bug fix in another is the common case.

Skip it for a quick edit or a read-only question. A worktree costs a fresh checkout and a dependency install, and a single session does not need that.

If you are new to the series, <a href="/article/claude-code-series/skills-playbook">part 1 covers skills</a> and <a href="/article/claude-code-series/subagents-parallel-workers">part 2 covers subagents</a>. Worktrees are what make part 2's parallel workers safe to let loose on real code.
