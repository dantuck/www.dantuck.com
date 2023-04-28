---
setup: |
  import Layout from '../../../layouts/BlogPost.astro'
title: Nix and Home Manager - Getting setup
author: dantuck
tags:
- dotfiles
- nix
publishDate: 28 Apr 2023
description: |
  By adopting Nix and Home Manager, I hope to simplify the management of my dotfiles and bid farewell to multiple package managers like Homebrew. Through a single application repository, Nix offers the promise of a unified experience across various operating systems. While this article focuses on the initial setup, subsequent updates will delve into the exciting realm of experimental features and customization options that Nix and Home Manager provide. So join me on this journey as we venture into the world of streamlined dotfile management with Nix and Home Manager.
---

For a while now, I've been using a shell script-based [dotfile](https://codeberg.org/tuck/dotfiles) management system that has served me well. It's been a manual and hands-on approach, giving me complete control over my configuration files. Overall, I've had no major complaints about this process. However, curiosity has piqued my interest in exploring an alternative solution: Nix and Home Manager. In this article, we delve into the reasons behind my consideration of this switch, focusing on the initial setup and the potential benefits of adopting Nix and Home Manager. While this article covers the basic setup without diving into complex or experimental features, future updates and articles will explore advanced customization options.

So why am I considering a move to Nix and Home Manager? Really curiosity and the ability to abandon the use of [Homebrew](https://brew.sh) and other package managers. I can depend on and use a single application repository rather than manage multiple sources depending on which operation system I am using.

## Setup

Install [nix](https://nixos.org/download.html)

> May need to run in a bash shell

``` bash
$ bash -c "sh <(curl -L https://nixos.org/nix/install) --daemon"
```

Open a new shell and run:

``` bash
$ nix-shell -p nix-info --run "nix-info -m"
```

Test the install:

``` bash
$ nix-shell -p cowsay
these 3 paths will be fetched (8.54 MiB download, 53.88 MiB unpacked):
  /nix/store/gfi27h4y5n4aralcxrc0377p8mjb1cvb-cowsay-3.7.0
  /nix/store/wy0incigsdz3nai26lxmn9ibchnb0qd6-libxcrypt-4.4.33
  /nix/store/m6kc0wg6zii4bcw0fqxmclgy27ph09va-perl-5.36.0
copying path '/nix/store/wy0incigsdz3nai26lxmn9ibchnb0qd6-libxcrypt-4.4.33' from 'https://cache.nixos.org'...
copying path '/nix/store/m6kc0wg6zii4bcw0fqxmclgy27ph09va-perl-5.36.0' from 'https://cache.nixos.org'...
copying path '/nix/store/gfi27h4y5n4aralcxrc0377p8mjb1cvb-cowsay-3.7.0' from 'https://cache.nixos.org'...

[nix-shell:~]$ which cowsay
/nix/store/gfi27h4y5n4aralcxrc0377p8mjb1cvb-cowsay-3.7.0/bin/cowsay

[nix-shell:~]$ cowsay 'Moo?'
perl: warning: Setting locale failed.
perl: warning: Please check that your locale settings:
        LANGUAGE = (unset),
        LC_ALL = (unset),
        LANG = "en_US.UTF-8"
    are supported and installed on your system.
perl: warning: Falling back to the standard locale ("C").
 ______
< Moo? >
 ------
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||

[nix-shell:~]$ exit
exit
$ which cowsay
```

### Install Home Manager

``` bash
$ nix-channel --add https://github.com/nix-community/home-manager/archive/master.ta
r.gz home-manager
$ nix-channel --update
this derivation will be built:
  /nix/store/kw8al1c1mbqmyk0n32zpcin4552zzrry-home-manager.drv
building '/nix/store/kw8al1c1mbqmyk0n32zpcin4552zzrry-home-manager.drv'...
unpacking channels...
```

Run the Home Manager installation command and create the first Home Manager generation:

``` bash
$ nix-shell '<home-manager>' -A install
...
All done! The home-manager tool should now be installed and you can edit

    ~/.config/home-manager/home.nix

to configure Home Manager. Run 'man home-configuration.nix' to
see all available options.
```

Verify Home Manager has been installed:

``` bash
$ nix-env --query --installed
home-manager-path
```

Then, run `home-manager` to see the default configuration that was installed:

> A shell reload may be required
> `"$SHELL" -l`

``` bash
$ home-manager --version
23.05-pre
$ cat ~/.config/home-manager/home.nix
{ config, pkgs, ... }:

{
  # Home Manager needs a bit of information about you and the paths it should
  # manage.
  home.username = "daniel";
  home.homeDirectory = "/home/daniel";

  # This value determines the Home Manager release that your configuration is
  # compatible with. This helps avoid breakage when a new Home Manager release
  # introduces backwards incompatible changes.
  #
  # You should not change this value, even if you update Home Manager. If you do
  # want to update the value, then make sure to first check the Home Manager
  # release notes.
  home.stateVersion = "22.11"; # Please read the comment before changing.

  # The home.packages option allows you to install Nix packages into your
  # environment.
  home.packages = [
    # # Adds the 'hello' command to your environment. It prints a friendly
    # # "Hello, world!" when run.
    # pkgs.hello

    # # It is sometimes useful to fine-tune packages, for example, by applying
    # # overrides. You can do that directly here, just don't forget the
    # # parentheses. Maybe you want to install Nerd Fonts with a limited number of
    # # fonts?
    # (pkgs.nerdfonts.override { fonts = [ "FantasqueSansMono" ]; })

    # # You can also create simple shell scripts directly inside your
    # # configuration. For example, this adds a command 'my-hello' to your
    # # environment:
    # (pkgs.writeShellScriptBin "my-hello" ''
    #   echo "Hello, ${config.home.username}!"
    # '')
  ];

  # Home Manager is pretty good at managing dotfiles. The primary way to manage
  # plain files is through 'home.file'.
  home.file = {
    # # Building this configuration will create a copy of 'dotfiles/screenrc' in
    # # the Nix store. Activating the configuration will then make '~/.screenrc' a
    # # symlink to the Nix store copy.
    # ".screenrc".source = dotfiles/screenrc;

    # # You can also set the file content immediately.
    # ".gradle/gradle.properties".text = ''
    #   org.gradle.console=verbose
    #   org.gradle.daemon.idletimeout=3600000
    # '';
  };

  # You can also manage environment variables but you will have to manually
  # source
  #
  #  ~/.nix-profile/etc/profile.d/hm-session-vars.sh
  #
  # or
  #
  #  /etc/profiles/per-user/daniel/etc/profile.d/hm-session-vars.sh
  #
  # if you don't want to manage your shell through Home Manager.
  home.sessionVariables = {
    # EDITOR = "emacs";
  };

  # Let Home Manager install and manage itself.
  programs.home-manager.enable = true;
}
```

Now we are ready to start updating this very config to our liking.

### Installing programs

For programs that do not have any custom configuration files we can install via `home.packages = [ pkgs.ripgrep ]` where we are installing [ripgrep](https://search.nixos.org/packages?channel=22.11&show=ripgrep&from=0&size=50&sort=relevance&type=packages&query=ripgrep) from the [nixos packages repository](https://search.nixos.org/packages).

``` bash
home.packages = [
    pkgs.ripgrep
];
```

Now tell Home Manager to build and deploy the updated environment.

``` bash
$ home-manager switch
```

You will get a bunch of output from that command then check to ensure `ripgrep` was installed.

``` bash
$ which rg
/home/daniel/.nix-profile/bin/rg
```

#### Uninstall a program

Remove the `pkgs.ripgrep` from `home.packages` then rebuild with `home-manager switch`

#### The wrap-up

In this article, I shared the basic setup of Nix and Home Manager. The main reason behind this article was my desire to simplify the management process and consolidate multiple package managers like Homebrew into a single repository. In this article, I focused on the initial setup, with the intention of exploring more advanced features and customization options in future updates. I invite you to join me on this journey as I strive for streamlined dotfile management with Nix and Home Manager.
