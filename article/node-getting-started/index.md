---
date: 2020-03-17 06:30:00
title: "NodeJS: Getting started"
categories:
- Code
tags:
- Code
- NodeJS
layout: layouts/post.njk

twitter:
    card: "summary"
    site: "@me_dantuck"
    title: "NodeJS: Getting started"
    description: "Install NodeJS with this simple guide. #100DaysOfCode #Nodejs"
    image: "https://www.dantuck.com/article/node-getting-started/card.png"
---

## Installing NodeJS

First things first; [download Node](https://nodejs.org/en/download/). You have a few options to install and all options are outlined on Node's download page. I would recommend the LTS version unless you feel that you need close to latest as possible. Installation is generally really easy and in most case a point and click away. You do have options for installation through package managers but keep in mind those don't always deliver the latest and greatest.

### What about running more than one NodeJS version

Multiple version of Node may be needed for different projects you are working on. This is not always the easiest to maintain until [Node Version Manager (NVM)](https://github.com/nvm-sh/nvm) entered the market. NVM is a really cool package that allows you to manage multiple version of Node on a single machine.

You can install NVM on most developer system with exception of Windows unless you are running WSL.

### Install and Using

Installation instructions are kept up-to-date on the NVM GitHub page so I strongly recommend you going to their site to get the latest installation instructions but here is an outline of the process at the time of writing this article.

Install using either cURL or Wget:
``` bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
```
or
``` bash
    wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
```
You can take their word for the safety of these install scripts but I always recommend to inspect a script coming from the internet before running it locally.

The installation is pretty simple. The script clones the nvm repository to ~/.nvm, and attempts to add the source lines from the snippet below to the correct profile file (`~/.bash_profile`, `~/.zshrc`, `~/.profile`, or `~/.bashrc`).
``` bash
    export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")" 
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
```
Next you will install a version of Node and use it.

To install the latest LTS run:
``` bash
    nvm install --lts
```
To install the latest Node version:
``` bash
    nvm install node
```
Next use it:
``` bash
    npm use --lts
```
or
``` bash
    npm use node
```
## Test it out

Back to Node. You should now have Node installed and have a version set to use if you chose NVM.

To test out your installation you are going to create a file called `app.js` and use a code snippet from the NodeJS docs.

### > app.js
``` js
    const http = require('http');

    const hostname = '127.0.0.1';
    const port = 3000;

    const server = http.createServer((req, res) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Hello World');
    });

    server.listen(port, hostname, () => {
        console.log(`Server running at http://${hostname}:${port}/`);
    });
```
**> Start the app up with `node app.js`:**

{{< img class="code" src="node-app-running" type="png" alt="Node app running" >}}

**> The result of the app in the browser should look like:**

{{< img src="node-app-running-browser" type="png" alt="Node app running" >}}

### Inspiration and Credits

[Node Getting Started](https://nodejs.org/en/docs/guides/getting-started-guide/)

[Node Version Manager](https://github.com/nvm-sh/nvm)