---
setup: |
  import Layout from '../../../layouts/BlogPost.astro'
title: Configuring program specific configurations - The basics
author: dantuck
tags:
- dotfiles
- nix
publishDate: 03 May 2023
description: |
  By adopting Nix and Home Manager, I hope to simplify the management of my dotfiles and bid farewell to multiple package managers like Homebrew. Through a single application repository, Nix offers the promise of a unified experience across various operating systems. While this article focuses on the initial setup, subsequent updates will delve into the exciting realm of experimental features and customization options that Nix and Home Manager provide. So join me on this journey as we venture into the world of streamlined dotfile management with Nix and Home Manager.
---

> [Nix and Home Manager - Getting setup](/article/nix/setup)<br />
> ➜ Configuring program specific configurations - The basics

In this article, we dive into the process of adding the [bat](https://github.com/sharkdp/bat) program with custom configurations to your Nix and Home Manager setup. `bat` is a feature-rich alternative to the traditional `cat` command, offering syntax highlighting and advanced functionalities for file concatenation and display. By following our step-by-step guide, you'll learn how to integrate `bat` into your Nix environment and configure it to suit your specific needs.

## Configuring program specific configurations

For programs where specific configuration is needed, the nix configuration will look at little different. In order to demonstrate, lets start with [bat](https://github.com/sharkdp/bat). We are going to use the [nix package](https://search.nixos.org/packages?channel=22.11&show=bat&from=0&size=50&sort=relevance&type=packages&query=bat) and the following configuration flags:

``` bash
--italic-text='always'
--theme='Dracula'
```

Assuming `bat` is not installed you should get a similar output to this when running the following command:

``` bash
$ cat ~/.config/bat/config
[bat error]: '/home/daniel/.config/bat/config': No such file or directory (os error 2)
```

After we run through the next steps of configuring, we will get a far different result.

Lets start by updating our `home.nix` file with the following:

``` bash
$ vim ~/.config/home-manager/home.nix
{ config, pkgs, ... }:

{
 	programs.bat = {
		enable = true;
		config = {
			theme = "Dracula";
			italic-text = "always";
		};
	};
}
```

Save the file and run `home-manager switch`.

``` bash
$ home-manager switch
$ bat ~/.config/bat/config
```

And you will see `bat` open and show the configuration we specified above with no "not found messages". Notice when running `ls -l ~/.config/bat/config` that it is actually a symbolic link to the nix home manager directory. This allows us to manage the dotfiles and programs in `home.nix`. If we remove or change any configurations and run `home-manager switch`, those changes will be applied and available. This also goes for completely removing `programs.bat`. This results in the configs plus the actual program would be removed. Give it a try and see what you get.

This example using `bat` is definitely simple but demonstrates the ground work needed to start converting your more complex programs and configurations.

#### The wrap-up

> VSCode Nix language support<br />
> Install via VSCode [Marketplace](https://marketplace.visualstudio.com/items?itemName=bbenoist.Nix)

In conclusion, we have added the `bat` program and configurations via Nix and Home Manager. We have also avoided using OS specific package managers and conditional configurations for each OS. Additionally, linked above, you have the VSCode Nix language support plugin that will help in your management of your Nix based dotfiles. Start elevating your dotfile experience today and unleash your full potential as a terminal power user.
