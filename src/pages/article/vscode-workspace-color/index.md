---
layout: '../../../layouts/BlogPost.astro'
publishDate: 31 Mar 2020
title: "Customize workspace colors in VSCode "
categories:
- Tools
tags:
- tools
- vscode
author: dantuck
description: |
    VSCode gives you a lot of flexibility to override nearly every setting it offers. This comes in handy for many reasons which users are finding daily. One of those very reasons I came across today; using title bar and status bar colors to visually differentiate my open VSCode windows.
---

VSCode gives you a lot of flexibility to override nearly every setting it offers. This comes in handy for many reasons which users are finding daily. One of those very reasons I came across today; using title bar and status bar colors to visually differentiate my open VSCode windows.

## Adapting your workspace color settings

First things first you will need to learn to explore the VSCode settings. You can open the settings in a number of ways.

* `ctrl + ,`
* `cmd + ,`
* `File -> Preferences -> Settings`

After you have opened the settings you can search for setting by typing in the search box. For this exercise type `color customization` and a few results are going to come back. Before you select one make sure you have selected `Workspace` just below the search box. By selecting `Workspace` you are indicating that you are only wanting to make the setting changes for the current workspace and not your entire user.

Next you will select `Edit in settings.json` in the result titled `Workbench: Color Customizations`.

Time to now add in the settings. You will likely be left with the following starting point or something similar:
``` js
    {
        "folders": [

        ],
        "settings": {

        }
    }
```
Add your customizations to the `settings` section. Below is an example:
``` js
    {
        "folders": [

        ],
        "settings": {
            "workbench.colorCustomizations": {
                "statusBar.background": "#053b00",
                "titleBar.activeBackground": "#053b00",
                "titleBar.activeForeground": "#cccccc"
            },
            "window.titleBarStyle": "custom"
        }
    }
```
To explain, the settings we are updating above are the color of the bottom status bar background color 
``` js
    "statusBar.background": "#053b00",
```
and the window title bar background color and the text color.
``` js
    "titleBar.activeBackground": "#053b00",
    "titleBar.activeForeground": "#cccccc"
```
The last change we made was enabling the `titleBar` setting change which is saying we are using the `"window.titleBarStyle": "custom"` setting. Now this will not make the change to the title bar just yet.

Current versions of VSCode use the `custom` title bar by default on Windows, macOS and Linux, so the colors should apply without any further change. If your title bar colors do not show, go to the settings page with `ctrl + ,` (or the shortcut for your operating system), search for `titleBarStyle`, select the `User` tab and make sure the dropdown is set to `custom` rather than `native`. In older versions of VSCode the default was `native`, and changing it was required.

You now have your custom setting enabled for your workspace. Congrats!

### Inspiration and Credits

<!-- {{< tweet 1244912178001580034 >}} -->

## Changelog

> **2026-10-26**
>
> * Corrected the workspace file key from `folder` to `folders`.
> * Updated the title bar advice. `custom` is now the default on all platforms, so the change is only needed if the colors do not appear.
> * Fixed typos.
