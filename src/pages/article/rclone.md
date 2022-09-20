---
setup: |
  import Layout from '../../layouts/BlogPost.astro'
publishDate: 01 Nov 2019
title: "Rclone - rsync for cloud storage"
author: dantuck
description: |
  Rclone is a really cool command line tool that can sync files and directories too and from many sources. A full list of sources can be found on their Rclone.
---

Rclone is a really cool command line tool that can sync files and directories too and from many sources. A full list of sources can be found on their [official website](https://rclone.org/ "Rclone").

I personally use it for syncing local backups to [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html "Backblaze B2").

### Installation

There are a few ways to [install](https://rclone.org/install/ "install") but I prefer the script install:

To install rclone on Linux/macOS/BSD systems, run:
```bash
    $ curl https://rclone.org/install.sh | sudo bash
```
### Configuration

The easiest way to configure and get up and running is by:
```bash
    $ rclone config
```
And for my case I follow the [Backblaze B2](https://rclone.org/b2/ "Backblaze B2 steps") steps:

_(Steps extracted from Restic's site)_
```bash
    No remotes found - make a new one
    n) New remote
    q) Quit config
    n/q> n
    name> remote
    Type of storage to configure.
    Choose a number from below, or type in your own value
    [snip]
    XX / Backblaze B2
    \ "b2"
    [snip]
    Storage> b2
    Account ID or Application Key ID
    account> 123456789abc
    Application Key
    key> 0123456789abcdef0123456789abcdef0123456789
    Endpoint for the service - leave blank normally.
    endpoint>
    Remote config
    --------------------
    [remote]
    account = 123456789abc
    key = 0123456789abcdef0123456789abcdef0123456789
    endpoint =
    --------------------
    y) Yes this is OK
    e) Edit this remote
    d) Delete this remote
    y/e/d> y
```
This remote is called `remote` and can now be used like this

See all buckets
```bash
    $ rclone lsd remote:
```
Create a new bucket
```bash
    $ rclone mkdir remote:bucket
```
List the contents of a bucket
```bash
    $ rclone ls remote:bucket
```
Sync /home/local/directory to the remote bucket, deleting any excess files in the bucket.
```bash
    $ rclone sync /home/local/directory remote:bucket
```

### Disclosures

Anything you sync without encryption has the potential of being publicly available and read in clear text. I recommend using encryption on any data that is synced to a publicly accessible storage.

Additionally, when using B2 storage please understand their access rules so that you can keep the repository private.