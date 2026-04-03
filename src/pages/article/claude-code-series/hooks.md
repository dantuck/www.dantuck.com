---
layout: '../../../layouts/BlogPost.astro'
publishDate: 03 Apr 2026
draft: true
title: "Claude Code Hooks: Automate Workflows and Guard Secrets"
author: dantuck
series: claude-code-series
seriesPart: 4
description: |
    Hooks in Claude Code run shell commands at lifecycle events like PreToolUse and Stop. Learn to configure them and build a hook that blocks secret exposure.
tags:
- claude-code
- developer-tools
- workflow
---

Skills tell Claude what to do when you ask. Hooks run regardless of what you ask — before and after every tool call, every session, every prompt submission. They are the layer you reach for when you need deterministic control.

## What hooks are not

CLAUDE.md shapes how Claude thinks. Skills extend what Claude can do. Hooks enforce what Claude is allowed to do — or automate what should always happen when Claude acts.

A `PostToolUse` hook that runs Prettier after every file edit does not require Claude to remember to run Prettier. It happens. Every time. The hook is not a suggestion.

## The event model

Hooks fire at named lifecycle points. You register a shell command (or HTTP endpoint) for an event, and Claude Code runs it when that event fires.

The events most worth knowing:

| Event | When it fires | Can block? |
|---|---|---|
| `SessionStart` | Session begins or resumes | No |
| `PreToolUse` | Before any tool call | Yes |
| `PostToolUse` | After a tool call succeeds | No |
| `UserPromptSubmit` | Before Claude processes your prompt | Yes |
| `Stop` | When Claude finishes responding | Yes |
| `Notification` | When Claude needs your attention | No |
| `ConfigChange` | When a settings file changes mid-session | Yes |
| `FileChanged` | When a watched file changes on disk | No |

`PreToolUse` is the workhorse. It intercepts every tool call — Bash commands, file edits, reads — before execution. Exit with code `2` and the tool call is cancelled. Exit with `0` and it proceeds. Claude receives your stderr message as feedback either way.

`PostToolUse` cannot undo what already ran. Use it for side effects: formatting, logging, triggering test runs.

`Stop` fires when Claude finishes a response. Return a block decision and Claude keeps working. This is how you enforce "do not stop until tests pass."

---

## Configuring hooks

Hooks live in `settings.json`. Three scopes, depending on who the hook is for:

| File | Scope |
|---|---|
| `~/.claude/settings.json` | All projects on your machine |
| `.claude/settings.json` | This project (committable) |
| `.claude/settings.local.json` | This project (gitignored) |

The structure is always the same:

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolName",
        "hooks": [
          {
            "type": "command",
            "command": "path/to/script.sh"
          }
        ]
      }
    ]
  }
}
```

The `matcher` is a regex on the tool name. `"Edit|Write"` matches both. `"Bash"` matches only Bash calls. Leave it empty and the hook fires on every occurrence of that event.

Reference the project root with `$CLAUDE_PROJECT_DIR` in your command paths. This keeps scripts portable across machines.

## Your first hook

The simplest useful hook: a desktop notification when Claude needs your attention. Add this to `~/.claude/settings.json` and you can step away while Claude works without watching the terminal.

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "notify-send 'Claude Code' 'Needs your attention'"
          }
        ]
      }
    ]
  }
}
```

On macOS, replace `notify-send` with `osascript -e 'display notification "Needs your attention" with title "Claude Code"'`.

Once added, run `/hooks` inside Claude Code to confirm the hook appears. The hooks browser shows every registered hook, its source file, and its matcher. It is read-only — make changes by editing the JSON directly.

## Blocking edits to sensitive files

This is where hooks become a real safeguard. Claude Code will write to `.env` if you ask it to, or if it decides it needs to. A `PreToolUse` hook can intercept that before it happens.

Create `.claude/hooks/protect-files.sh`:

```bash
#!/bin/bash

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

PROTECTED_PATTERNS=(".env" ".env.local" ".env.production" "*.pem" "*.key")

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "Blocked: $FILE_PATH matches protected pattern '$pattern'" >&2
    exit 2
  fi
done

exit 0
```

Make it executable:

```bash
chmod +x .claude/hooks/protect-files.sh
```

