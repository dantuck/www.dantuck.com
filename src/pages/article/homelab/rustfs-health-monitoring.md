---
layout: '../../../layouts/BlogPost.astro'
publishDate: 10 Nov 2026 14:00 UTC
title: "Monitor RustFS on Synology: Health Checks and Alerts"
author: dantuck
series: rustfs-on-synology
seriesPart: 5
description: |
    Know when RustFS on your Synology NAS is unhealthy before a backup fails. A readiness probe, client-side checks, and the OpenTelemetry path for metrics.
tags:
- self-hosting
- homelab
- tools
---

> This article follows the RustFS documentation. I have not yet run these steps on my own NAS, so treat every command here as untested until this note is gone.

A self-hosted backup target has a quiet failure mode. It stops working, nothing tells you, and you find out when you need a restore. This article sets up three layers of checking for the RustFS stack from <a href="/article/homelab/rustfs-synology-tailscale">part 1</a>, from cheapest to heaviest.

## Layer one: the readiness probe

RustFS exposes a readiness endpoint. The <a href="https://docs.rustfs.com/operations/monitoring" target="_blank" rel="noopener noreferrer">monitoring documentation</a> says `GET /health/ready` returns 200 when the node is ready. The upgrade guide uses it the same way:

```bash
curl -fsS http://localhost:9000/health/ready
```

In this stack RustFS shares the Tailscale container's network, and the compose file maps that container's port 9000 to 9541 on the NAS. So from the NAS itself, the command is:

```bash
curl -fsS http://localhost:9541/health/ready
```

If you removed the `ports` mappings in part 1 to keep RustFS tailnet-only, that port is not open on the host. Run the probe from another tailnet device against the RustFS address instead.

The `-f` flag makes `curl` exit non-zero on an HTTP error, and `-sS` keeps it quiet unless something fails. That exit code is all a scheduler needs.

## Run it on a timer

DSM has a Task Scheduler under **Control Panel**. Create a user-defined script that runs every few minutes:

```bash
#!/bin/sh
curl -fsS --max-time 10 http://localhost:9541/health/ready >/dev/null
```

Task Scheduler can send you the run details by email when a script ends with an error. Turn that on and the readiness probe becomes an alert. The email settings are under the task's **Task Settings** tab.

This catches RustFS being down or not ready. It does not catch the Tailscale side being unreachable from your other devices, because the probe runs on the NAS itself. For that, run the same check from a laptop:

```bash
tailscale ping rustfs
```

Part 3 covers `tailscale ping` and the ACLs that decide who can reach the node.

---

## Layer two: ask the clients

The server being healthy is half of the question. The other half is whether your backups are landing. The cheapest check is on the client that writes them. If you use vivo·keep, `vivo status` reports when each remote last synced and warns when the newest sync is older than 48 hours:

```bash
vivo status --max-age 36
```

A remote that is up but not receiving data shows up here and nowhere else. To prove the data is readable, ask vivo to read some back from the RustFS remote:

```bash
vivo verify --remotes --sample 1%
```

Keep the sample small. Verifying a remote downloads data, so a large sample costs time and bandwidth. The command exits non-zero when a repository fails, which makes it usable from a scheduled job.

If a backup run fails, vivo can also run an `on-failure` command, and it passes the error message in `$VIVO_ERROR`. That is enough for a desktop or push notification. The <a href="/article/vivo-keep-backup-tasks-schedules-restore">vivo day-to-day article</a> shows the config.

## Layer three: metrics

If you want graphs and alert rules, RustFS supports them, with one catch. The monitoring documentation states that RustFS does not serve a Prometheus `/metrics` scrape endpoint. It pushes telemetry over OTLP to an OpenTelemetry Collector, and Prometheus scrapes the Collector.

```
RustFS --OTLP--> OpenTelemetry Collector --> Prometheus --> Grafana
```

You point RustFS at the Collector with an environment variable on the `rustfs` service:

```yaml
environment:
  - RUSTFS_OBS_ENDPOINT=http://otel-collector:4318
```

Port 4318 is the Collector's OTLP over HTTP receiver. The Collector exposes the metrics for Prometheus on port 8889 through its `prometheus` exporter, and Prometheus scrapes that port. The documentation lists related variables for per-signal endpoints, toggles and the export interval, such as `RUSTFS_OBS_METER_INTERVAL`.

Other pages and posts claim RustFS also serves Prometheus metrics directly on port 9000. The official documentation says otherwise, so I follow the documentation.

This stack is heavy. A Collector, Prometheus and Grafana together are a lot to run on a NAS for a few buckets. The RustFS repository ships an `observability` profile with all of them if you decide it is worth it. Two more things to check in your setup:

- RustFS shares the Tailscale container's network. Whether `otel-collector` resolves from there depends on which Docker network that container joins. Put the Collector in the same compose project, then test it.
- If no `rustfs_*` series appear, the documentation's order of checks is: `RUSTFS_OBS_ENDPOINT` is set, the Collector is reachable, and Prometheus scrapes port 8889.

If you do run the stack, the documentation suggests these alerts:

| Alert | Signal |
|---|---|
| Node not ready for 2 minutes | `rustfs_runtime_readiness_ready == 0` |
| Restart loop | `increase(rustfs_start_total[10m]) > 3` |
| Scanner stalled | `increase(rustfs_scanner_cycles_total[24h]) == 0` |

Per-disk health is not an OTLP metric. For disks, use DSM's own Storage Manager alerts, which already watch the drives.

---

I would start with layers one and two. A readiness probe plus `vivo status` answers the two questions that matter, whether the server is up and whether data is arriving, and neither needs a monitoring stack.
