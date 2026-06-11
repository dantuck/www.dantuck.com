---
layout: '../../../layouts/BlogPost.astro'
publishDate: 12 Jun 2026
title: "rclone S3 Remote for Self-Hosted RustFS"
author: dantuck
description: |
    Configure rclone and vivo·keep to use a self-hosted RustFS instance as an S3-compatible remote — a private alternative to Backblaze B2 running on your NAS.
tags:
- self-hosting
- homelab
- backup
- tools
---

Once <a href="/article/homelab/rustfs-synology-tailscale">RustFS is running on your NAS</a>, it speaks the same S3 protocol that rclone, restic, and vivo·keep already know how to talk to. This article shows how to configure each one to treat your self-hosted RustFS as a remote — so your backups go to hardware you own instead of a cloud provider.

## Create a bucket

Before configuring any client, create a bucket in RustFS to hold the data.

Open the RustFS console at `https://rustfs.<tailnet-name>.ts.net`. Log in with your access key and secret key. Go to **Buckets** → **Create Bucket**.

Give it a name. Bucket names follow the S3 convention: lowercase, no spaces, hyphens allowed. Something like `backups` or `restic-main` works well.

Leave versioning and object locking off unless you specifically need them. Click **Create**.

## Configure rclone

<a href="https://rclone.org" target="_blank" rel="noopener noreferrer">Rclone</a> has built-in support for S3-compatible endpoints. RustFS is S3-compatible, so it uses the `s3` provider type with a custom endpoint.

The easiest path is editing `~/.config/rclone/rclone.conf` directly. Add a new remote:

```ini
[rustfs]
type = s3
provider = Other
access_key_id = your-access-key
secret_access_key = your-secret-key
endpoint = https://rustfs.<tailnet-name>.ts.net:9000
```

Replace `your-access-key` and `your-secret-key` with the values from your RustFS `.env` file. Replace `<tailnet-name>` with your actual tailnet name.

`provider = Other` tells rclone this is a generic S3 endpoint, not AWS or a named provider. This disables some AWS-specific signing behavior that would cause requests to fail against RustFS.

---

If you prefer the interactive setup, run `rclone config` instead:

```
n) New remote
name> rustfs
Storage> s3
provider> Other
env_auth> false
access_key_id> your-access-key
secret_access_key> your-secret-key
region> (leave blank)
endpoint> https://rustfs.<tailnet-name>.ts.net:9000
location_constraint> (leave blank)
acl> private
```

Accept defaults for the remaining prompts.

## Test the rclone remote

List your buckets:

```bash
rclone lsd rustfs:
```

You should see the bucket you created in the console. If you see an error about SSL or connection refused, confirm that:

- Your device is connected to Tailscale
- The `rustfs` machine appears in your tailnet admin panel as connected
- The endpoint URL and port (9000) are correct

List the contents of the bucket:

```bash
rclone ls rustfs:backups
```

Run a sync:

```bash
rclone sync /some/local/path rustfs:backups/subpath
```

This is the same syntax as syncing to B2 — only the remote name and bucket path change. Existing rclone scripts that used `b2:` remotes can be updated by swapping the remote name.

## Configure vivo·keep

<a href="https://vivo.plantolive.app/" target="_blank" rel="noopener noreferrer">Vivo·keep</a> uses restic under the hood. Restic has native S3 support — it treats any S3-compatible endpoint the same as AWS S3.

The remote URL format for restic S3:

```
s3:https://rustfs.<tailnet-name>.ts.net:9000/bucket-name
```

### Update the vivo config

Open your vivo config:

```bash
vivo config edit
```

Add the RustFS remote to your task. Replace or extend the existing B2 remote:

```kdl
tasks {
    task "backup" {
        backup {
            repo "$HOME/.local/share/restic/main"
            directory "$HOME"

            retention {
                daily   7
                weekly  5
                monthly 12
                yearly  2
            }

            remote "rustfs:https://rustfs.<tailnet-name>.ts.net:9000/backups/restic/main" {
                credentials "rustfs"
            }
        }
    }
}
```

The `rustfs:` prefix tells vivo to use its RustFS backend (via mc, AWS CLI, or rclone) to sync the restic repository files to the bucket — the same pattern as the `b2:` backend. The path is fully slash-separated: `rustfs:<endpoint>/<bucket>/<path-within-bucket>`.

### Add the credentials

Open your secrets file:

```bash
vivo secrets edit
```

Add a `rustfs` credentials block:

```yaml
restic_password: "your-restic-repo-password"
credentials:
  rustfs:
    AWS_ACCESS_KEY_ID: "your-access-key"
    AWS_SECRET_ACCESS_KEY: "your-secret-key"
```

Restic uses the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variable names for S3 authentication, even against non-AWS endpoints. Vivo decrypts these at runtime and injects them as environment variables before calling restic.

The `rustfs` key under `credentials` must match the `credentials "rustfs"` line in your KDL config.

### Verify and run

```bash
vivo doctor
```

`vivo doctor` will attempt to reach the configured remote and verify credentials. If the RustFS endpoint is unreachable, check that the device running vivo is connected to Tailscale.

Run a dry-run to confirm the pipeline looks correct:

```bash
vivo --dry-run
```

Then run the full backup:

```bash
vivo
```

Vivo will snapshot your directories, verify the local repository, apply retention, and sync to RustFS over Tailscale. The transfer is encrypted in transit by Tailscale's WireGuard layer, and encrypted at rest by restic.

---

You can run both a B2 remote and a RustFS remote in the same vivo task — just add both `remote` blocks. Vivo syncs to all configured remotes in sequence. Local hardware for fast recovery, B2 for offsite redundancy.

The next article in this series covers <a href="/article/homelab/tailscale-synology-acls">Tailscale ACLs for homelab services</a> — controlling which tailnet devices can reach RustFS and defining access policies by tag.
