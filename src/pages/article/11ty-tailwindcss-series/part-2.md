---
setup: |
  import Layout from '../../../layouts/BlogPost.astro'
publishDate: 12 Mar 2021
title: "11ty and tailwindcss template, Part II"
author: dantuck
tags:
- code
- eleventy
- static-site
description: |
  Time to get tailwindcss added and compiling into our project.

  Install the tailwindcss and enabling packages...
---

> [Part I](/article/11ty-tailwindcss-series/part-1/) : [code](https://gitlab.com/dantuck/11ty-tailwind-base/-/tree/part-1) - Setting up the scaffolding<br />
> Part II : [code](https://gitlab.com/dantuck/11ty-tailwind-base/-/tree/part-2) - Enabling TailwindCSS

## Enable tailwindcss

Time to get [tailwindcss](https://tailwindcss.com/) added and compiling into our project.

Install the tailwindcss and enabling packages:

```bash
  $ npm install tailwindcss postcss-cli
```

* [tailwindcss](https://www.npmjs.com/package/tailwindcss) - CSS framework that will help with rapid custom interfaces
* [postcss-cli](https://www.npmjs.com/package/postcss-cli) - PostCSS CLI

### Building the layout

First, create a base `style.css`:

`src/site/_includes/css/style.css`

```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  @layer base {
    h2 {
      @apply text-green-500;
    }
  }
```

Setup `tailwind.config.js`:

```javascript
  module.exports = {
    purge: {
      content: [
        "src/**/*.njk",
        "src/**/*.md"
      ],
      options: {
        whitelist: [],
      },
    },
    theme: {},
    variants: {},
    plugins: [],
  };
```

Setup `postcss.config.js` to require `tailwindcss` as a plugin:

```javascript
  module.exports = {
    plugins: [
      require('tailwindcss')(`./tailwind.config.js`),
    ],
  };
```

Next, update `package.json` with the `build:css` needed to build the css:

```json
  {
    "name": "11ty-tailwind-base",
    ...
    "scripts": {
      "start": "npm run serve",
      ...
      "build:css": "postcss src/site/_includes/css/style.css -o ./.build/css/style.css",
      ...
    },
    "author": "",
    ...
  }

```

Running `npm run build:css` will output to `./.build/css/style.css`.

## Add the css build into the site output

Now that we have our tailwindcss building, we need to add it into the rest of the build process. We will need a few new tools to help make it go smoother.

* [npm-run-all](https://www.npmjs.com/package/npm-run-all) - will allow for running npm commands in parallel or concurrently
  
### npm-run-all setup

Install `npm-run-all`:

```bash
  $ npm install npm-run-all
```

Update `package.json` to use it:

```json
  "scripts": {
    "start": "npm run serve",
    "serve": "run-p \"build:html -- --serve\" \"build:css -- --watch\"",
    "build": "npm-run-all build:css build:html",
    "build:css": "postcss src/site/_includes/css/style.css -o ./.build/css/style.css",
    "build:html": "eleventy",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
```

* `build:html` simply builds `eleventy` with no flags.
* `build` runs `build:css` and `build:html` in sequential order. Similiar to `npm run build:css && npm run build:html`.
* `serve` has been updated to use `run-p` which is shorthand for `npm-run-all --parallel`. Serve uses existing npm commands and adds additional flags to set them in watch mode.

## Configure `.eleventy.js` to passthrough the css

```javascript
  eleventyConfig.setUseGitIgnore(false);
  // Watch for CSS changes
  eleventyConfig.addWatchTarget("./.build/css/style.css");
  // Copy CSS build changes to dist css/style.css
  eleventyConfig.addPassthroughCopy({ "./.build/css/style.css": "css/style.css" });
```

## Clean-up the css output

Install more tooling:

```bash
  $ npm install autoprefixer @fullhuman/postcss-purgecss cssnano
```

* [autoprefixer](https://www.npmjs.com/package/autoprefixer) - don't bother with writing the vender prefixes and instead let the autoprefixer do it for you.
* [postcss-purgecss](https://www.npmjs.com/package/postcss-purgecss) - in order to keep the output css small we have the prugecss tool to only include css that is used.
* [cssnano](https://cssnano.co/) - makes the css output nice and small.

### Add in the autoprefixer

`postcss.config.js`

```javascript
  module.exports = {
    plugins: [
      require(`tailwindcss`)(`./tailwind.config.js`),
      require('autoprefixer')
    ],
  };
```

### Enable the purge with postcss-purgecss plugin

Enable `PurgeCSS` and `cssnano` on the `dist` folder.

`postcss.config.js`

```javascript
  const purgecss = require('@fullhuman/postcss-purgecss')

  module.exports = {
    plugins: [
      require('tailwindcss')(`./tailwind.config.js`),
      require('autoprefixer'),
      purgecss({
        content: ['./**/*.html']
      })
      require('cssnano')({
        preset: 'default',
      }),
    ],
  };
```

## Update `.gitignore`

`.gitignore`

```
  node_modules
  .env
  .vscode
  .DS_Store
  .build
  dist
```

## Finally run it

Now our output css file is much smaller!

Run `npm start` and watch the output.

Follow along with the source code: [11ty-tailwind-base - Part II](https://gitlab.com/dantuck/11ty-tailwind-base/-/tree/part-2)