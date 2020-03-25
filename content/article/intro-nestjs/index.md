---
date: 2020-03-19 6:55:00 -0600
title: "NestJS: Getting started"
categories:
- Code
tags:
- Code
- NodeJS
- Nest

twitter:
    card: "summary_large_image"
    site: "@me_dantuck"
    title: "NestJS: Getting started"
    description: "Getting started with NestJS."
    image: "https://www.dantuck.com/article/node-getting-started/card.png"
---

## What is Nest?

This is the next post in a series of articles as I explore NodeJS. If you need to go back one and get Node setup and running check this one out: [NodeJS: Getting started](/article/node-getting-started/).

First, what is Nest? It is essentially a Node.js framework for building efficient server side applications. The really cool part about it is it uses [TypeScript](https://www.typescriptlang.org/). Nest also incorporates elements of Object Oriented Programming, Functional Programming, and Functional Reactive Programming.

## Installation

You have two pretty good options to install; [Nest CLI](https://docs.nestjs.com/cli/overview) or cloning the [starter project](https://github.com/nestjs/typescript-starter).

Lets start with scaffolding a new project with the Nest CLI:

    $ npm i -g @nestjs/cli
    $ nest new my-app

Easy steps above. First, you installed the global npm nestjs cli package. You then can access the nest cli to create a new scaffolding for a nest app.

Now to option two. Installation by cloning takes a few more steps:

    $ git clone https://github.com/nestjs/typescript-starter.git my-app
    $ cd my-app
    $ npm install
    $ npm run start

The steps first of all don't give you the Nest CLI which I consider a disadvantage. Here you are cloning the starter into a new directory `my-app` and then after changing into that directory you inevitably use `npm` to install app dependencies and start the app.

After all this you will be up and running and your app will be available at `http://localhost:3000/`

### Inspiration and Credits

[NestJS Introduction](https://docs.nestjs.com/)