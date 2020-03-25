---
date: 2020-03-24 6:00:00 -0600
title: "NestJS: VSCode debugger setup"
categories:
- Code
tags:
- Code
- NodeJS
- Nest
- VSCode

# twitter:
#     card: "summary_large_image"
#     site: "@me_dantuck"
#     title: "NestJS: VSCode debugger setup"
#     description: "Setup VSCode Debugger for NestJS."
#     image: "https://www.dantuck.com/article/node-getting-started/card.png"
---

Debugging is inevitable for all developers and when you get the point that your code is not doing what you would expect

[VSCode](https://code.visualstudio.com/) is definitely built for [TypeScript](https://www.typescriptlang.org/) and thus perfect for NestJS. Get started by ensuring you have VSCode installed and open your project in VSCode. For the purpose of this article install the Nest TypeScript starter scaffolding.

    $ npm i -g @nestjs/cli
    $ nest new my-app

Create a `launch.json` file:

{{< codeattr name=${workspaceFolder}/.vscode/launch.json >}}

    {
        // Use IntelliSense to learn about possible attributes.
        // Hover to view descriptions of existing attributes.
        // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
        "version": "0.2.0",
        "configurations": [
            {
                "type": "node",
                "request": "launch",
                "name": "Launch Program",
                "skipFiles": [
                    "${workspaceFolder}/node_modules/**/*.js",
                    "<node_internals>/**"
                ],
                "program": "${workspaceFolder}/src/main.ts",
                "preLaunchTask": "tsc: watch - tsconfig.build.json",
                "outFiles": [
                    "${workspaceFolder}/dist/**/*.js"
                ]
            }
        ]
    }

Now you can set breakpoints and `Debug -> Start Debugging` or press `F5`.