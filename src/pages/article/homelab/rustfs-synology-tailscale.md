---
layout: '../../../layouts/BlogPost.astro'
publishDate: 11 Jun 2026
title: "RustFS on Synology NAS with Tailscale Sidecar"
author: dantuck
description: |
    Install RustFS on a Synology NAS using Container Manager with a Tailscale sidecar for private, S3-compatible object storage accessible over your tailnet.
tags:
- self-hosting
- homelab
- tools
---

<a href="https://rustfs.com" target="_blank" rel="noopener noreferrer">RustFS</a> is a high-performance, S3-compatible object storage server written in Rust. Running it on a Synology NAS gives you a private S3 endpoint on hardware you already own. This guide walks through setting it up in Container Manager using a Tailscale sidecar — so the service is reachable across your tailnet without exposing a port to the internet.

## What is the Tailscale sidecar pattern

A sidecar container shares its network namespace with another container. Instead of RustFS binding to the NAS host network, it binds to Tailscale's virtual network interface. All traffic in and out of RustFS goes through Tailscale.

This means RustFS is never directly reachable from the internet. It is only accessible to devices on your tailnet. No firewall rules, no port forwarding, no reverse proxy needed.

The compose file achieves this with `network_mode: service:ts-rustfs` on the RustFS container. It tells Docker to share the network namespace of the `ts-rustfs` container entirely.

## What you need

- Synology NAS running DSM 7.x
- <a href="https://www.synology.com/en-global/dsm/packages/ContainerManager" target="_blank" rel="noopener noreferrer">Container Manager</a> installed from Package Center
- A <a href="https://tailscale.com" target="_blank" rel="noopener noreferrer">Tailscale</a> account
- SSH access to the NAS, or access via File Station

## Project folder structure

Container Manager's Project feature reads a `docker-compose.yml` from a directory on the NAS. All paths in the compose file are relative to that directory.

The structure for this project:

```
rustfs/
├── docker-compose.yml
├── .env
├── ts/
│   ├── state/
│   └── config/
│       └── serve-config.json
└── s3data/
```

- `ts/state/` — Tailscale persists its node identity here. If this directory is empty on first run, Tailscale registers a new node using the auth key.
- `ts/config/` — holds the Tailscale Serve configuration.
- `s3data/` — RustFS stores all object data here. This is the directory to back up.

## Create the directories

SSH into the NAS and run:

```bash
mkdir -p /volume1/docker/rustfs/ts/state
mkdir -p /volume1/docker/rustfs/ts/config
mkdir -p /volume1/docker/rustfs/s3data
```

Replace `/volume1/docker/` with your actual shared folder path. Container Manager projects are conventionally placed in a `docker` shared folder, but any writable path works.

The RustFS image runs as UID 10001 by default. Directories created by root over SSH will not be writable by that user. Either fix ownership after creation:

```bash
chown -R 10001:10001 /volume1/docker/rustfs/s3data
```

Or keep `user: root` in the compose file (shown below) to have the container run as root instead. Both approaches work; the chown approach is cleaner if you want to drop the root override later.

## The .env file

Secrets go in a `.env` file next to `docker-compose.yml`. Docker Compose reads this file automatically and substitutes variables throughout the compose file.

Create `/volume1/docker/rustfs/.env`:

```ini
RUSTFS_ACCESS_KEY=your-access-key
RUSTFS_SECRET_KEY=your-secret-key
TS_AUTHKEY=tskey-auth-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx
```

- `RUSTFS_ACCESS_KEY` and `RUSTFS_SECRET_KEY` are the credentials any S3 client will use to authenticate. Choose long, random values — treat them like passwords.
- `TS_AUTHKEY` is a Tailscale auth key. See the next section for how to generate one.

Do not commit this file to version control.

## Get a Tailscale auth key

Log in to the <a href="https://login.tailscale.com/admin/settings/keys" target="_blank" rel="noopener noreferrer">Tailscale admin console</a> and go to **Settings → Keys**.

Generate an auth key with these settings:

- **Reusable**: off — one-time use is safer. Tailscale persists its registered state in `ts/state/` after first startup, so the key is only consumed once.
- **Ephemeral**: off — you want this node to persist in your tailnet between container restarts.
- **Pre-approved**: on — automatically authorizes the device if your tailnet requires device approval. For most personal tailnets this has no effect (devices register freely), but enabling it is harmless and avoids a manual approval step if you later turn device approval on.
- **Tags**: optional, but tagging it `tag:homelab` or similar helps with ACL policies later.

Copy the generated key and set it as `TS_AUTHKEY` in your `.env` file.

## The Tailscale Serve config

The Tailscale container uses `TS_SERVE_CONFIG` to configure <a href="https://tailscale.com/kb/1242/tailscale-serve" target="_blank" rel="noopener noreferrer">Tailscale Serve</a>. Serve acts as an internal HTTPS reverse proxy, handling TLS termination automatically using your tailnet's managed certificates.

Create `/volume1/docker/rustfs/ts/config/serve-config.json`:

```json
{
  "TCP": {
    "443": {
      "HTTPS": true
    }
  },
  "Web": {
    "${TS_CERT_DOMAIN}:443": {
      "Handlers": {
        "/": {
          "Proxy": "http://127.0.0.1:9001"
        }
      }
    }
  }
}
```

This proxies the RustFS web console (port 9001) over HTTPS at `https://rustfs.<tailnet-name>.ts.net`. Tailscale provisions the certificate automatically — no Certbot, no Let's Encrypt setup, no domain ownership verification required.

