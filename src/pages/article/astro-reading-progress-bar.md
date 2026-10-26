---
layout: '../../layouts/BlogPost.astro'
publishDate: 19 Nov 2026 14:00 UTC
title: "Astro Reading Progress Bar With View Transitions"
author: dantuck
description: |
    Build a reading progress bar in Astro that survives client-side navigation and only shows on article pages. A Svelte footer, one data attribute and page-load events.
tags:
- developer-tools
- accessibility
---

A reading progress bar is a thin line along the bottom of the screen that fills as you scroll. It is a small feature. It is also easy to get wrong in an Astro site that uses view transitions.

Mine was wrong in a specific way. It showed on every page, including the home page and the tag lists, where there is nothing to read. This article covers the fix.

## The shape of the problem

The bar lives in the footer. The footer is a Svelte component, and it uses `transition:persist` so it stays mounted while the reader moves between pages:

```astro
<Footer client:load transition:persist />
```

Persisting is the point. The footer also holds the theme and font toggles, and I do not want them to flicker on every click.

It is also the problem. A persisted component runs its setup code once. When the reader goes from the home page to an article, the footer does not mount again. Any check I make at mount time is stale by the second page.

## Mark the pages that should have the bar

The footer cannot ask which layout rendered the page. It can look at the page, though. I added a data attribute to the `<main>` element in the two layouts that hold readable content, the article layout and the recipe layout:

```astro
<main id="main-content" data-reading-progress class="article-content py-6">
```

Every other page has no such attribute. The footer needs only one question: does the current page contain `[data-reading-progress]`?

## Check on every page load

Astro's client router fires `astro:page-load` after each navigation, and once on the first load. That is the event to listen for:

```js
function sync() {
  enabled = !!document.querySelector("[data-reading-progress]");
  progress.hidden = !enabled;
  progress.style.transform = "";
  observer.disconnect();
  if (enabled) observer.observe(document.body);
}

document.addEventListener("astro:page-load", sync);
sync();
```

`sync` does four things:

* It reads the attribute to decide whether the bar applies.
* It hides the bar with the `hidden` attribute when it does not.
* It resets the bar to empty, so a stale position never carries over from the last page.
* It starts or stops the observer that measures the page.

The direct `sync()` call after the listener covers the first load, in case the component mounts after `astro:page-load` has already fired.

## Measuring the scroll

The bar needs to know how far the reader can scroll. A `ResizeObserver` watches the body and recalculates when the page changes size, for example when an image loads and pushes the content down:

```js
const observer = new ResizeObserver(() => {
  bottom =
    document.scrollingElement.scrollTop +
    document.querySelector("footer").getBoundingClientRect().top;
  winHeight = window.innerHeight;
  scroll();
});
```

The end of the article is where the footer starts. The percentage is the scroll position divided by that distance, minus one screen:

```js
const percent = Math.min(
  (document.scrollingElement.scrollTop / (bottom - winHeight)) * 100,
  100
);
progress.style.transform = `translate(-${100 - percent}vw, 0)`;
```

The bar is a full-width element pushed off the left edge. Moving it with `transform` instead of changing its width is cheaper for the browser, and scrolling stays smooth.

## Cleanup

A component that adds listeners to `window` and `document` should remove them. Svelte's `onMount` accepts a returned function for that:

```js
return () => {
  removeEventListener("scroll", scroll);
  document.removeEventListener("astro:page-load", sync);
  observer.disconnect();
};
```

Because the footer persists, this cleanup rarely runs in production. It keeps the component well-behaved if it is ever unmounted, and it prevents duplicate listeners if the component mounts twice.

---

## The bar for assistive technology

The bar carries `aria-hidden="true"` and `pointer-events: none`. It is a visual hint only. A screen reader user gets nothing from a progress element that updates on every scroll event, and a reader using a mouse should never have the bar catch a click.

## Testing it

I tested it in headless Chrome with a short script. It moved between page types through the client router and checked whether the bar was visible on each one.

The navigation steps are the ones that catch the bug. A bar that works on a direct page load can still be wrong after a client-side navigation.

The pattern generalises. When a persisted component needs to react to the page it is on, do not decide once at mount. Mark the page, then check on every load.
