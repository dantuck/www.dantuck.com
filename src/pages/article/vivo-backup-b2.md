---
layout: '../../layouts/BlogPost.astro'
publishDate: 24 Apr 2026
title: "vivo·keep: encrypted backups with restic and Backblaze B2"
author: dantuck
description: |
    vivo·keep is an encrypted backup orchestrator built on restic, with credentials kept secure using SOPS and age. Here is how to get set up with Backblaze B2.
tags:
- tools
- backup
---

<figure style="text-align: center; margin: 2rem 0 2.5rem;">
  <img src="/images/vivo-keep-logo.svg" alt="vivo·keep" style="max-width: 100%; border-radius: 6px;" />
</figure>

Restic is a solid backup tool. Encryption, deduplication, and snapshots are all built in. The friction comes later — remembering every command, running them in the right order, and maintaining a shell script to hold it all together.

<a href="https://vivo.plantolive.app/" target="_blank" rel="noopener noreferrer">vivo·keep</a> fixes that.

## What vivo does

Vivo is a Rust CLI that wraps restic and orchestrates the full backup pipeline. Four phases, always in order: backup your directories, verify the repository, prune old snapshots, then push to your configured remotes.

Credentials never touch disk in plaintext. Vivo uses <a href="https://getsops.io/" target="_blank" rel="noopener noreferrer">SOPS</a> + <a href="https://age-encryption.org/" target="_blank" rel="noopener noreferrer">age</a> to encrypt your restic password and cloud keys at rest. They are decrypted in memory at runtime and injected as environment variables.

## Why vivo·keep

The name is not accidental. Vivo is Latin for "to live." In the context of backups, that is exactly the point — not to park files in a cold vault, but to keep your data alive and retrievable when hardware does not survive. Keep makes that explicit. The CLI stays `vivo`, short enough to type in a crisis, which is exactly when it matters.

## Install

Vivo depends on a few tools that must be present before first use:

- <a href="https://restic.net" target="_blank" rel="noopener noreferrer">restic</a> — the backup engine
- <a href="https://github.com/getsops/sops" target="_blank" rel="noopener noreferrer">sops</a> — secrets encryption
- <a href="https://age-encryption.org" target="_blank" rel="noopener noreferrer">age</a> — encryption key management
- <a href="https://www.backblaze.com/docs/cloud-storage-command-line-tools" target="_blank" rel="noopener noreferrer">b2</a> — required for Backblaze B2 remotes

Once those are in place, install vivo with the one-line script for Linux and macOS:

```bash
curl -sSf https://raw.githubusercontent.com/dantuck/vivo/main/install.sh | sh
```

The script downloads the latest binary from GitHub Releases, verifies the SHA256 checksum, and installs to `/usr/local/bin/vivo` (or `~/.local/bin` if not writable). Or install from <a href="https://crates.io/crates/vivo" target="_blank" rel="noopener noreferrer">crates.io</a> if you have Rust:

```bash
cargo install vivo
```

Already installed? `vivo update` pulls the latest release. Vivo also checks for updates in the background once per 24 hours and prints a notice after each backup run if a newer version is available.

## Getting set up with Backblaze B2

Backblaze B2 is cost-effective cold storage. Vivo syncs to it using the b2 CLI — no remote restic repository initialization needed.

### Initialize

```bash
vivo init
```

This verifies your prerequisites, creates a starter config at `~/.config/vivo/backup.kdl`, and creates an encrypted secrets file at `~/.config/vivo/secrets.yaml`.

### Configure your backup

```bash
vivo config edit
```

Vivo uses a <a href="https://kdl.dev" target="_blank" rel="noopener noreferrer">KDL</a> config file. A minimal B2 setup:

```kdl
default-task "backup"  // task to run when you call `vivo` with no arguments

tasks {
    task "backup" {  // name is arbitrary; run others with `vivo run <name>`
        backup {
            repo "$HOME/.local/share/restic/main"       // local restic snapshot database
            directory "$HOME"                            // repeat for multiple paths
            exclude-file "$HOME/.config/vivo/excludes"  // patterns to skip (node_modules, .cache, etc.)

            retention {  // snapshots to keep; forget --prune runs automatically
                daily   7
                weekly  5
                monthly 12
                yearly  2
            }

            remote "b2:my-bucket:restic/main" {  // format: b2:bucket:path
                credentials "b2"  // named block to decrypt from secrets.yaml
            }
        }
    }
}
```

The `exclude-file` is worth setting up before your first real backup, especially when backing up `$HOME`. Patterns follow restic's exclude format — one per line.

### Add your secrets

```bash
vivo secrets edit
```

This opens your SOPS-encrypted secrets file. The structure maps credential profile names to the environment variables each remote needs:

```yaml
restic_password: "your-restic-repo-password"
credentials:
  b2:
    B2_ACCOUNT_ID: "your-account-id"
    B2_ACCOUNT_KEY: "your-application-key"
```

The `b2` key under `credentials` matches the `credentials "b2"` line in your config. Vivo decrypts this at runtime and injects the key/value pairs as environment variables for the sync step. The plaintext never gets written anywhere.

### Verify your setup

```bash
vivo doctor
```

`vivo doctor` runs a structured health check — tools installed, config valid, secrets decryptable, remotes reachable. Run it after setup to catch problems before your first real backup.

### Run a dry-run first

```bash
vivo --dry-run
```

This steps through the full pipeline without writing to your remote. Skips the remote sync entirely and forwards `--dry-run` to restic for the backup phase.

### Run the backup

```bash
vivo
```

Vivo snapshots your directories with restic, verifies the repository, applies your retention policy, then syncs everything to B2.

If your B2 credentials are missing or have expired, vivo will walk you through reconnecting and update the secrets file before continuing.

## Resuming from a specific step

If a backup completes but the sync fails, you do not need to re-run the full pipeline. Use `--start-step` to pick up where it left off:

```bash
vivo -S sync    # skip backup/check/forget, only sync to remotes
vivo -S forget  # skip backup/check, run forget then sync
```

Steps in order: `backup` → `check` → `forget` → `sync`. This is useful for long backups where restic has already finished and you only need to retry the remote push.

---

I have written about <a href="/article/rclone">rclone</a> before as a tool for syncing files to B2. Vivo takes a different approach — the sync to B2 is one step in a coordinated pipeline, not a standalone operation. The order matters and vivo enforces it.

The source is on <a href="https://github.com/dantuck/vivo" target="_blank" rel="noopener noreferrer">GitHub</a>. The full documentation is at <a href="https://vivo.plantolive.app/" target="_blank" rel="noopener noreferrer">vivo.plantolive.app</a>.
