---
date: 2018-09-26T12:02:14-06:00
title: "Raspberry Pi: Fixing your Locale"
layout: layouts/post.njk
---

# Fixing your Locale on Raspberry Pi

After a fresh install of Raspbian you will likely see the following error:
```bash
    bash: warning: setlocale: LC_ALL: cannot change locale (en_US.UTF-8)
```
You can fix your locale with a few simple updates.

1. Edit `/etc/locale.gen` and uncomment the line with `en_US.UTF-8`
2. Run `locale-gen en_US.UTF-8`
3. Run `update-locale en_US.UTF-8`