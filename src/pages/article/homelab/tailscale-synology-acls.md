---
layout: '../../../layouts/BlogPost.astro'
publishDate: 15 Jun 2026
title: "Tailscale on Synology DSM with ACLs for Homelab Services"
author: dantuck
series: rustfs-on-synology
seriesPart: 3
description: |
    Set up Tailscale on a Synology NAS with MagicDNS and ACL policies to control which tailnet devices can reach self-hosted services like RustFS.
tags:
- self-hosting
- homelab
- tools
---

Running a service like <a href="/article/homelab/rustfs-synology-tailscale">RustFS on your NAS with a Tailscale sidecar</a> is only half the picture. By default, every device on your tailnet can reach every other device. That is fine for a small personal setup. Once you start running multiple services or sharing your tailnet with other people, you want to say precisely which machines can talk to which — and which ports they can use.

This article covers installing Tailscale on Synology DSM natively, understanding MagicDNS hostname resolution, and writing ACL policies to lock down homelab services.

## Two ways Tailscale runs on a Synology NAS

Before going further, there is a distinction worth making.

The <a href="/article/homelab/rustfs-synology-tailscale">previous article</a> ran Tailscale as a Docker container alongside RustFS. That container joins your tailnet as its own machine — `rustfs` — and routes traffic to RustFS via the sidecar network. It is isolated to that service.

This article covers installing the Tailscale package on DSM itself. This registers the NAS as a separate tailnet machine — typically named after the NAS hostname — and makes every service on the NAS reachable via that one machine's Tailscale IP.

You can run both. The sidecar container for RustFS gets its own tailnet IP and MagicDNS name. The NAS itself gets a second tailnet IP for DSM, SSH, and other services. They are separate nodes and can have separate ACL rules.

## Install Tailscale on DSM

Tailscale maintains an official package for Synology DSM.

1. Open **Package Center** in DSM.
2. Search for **Tailscale** — it is available directly in the standard Package Center catalog.
3. Install it, then open Tailscale from the main menu or the Package Center's **Installed** list.
4. Click **Log in** and authenticate with your Tailscale account.

If Tailscale does not appear in your Package Center (older DSM versions may not carry it), download the `.spk` file for your NAS architecture from <a href="https://pkgs.tailscale.com/stable/" target="_blank" rel="noopener noreferrer">pkgs.tailscale.com/stable</a> and use **Package Center → Manual Install** to upload it.

The NAS will appear in your <a href="https://login.tailscale.com/admin/machines" target="_blank" rel="noopener noreferrer">tailnet admin panel</a> as a new machine. It uses the NAS hostname by default — you can rename it in the admin panel if needed.

## How MagicDNS works

<a href="https://tailscale.com/kb/1081/magicdns" target="_blank" rel="noopener noreferrer">MagicDNS</a> is Tailscale's automatic DNS system. When enabled, every tailnet machine gets a stable hostname that resolves to its Tailscale IP on all devices in the tailnet.

Hostname format: `<machine-name>.<tailnet-name>.ts.net`

For example:
- `diskstation.yourtailnet.ts.net` — the NAS (installed via Package Center)
- `rustfs.yourtailnet.ts.net` — the RustFS sidecar container

MagicDNS is enabled by default for new tailnets. You can verify it under **DNS** in the admin panel. The **Search domain** setting lets you use short hostnames (`diskstation`) in addition to the full `.ts.net` names.

MagicDNS uses the machine name you set in the admin panel, not the Docker container hostname — though for sidecar containers, the `hostname:` field in the compose file becomes the machine name when it registers.

## Tailscale ACLs

By default, Tailscale uses an allowlist called the <a href="https://tailscale.com/kb/1018/acls" target="_blank" rel="noopener noreferrer">ACL policy</a>. The default policy allows all devices in the tailnet to reach all other devices on all ports. Most people run on the default and never touch it. But writing explicit rules is worth understanding.

ACL policies are JSON (with comments). Edit them in the admin panel under **Access Controls**.

### The default policy

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["*"],
      "dst": ["*:*"]
    }
  ]
}
```

`"*:*"` means any machine, any port. This is the open default.

### Locking down RustFS with tags

Tags let you group machines by role and write rules against roles instead of specific IPs or hostnames. This is useful because IPs change and machine names can be reused.

First, define the tags you want to use. Tags are declared under `tagOwners` — this specifies which users can apply the tag:

```json
{
  "tagOwners": {
    "tag:homelab": ["autogroup:admin"],
    "tag:client": ["autogroup:admin"]
  }
}
```

`autogroup:admin` means only tailnet admins can tag machines with these tags.

Now write the ACL rules:

```json
{
  "tagOwners": {
    "tag:homelab": ["autogroup:admin"],
    "tag:client": ["autogroup:admin"]
  },
  "acls": [
    {
      "action": "accept",
      "src": ["tag:client"],
      "dst": ["tag:homelab:9000", "tag:homelab:9001", "tag:homelab:443"]
    }
  ]
}
```

This rule says: devices tagged `tag:client` can reach devices tagged `tag:homelab` on ports 9000 (S3 API), 9001 (RustFS console), and 443 (Tailscale Serve HTTPS).

With this policy, a device that has neither tag cannot reach RustFS at all — even if it is on the tailnet.

### Apply tags to machines

In the <a href="https://login.tailscale.com/admin/machines" target="_blank" rel="noopener noreferrer">admin panel</a>, find the `rustfs` machine (the Docker sidecar container from the first article). Click the three-dot menu → **Edit ACL tags** → add `tag:homelab`.

Tag your laptops, desktops, and phones as `tag:client`.

Once tagged, the ACL rules apply automatically. Test from a tagged client device:

```bash
curl https://rustfs.<tailnet-name>.ts.net:9000
```

Then test from an untagged device — the connection should be refused.

### SSH access to the NAS

If you also want to SSH to the NAS over Tailscale, add a rule for port 22:

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["tag:client"],
      "dst": ["tag:homelab:9000", "tag:homelab:9001", "tag:homelab:443", "tag:homelab:22"]
    }
  ]
}
```

Or use <a href="https://tailscale.com/kb/1193/tailscale-ssh" target="_blank" rel="noopener noreferrer">Tailscale SSH</a> instead of opening port 22 in your ACL — Tailscale SSH handles authentication via Tailscale identity and removes the need to manage SSH keys separately.

## Checking what is reachable

The Tailscale admin panel shows active connections and which ACL rules matched them. The **Logs** section (under the **admin panel**) shows per-connection auth decisions if you need to debug a blocked connection.

From any tailnet device, `tailscale status` shows the full list of machines and their IPs:

```bash
tailscale status
```

And `tailscale ping <machine-name>` tests reachability:

```bash
tailscale ping rustfs
```

---

With Tailscale installed on DSM, MagicDNS resolving your homelab services by name, and ACL policies controlling access by role, the network layer for your self-hosted infrastructure is in place. The <a href="/article/homelab/rustfs-rclone-remote">previous article</a> covered pointing rclone and vivo·keep at RustFS — that setup now sits behind a policy that limits which devices can actually reach the S3 endpoint.
