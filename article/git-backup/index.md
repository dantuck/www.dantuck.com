---
date: 2020-04-04 14:00:00
title: "How to backup a Git repository"
categories:
- Tools
tags:
- Tools
- Backup
- articles
layout: layouts/post.njk

---

Many of us use services such as Github, Gitlab and Bitbucket as our Git source code remotes. It has crossed my mind more than once that there could be a day when any one of those services goes down. We as individuals and companies would loose valuable code if that happened. So just like we do with other files and important assets we backup.

Out of the box Git does not have an obvious backup mechanism but there is. I have successfully used the Git `--mirror` flag to clone a Git repository to a local backup.

## Clone a git mirror from a remote
``` bash
    git clone --mirror remote.git local-backup.git
```
## How to update a bare mirror

Since our local bare mirror is not being consistently updated by our normal workflows it is a good idea to either add a workflow into your backup process or manually update a bare git repo with the following command:
``` bash
    git remote update
```