The S3 API runs on port 9000. S3 clients connect to it directly at `http://rustfs.<tailnet-name>.ts.net:9000`. Tailscale Serve only terminates TLS for ports explicitly listed in the serve config — port 9000 gets no automatic certificate. The connection is still private because it travels over the encrypted WireGuard tunnel; it just uses plain HTTP inside that tunnel. If your S3 client requires HTTPS, add a TCP TLS entry for port 9000 to the serve config.

## The docker-compose.yml

Create `/volume1/docker/rustfs/docker-compose.yml`:

```yaml
services:
  ts-rustfs:
    image: tailscale/tailscale:latest
    ports:
      - 9541:9000
      - 9540:9001
    container_name: ts-rustfs
    hostname: rustfs
    environment:
      - TS_AUTHKEY=${TS_AUTHKEY}
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_USERSPACE=false
      - TS_SERVE_CONFIG=/config/serve-config.json
    volumes:
      - ./ts/state:/var/lib/tailscale
      - ./ts/config:/config
    devices:
      - /dev/net/tun:/dev/net/tun
    cap_add:
      - net_admin
      - net_raw
    restart: unless-stopped

  rustfs:
    image: rustfs/rustfs:latest
    container_name: rustfs-server
    user: root
    network_mode: service:ts-rustfs
    depends_on:
      - ts-rustfs
    environment:
      - RUSTFS_VOLUMES=/data
      - RUSTFS_CONSOLE_CORS_ALLOWED_ORIGINS="*"
      - RUSTFS_CONSOLE_ENABLE=true
      - RUSTFS_ACCESS_KEY=${RUSTFS_ACCESS_KEY}
      - RUSTFS_SECRET_KEY=${RUSTFS_SECRET_KEY}
    volumes:
      - ./s3data:/data
    restart: unless-stopped
```

A few things worth understanding:

**`hostname: rustfs`** — this becomes the Tailscale machine name. It will appear as `rustfs` in your tailnet admin panel and resolves via MagicDNS as `rustfs.<tailnet-name>.ts.net`.

**`TS_USERSPACE=false`** — uses kernel networking via `/dev/net/tun` rather than Tailscale's userspace mode. This requires the `net_admin` capability and access to the `tun` device, both provided in the compose file. Kernel mode is more reliable for long-running services.

**`network_mode: service:ts-rustfs`** — RustFS shares the Tailscale container's entire network interface. RustFS ports 9000 and 9001 are bound to the Tailscale network, not the NAS host. This is what makes the sidecar pattern work.

**`ports` on `ts-rustfs`** — the `9541:9000` and `9540:9001` mappings expose RustFS on the NAS local network as well. This is optional. If you only want access over Tailscale, remove these port mappings entirely.

**`depends_on`** — ensures Tailscale starts before RustFS. Without this, RustFS could start before the shared network namespace is ready and fail to bind.

**`user: root`** — overrides the image default of UID 10001 so RustFS can write to the `s3data` directory created by root on the NAS. If you ran `chown -R 10001:10001 s3data` as described above, remove this line and the container will run as the intended non-root user.

**`TS_AUTHKEY=${TS_AUTHKEY}`** — references the `.env` variable. The original example hardcodes the key inline; using a variable keeps the key out of the compose file itself.

## Create the project in Container Manager

1. Open **Container Manager** in DSM.
2. Go to **Project** → **Create**.
3. Give the project a name: `rustfs`.
4. Set the **path** to the folder containing `docker-compose.yml` — e.g. `/volume1/docker/rustfs`.
5. Container Manager will detect the compose file. Review it, then click **Next**.
6. On the portal settings screen, skip web portal configuration — Tailscale handles routing. Click **Next**.
7. Click **Done**. Container Manager pulls the images and starts both containers.

The first startup takes a few minutes while `tailscale/tailscale` and `rustfs/rustfs` download. Subsequent restarts are fast.

## Verify the setup

Once both containers show as running, check the Tailscale container logs to confirm it connected:

1. In Container Manager, select the `ts-rustfs` container.
2. Open **Details** → **Log**.
3. Look for a line containing `[control] Connected` or `Login complete`.

If you see `To authenticate, visit:` followed by a URL, the auth key did not work. Double-check the `TS_AUTHKEY` value in `.env` — it must be the full key starting with `tskey-auth-`.

In the <a href="https://login.tailscale.com/admin/machines" target="_blank" rel="noopener noreferrer">Tailscale admin panel</a>, a new machine named `rustfs` should appear within a few seconds of the containers starting.

## Access the RustFS console

With both containers running and Tailscale connected, open a browser on any device in your tailnet:

```
https://rustfs.<tailnet-name>.ts.net
```

Replace `<tailnet-name>` with your actual tailnet name — visible in the Tailscale admin panel under the machine list. If MagicDNS is enabled (it is by default on new tailnets), this hostname resolves automatically on all tailnet devices.

Log in with the `RUSTFS_ACCESS_KEY` and `RUSTFS_SECRET_KEY` values from your `.env` file. The RustFS web console will open to the bucket management UI.

---

The S3 API endpoint for use with any S3-compatible client:

```
http://rustfs.<tailnet-name>.ts.net:9000
```

Or, from the local LAN (if you kept the port mappings):

```
http://<nas-ip>:9541
```

The next article in this series covers <a href="/article/homelab/rustfs-rclone-remote">pointing rclone and vivo·keep at this RustFS endpoint</a> as a local S3 remote — a self-hosted alternative to Backblaze B2.
