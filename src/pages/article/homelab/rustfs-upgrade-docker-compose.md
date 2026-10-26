---
layout: '../../../layouts/BlogPost.astro'
publishDate: 17 Nov 2026 14:00 UTC
title: "Upgrade RustFS in Docker Compose on Synology"
author: dantuck
series: rustfs-on-synology
seriesPart: 6
description: |
    Upgrade RustFS on a Synology NAS without losing data. Pin an image tag, back up first, recreate the container, check readiness, and know how to roll back.
tags:
- self-hosting
- homelab
- tools
---

> This article follows the RustFS documentation. I have not yet run these steps on my own NAS, so treat every command here as untested until this note is gone.

The compose file in <a href="/article/homelab/rustfs-synology-tailscale">part 1</a> uses `rustfs/rustfs:latest` and `tailscale/tailscale:latest`. That is fine for a first install. It is a poor basis for upgrades, because `latest` moves whenever someone pulls, and you cannot say what you were running when something broke.

RustFS is still publishing beta tags, so this matters more than usual. This article follows the <a href="https://docs.rustfs.com/operations/upgrade/container" target="_blank" rel="noopener noreferrer">official container upgrade guide</a>, adapted to the sidecar layout.

## Before you touch anything

The guide opens with three pre-upgrade checks:

1. Read the release notes for the version you are moving to, and choose an explicit image tag. The <a href="https://github.com/rustfs/rustfs/releases" target="_blank" rel="noopener noreferrer">RustFS releases page</a> is the place to look.
2. Record the current image and keep your original compose configuration.
3. Confirm RustFS is healthy before you start. If it is already broken, an upgrade will not tell you whether it made things worse.

In this stack, the health check from the NAS is:

```bash
curl -fsS http://localhost:9541/health/ready
```

Port 9541 is the host mapping from part 1. The guide uses 9000 because its example runs RustFS directly.

Then take a backup. The data lives in the `s3data` folder on the NAS, which part 1 mounts as a bind mount. Run your normal backup of whatever RustFS holds, and confirm the last run succeeded:

```bash
vivo status
```

If RustFS is itself a backup target, that backup is one copy of the data. This is the moment to be glad you also sync to B2.

## Save the current state

From the project folder, for example `/volume1/docker/rustfs`:

```bash
docker compose config > docker-compose.resolved.yaml
docker compose images rustfs
```

The first command saves the fully resolved configuration. The second prints the image you are running. Write that tag down. It is your rollback target. If it says `latest`, work out which release that is from the releases page before you change anything, because you need a real tag to go back to.

## Pin the tag and upgrade

Edit `docker-compose.yml` and replace `latest` with the target version on the `rustfs` service. Leave volumes, environment and ports alone:

```yaml
services:
  rustfs:
    image: rustfs/rustfs:<target-version>
```

Then validate, pull and recreate only that service:

```bash
docker compose config --quiet
docker compose pull rustfs
docker compose up -d --no-deps rustfs
```

The `--no-deps` flag leaves the Tailscale container running. You can run these over SSH on DSM, or from Container Manager's project screen. Check which of the two your DSM version supports, since DSM ships Docker tooling that varies between releases.

Verify the replacement:

```bash
docker compose ps rustfs
docker compose logs --tail=100 rustfs
curl -fsS http://localhost:9541/health/ready
```

Then check from the outside. A readiness probe on the NAS proves the container is up. It does not prove the clients can reach it:

```bash
vivo doctor
vivo verify --remotes --sample 1%
```

## Upgrading the Tailscale container

This one needs more care. RustFS uses `network_mode: service:ts-rustfs`, which means it shares the Tailscale container's network namespace. When Docker recreates the Tailscale container, the RustFS container is left attached to a network that no longer exists. Plan to recreate both, Tailscale first:

```bash
docker compose pull ts-rustfs
docker compose up -d ts-rustfs rustfs
```

Tailscale keeps its registered identity in `ts/state/`, so the node comes back as `rustfs` and does not need a new auth key. Confirm with `tailscale status` from another device that it is online before you test anything else.

---

## Data loss warnings

The guide is blunt about this, and so am I. Do not remove the directory mounted at `/data`. In this stack that is `s3data`. Two commands from the guide are never part of an upgrade:

- `docker compose down -v`
- `docker volume rm`

Part 1 uses a bind mount, not a named volume, so those commands will not delete `s3data`. A careless `rm -rf` in the project folder will. The upgrade needs none of them.

## Roll back

The documented rollback is to put the previous image tag back and recreate the service:

```bash
docker compose pull rustfs
docker compose up -d --no-deps rustfs
curl -fsS http://localhost:9541/health/ready
```

Restore the earlier `image:` line in `docker-compose.yml` first, which is why you saved the resolved config.

The guide does not say whether an older version can read data that a newer version wrote. Treat the release notes as the answer to that question, and read them before you upgrade, not after. If a release changes how data is stored, rollback may mean restoring from backup instead.

## A habit worth keeping

Upgrade one thing at a time, on a day you have time to watch it. Pin the tag, change it, check readiness, check a client, and only then close the terminal. If it all passes, the next upgrade is the same five steps.
