---
layout: '../../../layouts/BlogPost.astro'
publishDate: 03 Nov 2026 14:00 UTC
title: "RustFS Access Keys and Bucket Policies per Client"
author: dantuck
series: rustfs-on-synology
seriesPart: 4
description: |
    Stop sharing RustFS root credentials. Create a separate access key and a bucket-scoped policy for each client, so one leaked key exposes one bucket.
tags:
- self-hosting
- homelab
- tools
---

In <a href="/article/homelab/rustfs-synology-tailscale">part 1</a> you set `RUSTFS_ACCESS_KEY` and `RUSTFS_SECRET_KEY` in the `.env` file. Those are root credentials. Every client in this series, rclone and vivo·keep included, has been using them. That works. It also means one leaked laptop gives an attacker every bucket.

This article gives each client its own access key and a policy that limits it to one bucket.

## Root is for bootstrapping

The RustFS <a href="https://docs.rustfs.com/en/security-compliance/iam" target="_blank" rel="noopener noreferrer">IAM documentation</a> says to use root credentials only to bootstrap the deployment, then create IAM users and service accounts for day-to-day work. Root bypasses IAM identity policies, although a bucket policy can still deny its S3 requests. Use it to sign in to the console and create users. Do not hand it to an application.

<a href="/article/homelab/tailscale-synology-acls">Part 3</a> controls which devices can reach RustFS. This part controls what each of them can do once they arrive. The two layers work together.

## Write the policy first

A policy is JSON with a `Version` of `2012-10-17` and a list of statements. Each statement has an `Effect`, an `Action` and a `Resource`. The <a href="https://docs.rustfs.com/administration/iam/policies" target="_blank" rel="noopener noreferrer">policy documentation</a> shows a read-only example for one bucket. Bucket-level actions and object-level actions need separate statements, because they use different resources.

Here is a read and write policy for a bucket named `filecabinet`, which is what a backup client needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::filecabinet"]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": ["arn:aws:s3:::filecabinet/*"]
    }
  ]
}
```

The documentation example grants `GetObject` and `PutObject`. I added `DeleteObject` because a backup client that prunes old snapshots removes objects. If you do not run retention against this bucket, drop it.

Start narrow. If a client fails with an access denied error, widen the policy by one action and try again. That is slower than granting everything and far safer.

## Create the user and attach the policy

The documentation describes users, groups and policies under **Identity** in the console, and through the admin API. It does not give click-by-click steps for creating a policy in the console, so look under **Identity** for the policy and user screens. If you prefer the API, the calls are documented:

- `PUT /rustfs/admin/v3/add-canned-policy?name=<policy>` creates a policy from the JSON body.
- `PUT /rustfs/admin/v3/add-user?accessKey=<name>` creates a user.
- `PUT /rustfs/admin/v3/set-user-or-group-policy` binds a policy to a user or group.

Admin calls must be signed by a credential whose policies allow the action. Start with root, since nothing else exists yet.

Name the user after the client, not the person. `vivo-macbook` tells you what leaked. `daniel` does not.

## Create an access key for the client

Access keys live under **Access Keys** in the console. The <a href="https://docs.rustfs.com/administration/iam/access-token" target="_blank" rel="noopener noreferrer">access key documentation</a> lists the steps:

1. Sign in to the console and select **Access Keys**.
2. Click **Add Access Key**.
3. Enter an expiration, a name and a description, then submit.
4. Copy or export the key on the next page. The documentation recommends saving it there.

Set an expiration if the client is temporary. The page does not say what permissions a new key inherits, so do not assume. Test it, as described next.

## Prove the limits work

A policy you have not tried to break is a guess. Add a second rclone remote using the new key, next to the one from <a href="/article/homelab/rustfs-rclone-remote">part 2</a>:

```ini
[rustfs-filecabinet]
type = s3
provider = Other
access_key_id = the-new-key
secret_access_key = the-new-secret
endpoint = http://rustfs.<tailnet-name>.ts.net:9000
```

Then try one thing that should work and one that should not:

```bash
rclone ls rustfs-filecabinet:filecabinet --max-depth 1   # should list
rclone ls rustfs-filecabinet:backups --max-depth 1       # should be denied
```

If the second command lists files, the key has more access than the policy gives it. Stop and find out why before you move any client over.

---

## Move vivo·keep over

Swap the credentials in the secrets file. The `rustfs` block from part 2 keeps its name, and only the values change:

```bash
vivo secrets edit
```

```yaml
credentials:
  rustfs:
    AWS_ACCESS_KEY_ID: "the-new-key"
    AWS_SECRET_ACCESS_KEY: "the-new-secret"
```

Then check that the pipeline still works end to end:

```bash
vivo doctor
vivo --dry-run
```

If `vivo doctor` reports that the remote is unreachable, check the key before you check Tailscale. A scoped key that is missing an action looks like a broken connection.

## Rotate a key

Rotation is the same steps in order. Create the replacement key, update `vivo secrets edit`, run `vivo doctor`, then delete the old key from **Access Keys**. Deleting last means a typo costs you a retry, not an outage.

Do this once on purpose, before you need it in a hurry.