Register it in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-files.sh"
          }
        ]
      }
    ]
  }
}
```

When Claude attempts to edit `.env`, the hook exits `2`. Claude receives the stderr message as feedback and adjusts its approach. It does not silently fail — Claude knows exactly why it was blocked.

A few things to notice here. `jq` parses the JSON payload from stdin. Install it if you do not have it (`brew install jq` / `apt install jq`). All diagnostic output goes to **stderr** — stdout is reserved for JSON responses, and mixing them breaks the hook. The blocked path and reason go to stderr, which Claude reads as feedback.

---

## Scanning for secrets in Bash commands

The file-protection hook above guards writes. But secrets also leak through Bash — `curl` calls with inline tokens, `export API_KEY=abc123` statements, `echo` commands that print credentials into logs.

A `PreToolUse` hook on `Bash` can scan the command string before it runs:

```bash
#!/bin/bash
# .claude/hooks/scan-secrets.sh

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

SECRET_PATTERNS=(
  'sk-[a-zA-Z0-9]{20,}'
  'ghp_[a-zA-Z0-9]{36}'
  'AKIA[0-9A-Z]{16}'
  'xoxb-[0-9]+-[a-zA-Z0-9]+'
  'Bearer [a-zA-Z0-9\-_]{20,}'
)

for pattern in "${SECRET_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "Blocked: command appears to contain a hardcoded secret. Use environment variables instead." >&2
    exit 2
  fi
done

exit 0
```

Register it alongside the file-protection hook:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-files.sh"
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/scan-secrets.sh"
          }
        ]
      }
    ]
  }
}
```

This does not replace `.gitignore` or a secrets manager. It is a last line of defense against Claude accidentally running a command that echoes a credential it found in context.

## Secrets in HTTP hooks

When you use an HTTP hook — POSTing event data to a remote endpoint — you may need to authenticate that request. The temptation is to put the token directly in `settings.json`.

Do not.

`settings.json` ends up in git. Use environment variable interpolation with `allowedEnvVars` instead:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "http",
            "url": "https://audit.example.com/hooks",
            "headers": {
              "Authorization": "Bearer $AUDIT_TOKEN"
            },
            "allowedEnvVars": ["AUDIT_TOKEN"]
          }
        ]
      }
    ]
  }
}
```

Claude Code only resolves variables listed in `allowedEnvVars`. If `$AUDIT_TOKEN` is not in that list, it resolves to empty — by design, not by accident.

Store the token in your shell environment (`~/.zshrc`, `~/.bashrc`, or a secrets manager that exports to the environment). Never in the settings file itself.

---

## Debugging hooks

When a hook does not fire or behaves unexpectedly, start here.

**Check `/hooks`** — type it in Claude Code. The hooks browser shows every registered hook and its source file. If yours is missing, the JSON is invalid or the file is in the wrong location.

**Toggle verbose mode** — press `Ctrl+O` during a session. Hook stdout and stderr appear inline in the transcript. This shows exactly what your hook received and returned.

**Test the script manually** — hooks receive JSON on stdin. Pipe a sample payload and check the exit code:

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"echo hello"}}' | .claude/hooks/scan-secrets.sh
echo $?
```

Exit `0` means allow. Exit `2` means block. Any other exit code logs to verbose mode and allows the action to continue.

**Watch for shell profile noise** — Claude Code spawns a non-interactive shell to run your hook. If your `.zshrc` or `.bashrc` has unconditional `echo` statements, that output prepends to your hook's stdout and breaks JSON parsing. Wrap interactive-only output:

```bash
if [[ $- == *i* ]]; then
  echo "Shell ready"
fi
```

**Stop hooks looping** — a `Stop` hook that always blocks causes an infinite loop. Check the `stop_hook_active` field and exit early if it is set:

```bash
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0
fi
```

---

Hooks are the one part of Claude Code that runs unconditionally. Skills require invocation. CLAUDE.md requires Claude to read and follow it. Hooks just run. That determinism is the point — and it is what makes them the right tool for anything you cannot afford to leave to chance.

If you are new to the series, <a href="/article/claude-code-series/skills-playbook" target="_blank" rel="noopener noreferrer">Part 1 covers skills</a> — the better starting point before adding hooks on top.
