---
setup: |
  import Layout from '../../layouts/BlogPost.astro'
publishDate: 01 Feb 2020
title: "Pass extension: Safe"
author: dantuck
description: |
  Pass is becoming my goto for password management. It is a very easy to use manager and has a great list of extensions as well as the ability to create your own extensions. I have found that I need to solve a very specific problem where I need a printed backup of all data that is stored in the password store.
---

[Pass](https://www.passwordstore.org/ "www.passwordstore.org") is becoming my goto for password management. It is a very easy to use manager and has a great list of extensions as well as the ability to create your own extensions. I have found that I need to solve a very specific problem where I need a printed backup of all data that is stored in the password store.

### The Problem

Pass is pretty cool and offers a lot of options to store passwords and more. This all works only if you have access to the store with a generated key. So what happens if you don't have this key or someone else needs access in the event the owner of the key is not available or the access is no longer possible for a number of reasons.

### The Solution

I am a pretty strong believer these days that we need a secondary storage for backing up key data. I have decided that keeping a printed copy of some data is the best solution and then keeping that data in a safe or safety deposit box where a third party could have access in the event of an emergency.

Pass does not have this as a native option and I totally get the reason. I decided to create a new extension that will allow the export of all passwords and data stored in each individual `.gpg` into a single file. This file can then be printed and stored.

The extension `pass-extension-safe` can be found here: [pass-extension-safe](https://gitlab.com/dantuck/pass-extension-safe).

Pass Safe is an extension for the [password store](https://www.passwordstore.org/) that allows the owner of the data to export a clear text copy of their password store for the purpose of secure backup or printing. The purpose behind this is to have a way to export and save a printed copy in a safe for offline recovery in the event the owner of the password store is not longer available or access to the password store is not possible.

`pass safe` exports all content from the password store in `~/.password-store` to a file `exported_passes` in the directory the command was run.

### Installation

- Enable password-store extensions by setting ``PASSWORD_STORE_ENABLE_EXTENSIONS=true``
- ``make install``
- alternatively add `safe.bash` to your extension folder (by default at `~/.password-store/.extensions`)

### Inspiration and Credits

Bash example and most of the code comes from: [StackExchange jasonwryan](https://unix.stackexchange.com/questions/170519/export-passwords-from-the-pass-password-manager#170546).

The extension format was drawn from the [palortoff: pass-extension-tail](https://github.com/palortoff/pass-extension-tail).
