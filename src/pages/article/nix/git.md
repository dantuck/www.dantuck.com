---
layout: '../../../layouts/BlogPost.astro'
title: 'Nix: Configuring git'
author: dantuck
tags:
- dotfiles
- nix
- git
- home-manager
publishDate: 12 May 2023
description: |
  In this article, we configure git using Nix and Home Manager. Rather than maintaining a hand-crafted .gitconfig, we declare our git identity, aliases, global ignores, and extra settings directly in home.nix — giving us a reproducible, portable git setup managed alongside the rest of our environment.
---

> [Nix and Home Manager - Getting setup](/article/nix/setup)<br />
> [Nix: Configuring program specific configurations - The basics](/article/nix/program-config-basics)<br />
> ➜ Nix: Configuring git

Git is one of the first things I reach for when setting up a new machine, which makes it a natural fit for Home Manager. Instead of copying `.gitconfig` between machines or running `git config --global` commands by hand, we can declare the whole setup in `home.nix` and have it applied automatically.

## programs.git

Home Manager has first-class support for git via `programs.git`. At minimum we need a name and email:

```bash
$ vim ~/.config/home-manager/home.nix
{ config, pkgs, ... }:

{
  programs.git = {
    enable = true;
    userName = "Your Name";
    userEmail = "you@example.com";
  };
}
```

Save and apply:

```bash
$ home-manager switch
```

Verify the result:

```bash
$ git config --global user.name
Your Name
$ cat ~/.config/git/config
```

Notice that like `bat` in the previous article, the generated config file is a symlink into the Nix store. Home Manager owns it — editing `~/.config/git/config` directly would work temporarily but would be overwritten on the next `home-manager switch`.

## Global gitignore

Rather than adding OS and editor noise to every repo's `.gitignore`, we can declare a global ignore list once:

```bash
programs.git = {
  enable = true;
  userName = "Daniel Tucker";
  userEmail = "you@example.com";

  ignores = [
    ".DS_Store"
    "*.swp"
    ".direnv"
    ".envrc"
  ];
};
```

Home Manager writes this to `~/.config/git/ignore` and sets `core.excludesFile` automatically. No manual `git config --global core.excludesFile` required.

## Aliases

Aliases go directly in the `git` block:

```bash
programs.git = {
  enable = true;
  userName = "Daniel Tucker";
  userEmail = "you@example.com";

  ignores = [
    ".DS_Store"
    "*.swp"
    ".direnv"
    ".envrc"
  ];

  aliases = {
    st = "status";
    co = "checkout";
    lg = "log --oneline --graph --decorate --all";
    undo = "reset HEAD~1 --mixed";
  };
};
```

Test one:

```bash
$ git lg
```

## Extra configuration

For anything not directly exposed by the `programs.git` options, `extraConfig` accepts arbitrary git config as an attribute set:

```bash
programs.git = {
  enable = true;
  userName = "Daniel Tucker";
  userEmail = "you@example.com";

  ignores = [
    ".DS_Store"
    "*.swp"
    ".direnv"
    ".envrc"
  ];

  aliases = {
    st = "status";
    co = "checkout";
    lg = "log --oneline --graph --decorate --all";
    undo = "reset HEAD~1 --mixed";
  };

  extraConfig = {
    init.defaultBranch = "main";
    pull.rebase = true;
    rebase.autoStash = true;
    core.editor = "vim";
  };
};
```

Run `home-manager switch` and verify:

```bash
$ git config --global init.defaultBranch
main
$ git config --global pull.rebase
true
```

## Signing commits with GPG

If you sign commits, Home Manager can wire up the signing key too. First make sure `gnupg` is in your packages, then add the signing block:

```bash
{ config, pkgs, ... }:

{
  home.packages = [ pkgs.gnupg ];

  programs.git = {
    enable = true;
    userName = "Your Name";
    userEmail = "you@example.com";

    signing = {
      key = "YOUR_GPG_KEY_ID";
      signByDefault = true;
    };

    extraConfig = {
      init.defaultBranch = "main";
      pull.rebase = true;
      rebase.autoStash = true;
      core.editor = "vim";
    };
  };
}
```

You can find your key ID with `gpg --list-secret-keys --keyid-format=long`. Replace `YOUR_GPG_KEY_ID` with the long-form ID for the key associated with your git email.

#### The wrap-up

In conclusion, we have moved our entire git configuration into `home.nix`. Name, email, global ignores, aliases, extra settings, and optional GPG signing are all declared in one place. A fresh `home-manager switch` on any machine gives an identical git setup — no manual steps, no forgotten flags.

From here the pattern extends to any other program with a Home Manager module: declare it, switch, verify.
