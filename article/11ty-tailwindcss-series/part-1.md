---
date: 2021-03-11
title: "11ty and tailwindcss template, Part I"
layout: layouts/post.njk
---

Until now I have been trying to write my own CSS and keep it simple. I like simplicity in my designs but also I do like the fun that comes with what you can do these days with CSS. With that thought in mind I want to get a little more creative with my site design and that is what brings us to this point.

You can't tell it by the site source but I do use [Eleventy](https://www.11ty.dev/) to statically generate my site. The goal is to use [TailwindCSS](https://tailwindcss.com/) to style the look and feel of the site with the expectation of ease and speed.

This is going to be the start of a series of articles that will show the progression of setting up a base template that will include Eleventy as the static site generator and TailwindCSS as the css framework. There will be additional tooling along the way that we will discover together. Please enjoy the journey!

%carbon%

## Let's get started

### Put up the scaffolding

```bash
  $ mkdir 11ty-tailwind-base
  $ cd 11ty-tailwind-base
  $ npm init
```

> Run through the `npm init` prompts.

You will end up with a `package.json` that looks something like this:

```json
  {
    "name": "11ty-tailwind-base",
    "version": "1.0.0",
    "description": "",
    "main": "index.js",
    "scripts": {
      "test": "echo \"Error: no test specified\" && exit 1"
    },
    "author": "",
    "license": "ISC"
  }
```

### Turn on the 11ty

Install the first dependency:

```bash
  $ npm install @11ty/eleventy
```

What we just installed is [@11ty/eleventy](https://www.npmjs.com/package/@11ty/eleventy) - The eleventy static site generator.

### Source control it

Now that we have packages installed lets get the project in source control.

First create `.gitignore` so we keep a few files and folders out that don't need to be tracked.

`.gitignore`

```text
  node_modules
  .env
  .vscode
  .DS_Store
```

Next, initialize your git repo and make the first commit.

```bash
  $ git init
  $ git add .
  $ git commit -a -m "Initial Commit"
  $ git branch -M main
```

> We don't have masters so main is it!

### Folder structure

We will now create the rest of our structure.

```bash
  11ty-tailwind-base/
  ├─ src/
  │  ├─ site/
  │     ├─ _includes
  │        ├─ layouts
  │        ├─ css
  │     ├─ articles
  ├─ node_modules/
  ├─ .gitignore
  ├─ package.json
  ├─ package-lock.json
```

Use the following commands to make the `src` folder and subfolders:

```bash
  $ mkdir -p src/site
  $ cd src/site
  $ mkdir -p _includes/layouts
  $ mkdir -p _includes/css
  $ mkdir articles
```

In our `src/site` folder, we now have a few new folders:

* `_includes/layouts`, contains the Nunjucks layouts.
* `_includes/css`, contains the CSS files.
* `articles`, contains the content for article posts.

### Building the layout

The first step is creating the base layout which will be used on all pages:

`src/site/_includes/layouts/base.njk`

```html
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="robots" content="max-snippet:-1, max-image-preview: large, max-video-preview: -1">
      <title></title>
      <meta name="referrer" content="no-referrer-when-downgrade">
      <link rel="preconnect" href="/" crossorigin>
    </head>
    <body>
      <header>
        <a class="/">Eleventy Base Template</a>
      </header>
      <main>
        {{ content | safe }}
      </main>
    </body>
  </html>
```

Next, let's use the base to create the index page:

`src/site/index.njk`

```html
  ---
  title: 
  layout: base
  ---

  <h2>Welcome!</h2>
```

### Setup 11ty

Create the `.eleventy.js` file:

`.eleventy.js`

```javascript
  module.exports = function(eleventyConfig) {

    // base.njk aliased to base for easier access
    eleventyConfig.addLayoutAlias('base', 'layouts/base.njk');
    
    return  {
      dir: {
        // Where to look for our site
        input: "src/site",
        includes: "_includes",
        // Where to place our generated site
        output: "dist"
      },
      passthroughFileCopy: true,
      templateFormats : ["njk", "md"],
      htmlTemplateEngine : "njk",
      markdownTemplateEngine : "njk",
    };
  };
```

Next, update `package.json` with the scripts to serve the site:

`package.json`

```json
  {
    "name": "11ty-tailwind-base",
    "version": "1.0.0",
    "description": "",
    "main": "index.js",
    "scripts": {
      "start": "npm run serve",
      "serve": "eleventy --serve",
      "test": "echo \"Error: no test specified\" && exit 1"
    },
    "author": "",
    "license": "ISC",
    "dependencies": {
      "@11ty/eleventy": "^0.11.1"
    }
  }
```

What we added was `start` and `serve`:

* `serve` builds and serves the site using eleventy.
* `start` right now only alls `npm run serve` for ease. All you have to type is `npm start` to get the site running.

### Finally, Run IT!

Run `npm start` and you will get something like this:

```bash
  > 11ty-tailwind-base@1.0.0 serve
  > eleventy --serve

  Writing dist/index.html from ./src/site/index.njk.
  Wrote 1 file in 0.06 seconds (v0.11.1)
  Watching…
  [Browsersync] Access URLs:
  -------------------------------------
        Local: http://localhost:8080
      External: http://192.168.1.16:8080
  -------------------------------------
            UI: http://localhost:3001
  UI External: http://localhost:3001
  -------------------------------------
  [Browsersync] Serving files from: dist
```

Now you are up and running with the bare bone 11ty site.

Follow along with the source code: [11ty-tailwind-base - Part I](https://gitlab.com/dantuck/11ty-tailwind-base/-/tree/part-1)