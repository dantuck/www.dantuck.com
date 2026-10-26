---
layout: '../../layouts/BlogPost.astro'
publishDate: 28 Oct 2026 14:00 UTC
title: "Anchor vs Button: When to Use Each"
author: dantuck
description: |
    Anchor vs button comes down to one question: does it go somewhere or do something? How each element behaves, and what breaks when you swap them.
tags:
- accessibility
- developer-tools
---

A link goes somewhere. A button does something. Everything else in the anchor vs button debate is a footnote to that sentence.

The two elements can look identical with CSS. They are not identical. The browser, the keyboard and a screen reader all treat them differently, and a styled lookalike gets none of that for free.

## What an anchor gives you

An `<a>` with an `href` is a hyperlink. That one attribute buys a lot:

- It is focusable and activates with Enter.
- It has `:link` and `:visited` states.
- It opens in a new tab with a middle click or Ctrl-click.
- Right-click offers "copy link address".
- The destination shows in the status bar on hover.
- It works with JavaScript turned off.

An `<a>` without an `href` is none of that. It is not focusable, and a screen reader does not announce it as a link.

## What a button gives you

A `<button>` is a control. It is focusable and activates with both Enter and Space, which is what keyboard users expect from a control.

Inside a `<form>`, a button submits the form by default. That is behavior, and it works without JavaScript. Outside a form, a button does nothing until you attach a handler, so it depends on JavaScript. Set `type="button"` when you do not want the submit behavior inside a form.

---

## What breaks when you swap them

**A link used as a button.** This pattern is everywhere:

```html
<a href="#" onclick="openMenu()">Menu</a>
```

The `href="#"` jumps the page to the top, adds a history entry, and gives the link a destination that means nothing. Screen readers announce a link, so the user expects navigation and gets a menu.

Adding `role="button"` fixes the announcement. It does not fix the keyboard. A link still ignores Space, so you end up writing a key handler to patch the behavior a real button already has. At that point, use a button.

**A button used as a link.** This one is quieter:

```html
<button onclick="location.href='/pricing'">Pricing</button>
```

It breaks middle click, copy link and the status bar. The destination is hidden until the user commits to the click. It also needs JavaScript to go anywhere. A link would have done all of that without being asked.

## The rule I use

If the result is a different page, or a different place on this page, use `<a href>`. If the result is a change in the current page, such as opening a menu, toggling a setting or submitting a form, use `<button>`.

When it is unclear, ask what the user would expect if they middle-clicked it. If opening it in a new tab makes sense, it is a link.

Style either one however you like. The MDN pages for <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a" target="_blank" rel="noopener noreferrer">the anchor element</a> and <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button" target="_blank" rel="noopener noreferrer">the button element</a> cover the full attribute lists. The semantics are the part that is hard to restyle after the fact.
