---
date: 2020-03-31 11:00:00
title: "Customize workspace colors in VSCode "
categories:
- Tools
tags:
- Tools
- VSCode
layout: layouts/post.njk

---

VSCode give you a lot of flexibility to override nearly every setting they offer. This come in handing for many reasons which users are finding daily. One of those very reasons I came across today; using title bar and status bar colors to visually differentiate my open VSCode windows.

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
        "folder": [

        ],
        "settings": {

        }
    }
```
Add your customizations to the `settings` section. Below is an example:
``` js
    {
        "folder": [

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

%carbon%

For the title bar setting change to take for your current workspace you must change your user window setting to use the `custom` option rather than the `native`. To do this go back to the settings page `ctrl + ,` or other way depending on your operation system. Then in the search type `titleBarStyle` and ensure you have selected `User` instead of `Workspace`. The setting change is a dropdown which should be selected `native`. Change it to `custom` and let VSCode reload.

You now have your custom setting enabled for your workspace. Congrats!

### Inspiration and Credits

{{< tweet 1244912178001580034 >}}