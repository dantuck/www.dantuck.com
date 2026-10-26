---
layout: '../../layouts/BlogPost.astro'
publishDate: 30 Oct 2026 14:00 UTC
title: "vivo·keep Backup Tasks, Schedules and Restores"
author: dantuck
description: |
    How I run vivo·keep day to day: composable backup tasks, two remotes, a nightly schedule, health checks, and the restore path I tested on my own data.
tags:
- backup
- tools
- self-hosting
---

A backup you have never restored is a hope. This article is how I run <a href="https://vivo.plantolive.app/" target="_blank" rel="noopener noreferrer">vivo·keep</a> every day, and the restore path I tested before writing it.

If you have not set vivo up yet, <a href="/article/vivo-backup-b2">start with the Backblaze B2 setup</a>. This picks up after `vivo doctor` is green.

## Split the work into tasks

One giant backup is hard to reason about. I run three tasks and a fourth that calls two of them:

```kdl
default-task "backup"

tasks {
    task "sync" {
        backup {
            repo "$HOME/.restic/repo/sync"
            directory "$HOME/Documents/Sync"
        }
    }
    task "filecabinet" {
        backup {
            repo "$HOME/.restic/repo/filecabinet"
            directory "$HOME/Documents/FileCabinet"
        }
    }
    task "backup" {
        calls "sync"
        calls "filecabinet"
    }
}
```

Each task has its own restic repository. A problem with one folder does not touch the others. The `backup` task is the default, so a bare `vivo` runs the lot. `vivo filecabinet` runs just that one.

## Send one task to two remotes

Important files get a local copy, a copy on my NAS, and a copy offsite. Add a `remote` block for each:

```kdl
task "filecabinet" {
    backup {
        repo "$HOME/.restic/repo/filecabinet"
        directory "$HOME/Documents/FileCabinet"

        remote "rustfs:https://rustfs.<tailnet-name>.ts.net/filecabinet" {
            credentials "rustfs"
        }
        remote "b2:my-bucket:filecabinet" {
            credentials "b2"
        }
    }
}
```

The first remote is the <a href="/article/homelab/rustfs-rclone-remote">self-hosted RustFS bucket from the homelab series</a>. It is fast to recover from. The second is B2, which survives the house burning down. Vivo syncs to each in turn.

---

## Run it on a schedule

Vivo writes the schedule into the config and installs it with the system scheduler: launchd on my Mac, systemd or cron elsewhere.

```bash
vivo schedule add --task photos --at 02:00
vivo schedule apply
vivo schedule status
```

On my machine, `status` reports the default task daily at 03:00 and `photos` at 02:00, both through launchd. Edit the config later and run `vivo schedule apply` again to bring the installed schedules back in line.

Not every step needs to run every night. A full integrity check on each run is wasteful. The `steps` block sets a cadence per step:

```kdl
steps {
    check  { every "weekly"; subset "5%" }
    forget { every "weekly" }
}
```

The backup runs nightly. The check reads back a 5% sample once a week, and old snapshots are pruned once a week. Pass `--force` when you want every step to run regardless.

## Guard against a bad run

Some jobs should not run while something is in the way. My photos task backs up the Photos library, and I do not want that happening while Photos is open. A `before` guard handles it:

```kdl
before "! pgrep -x Photos" reason="Photos is open" fix="Quit Photos (Cmd+Q)"
```

If the command fails, nothing is backed up. The `reason` and `fix` text are what vivo shows you. The failure also appears in `vivo status`, and an `on-failure` hook can send a notification. The hook receives the message in `$VIVO_ERROR`.

There is a softer form. Add `skip="**/*.photoslibrary"` and a failing guard no longer stops the task. Vivo leaves that pattern out of the run and backs up everything else. That is what I use, because I also back up an export of the library that does not care whether Photos is open. The hard form is the right choice when a partial backup is worse than none.

## Check on it

`vivo status` answers one question: is everything current? Mine looks like this, with the hostname swapped out:

```
filecabinet
  ✓ latest backup                snapshot taken 7 hours ago
  ✓ rustfs:https://rustfs.<tailnet-name>.ts.net/filecabinet synced 2 hours ago
  ✓   recovery copy              saved 3 days ago
  ✓ b2:my-bucket:filecabinet synced 2 hours ago
  ✓   recovery copy              saved 3 days ago

✓ Scheduled via launchd: default task (daily 03:00), photos (daily 02:00).
```

It warns when the newest snapshot or sync is older than 48 hours. Change that with `--max-age`.

A fresh snapshot only proves a backup ran. `vivo verify` reads data back to prove it is intact:

```bash
vivo verify --quick filecabinet     # structure and indexes only
vivo verify filecabinet             # reads back a 5% sample
vivo verify --remotes               # sample each offsite copy
```

I ran the quick check against my local repository. It checked all ten snapshots and reported no errors. Verifying a remote downloads data, so keep the sample small there. The command exits non-zero on failure, so it also works from a schedule or a hook.

---

## Restore a file

List what you have, then restore:

```bash
vivo snapshots filecabinet
vivo restore filecabinet --path "$HOME/Documents/FileCabinet/notes.md" --target ~/restore-test
```

The first command lists snapshot IDs, dates and paths. The second restores from the latest snapshot unless you pass `--snapshot <ID>`. I tested it with a single small file. It restored in under a second.

Files keep their original folder structure beneath the target. A file backed up from `~/Documents/FileCabinet/notes.md` lands at `~/restore-test/Users/<you>/Documents/FileCabinet/notes.md`. Do not point `--target` at the original folder unless you mean to.

By default restore reads the local repository. Add `--from` with a remote URL to read an offsite copy instead. Restoring from a remote downloads whole pack files, so it costs time and, on some providers, egress. Use the local copy for routine restores and keep the remotes for disasters.

`vivo mount` exposes a repository as a read-only filesystem you can browse. It needs FUSE (macFUSE or FUSE-T on macOS). I have not set that up on this machine, so I use `restore`.

## Rebuild a lost machine

Each sync also stores a small recovery copy beside the repository. It holds your encrypted `secrets.yaml` and your `backup.kdl`. That is the `recovery copy` line in the status output above.

On a new machine, two things must live somewhere other than the old one: your age key and access to a remote. Then:

```bash
vivo recover --from "b2:my-bucket:filecabinet"
```

Vivo asks for the remote's access key, downloads the recovery copy, decrypts it, and writes your config and secrets back. The restic password comes with them. I have not run `recover` on a fresh machine, so test it before you need it. `vivo status` prints a reminder every time to keep the age key and restic password off the machine they protect.

---

None of this is exciting. That is the point. Schedule it, let `status` tell you when something drifts, and restore one file a quarter so you know the path works.
