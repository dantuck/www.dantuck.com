---
layout: '../../layouts/BlogPost.astro'
publishDate: 02 Oct 2018
title: Visual Studio Code - Selected Text to Uppercase
author: dantuck
description: |
   In Visual Studio we are all used to being able to use CTRL+SHIFT+U to transform the selected text to uppercase but for Visual Studio Code this key binding was left out. As long as you are using _Version 1.8.1 or above_ you will be able to take advantage of the built in keyboard shortcuts. Do the following to enable the keybindings.
---

In Visual Studio we are all used to being able to use CTRL+SHIFT+U to transform the selected text to uppercase but for Visual Studio Code this key binding was left out. As long as you are using _Version 1.8.1 or above_ you will be able to take advantage of the built in keyboard shortcuts. Do the following to enable the keybindings.

_Note: Ubuntu users will need to use a modified binding; change to ctrl+alt+u and ctrl+alt+l._

Open _File -> Preferences -> Keyboard Shortcuts_ (on macOS, _Code -> Settings -> Keyboard Shortcuts_), then click the _Open Keyboard Shortcuts (JSON)_ icon in the top right of the editor. You can also run _Preferences: Open Keyboard Shortcuts (JSON)_ from the command palette.

A `keybindings.json` file will open. Place the following JSON in the array and save. If the file already has bindings, add these entries to the existing array.
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

These keys already have default bindings in current versions of VSCode. On Windows and Linux, CTRL+SHIFT+U shows the Output panel and CTRL+SHIFT+L selects all occurrences of the current selection. Your bindings replace those defaults while the editor has focus. If you use either one, pick different keys. The commands are also available without a shortcut from the command palette as _Transform to Uppercase_ and _Transform to Lowercase_.

## Changelog

> **2026-10-26**
>
> * Updated how to open `keybindings.json`. The Keyboard Shortcuts editor now has a button for it.
> * Added a note that these key combinations already have default bindings.
