---
setup: |
  import Layout from '../../layouts/BlogPost.astro'
publishDate: 02 Oct 2018
title: Visual Studio Code - Selected Text to Uppercase
author: dantuck
description: |
   In Visual Studio we are all used to being able to use CTRL+SHIFT+U to transform the selected text to uppercase but for Visual Studio Code this key binding was left out. As long as you are using _Version 1.8.1 or above_ you will be able to take advantage of the built in keyboard shortcuts. Do the following to enable the keybindings.
---

In Visual Studio we are all used to being able to use CTRL+SHIFT+U to transform the selected text to uppercase but for Visual Studio Code this key binding was left out. As long as you are using _Version 1.8.1 or above_ you will be able to take advantage of the built in keyboard shortcuts. Do the following to enable the keybindings.

_Note: Ubuntu users will need to use a modified binding; change to ctrl+alt+u and ctrl+alt+l._

_File-> Preferences -> Keyboard Shortcuts_.

An editor will appear with keybindings.json file. Place the following JSON in there and save.
```json
    [
     {
        "key": "ctrl+shift+u",
        "command": "editor.action.transformToUppercase",
        "when": "editorTextFocus"
     },
     {
        "key": "ctrl+shift+l",
        "command": "editor.action.transformToLowercase",
        "when": "editorTextFocus"
     }
    ]
```
Ubuntu users:
```json
    [
     {
        "key": "ctrl+alt+u",
        "command": "editor.action.transformToUppercase",
        "when": "editorTextFocus"
     },
     {
        "key": "ctrl+alt+l",
        "command": "editor.action.transformToLowercase",
        "when": "editorTextFocus"
     }
    ]
```
As soon as you save you will now be able to use CTRL+SHIFT+U to change selected text to uppercase and CTRL+SHIFT+L to change selected text to lowercase.