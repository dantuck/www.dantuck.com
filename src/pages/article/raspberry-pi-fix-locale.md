---
layout: '../../layouts/BlogPost.astro'
publishDate: 26 Sept 2018
title: "Raspberry Pi: Fixing your Locale"
author: dantuck
tags:
- raspberrypi
description: |
    Fixing your Locale on Raspberry Pi
---

After a fresh install of Raspberry Pi OS (called Raspbian when I first wrote this) you may see the following error:

```bash
    bash: warning: setlocale: LC_ALL: cannot change locale (en_US.UTF-8)
```

You can fix your locale with a few simple updates.

1. Edit `/etc/locale.gen` and uncomment the line with `en_US.UTF-8`
2. Run `sudo locale-gen`
3. Run `sudo update-locale LANG=en_US.UTF-8`

Log out and back in for the change to take effect. The `locale-gen` command builds every locale you uncommented in `/etc/locale.gen`, so it takes no argument. The `update-locale` command needs the variable name as well as the value. Without `LANG=`, it silently does nothing.

You can also run `sudo raspi-config` and choose the localisation options, which does the same work through a menu.

## Changelog

> **2026-10-26**
>
> * Corrected the commands. `update-locale` needs `LANG=en_US.UTF-8`, and `locale-gen` takes no argument.
> * Added `sudo`, which both commands need.
> * Updated the OS name to Raspberry Pi OS and removed a duplicate heading.
