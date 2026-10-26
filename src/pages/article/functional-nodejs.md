---
layout: '../../layouts/BlogPost.astro'
publishDate: 10 Mar 2020
title: "Functional Programming with JavaScript"
author: dantuck
description: |
    This is the first post in a series focused on NodeJS. Node is an asynchronous event-driven JavaScript runtime for building scalable network applications. Just like JavaScript, NodeJS is not actually a functional programming language but is a good place to use functional programming if you so please.
categories:
- Code
tags:
- code
- nodejs

---
## Hello!

This is the first post in a series focused on [NodeJS](https://nodejs.org/en/about/ "NodeJS"). Node is an asynchronous event-driven JavaScript runtime for building scalable network applications. Just like JavaScript, NodeJS is not actually a functional programming language but is a good place to use functional programming if you so please.

## So what is functional programming?

Functional programming is a programming pattern. Generally it can be used in many different language but some are specifically geared toward it such as Haskell and Lisp. It is not that you cannot do it in other languages but instead it is just a design decision in most cases.

For the purpose of this article I am focusing on some of the basics of functional programming. Functional programming does the following at its core:

* Treats computations as the evaluation of mathematical functions.
* Avoids changing state and mutable data.

## Functional Programming Concepts

There are five main concepts:

* Side Effects
* Pure Functions
* Functions as first class citizens
* Higher order function
* Currying

### Side Effects

A function would have a side effect if it modifies state outside its local scope. For functional programming a function should not impact code that is running on multiple processors.

### Pure Functions

When a function always returns the same output for a given input without any side effects then it would be called a **pure function**.
```js
    // pure: the same input always gives the same output
    const add = (a, b) => a + b;

    add(2, 3); // 5

    // impure: the output depends on the clock, so it changes between calls
    const time = () => new Date().toLocaleTimeString();
```
### Functions as first class citizens

A function is a considered a first class citizen when a function accepts functions as arguments
or even be assigned as a variable.
```js
    // variable f is assigned the value of the function
    const f = a => console.log(a)
```
### Higher order function

Like a first class citizen a higher order function takes one or more functions as arguments or returns a function as a result.
```js
    // function apply
    // takes a function f and a value a
    // and returns the result of calling f with a
    const apply = (f, a) => f(a);

    // function greeter
    // takes a greeting and returns a new function
    const greeter = greeting => name => `${greeting}, ${name}`;

    apply(a => a * 2, 4); // 8
    greeter('Hello')('World'); // 'Hello, World'
```
### Currying

Currying turns a function that takes several arguments into a chain of functions that each take one. Each nested function has access to the arguments of the functions around it. The final nested function returns the result.
```js
    const curry = f => a => b => f(a, b);

    const talk = (a, b) => 'Say: '.concat(a, ' ', b);

    let say = curry(talk);
    say('Hello')('World');
```
### Inspiration and Credits

[About NodeJS](https://nodejs.org/en/about/ "About NodeJS")

[Wikipedia Functional programming](https://en.wikipedia.org/wiki/Functional_programming "Wikipedia Functional programming")

## Changelog

> **2026-10-26**
>
> * Replaced the pure function example. The old one, `time()`, was not pure because its output changes between calls.
> * Replaced the higher order function example with one that takes and returns a function.
> * Corrected the description of currying. It is not the same thing as function composition.
> * Fixed typos.
