---
date: 2020-03-10
title: "Functional Programming with JavaScript"
categories:
- Code
tags:
- Code
- NodeJS
layout: layouts/post.njk

---
## Hello!

This is the first post in a series focused on [NodeJS](https://nodejs.org/en/about/ "NodeJS"). Node is a asynchronous event-driven JavaScript runtime for building scalable network applications. Just like JavaScript, NodeJS is not actually a functional programming language but is a good place to use functional programming if you so please.

## So what is functional programming?

Functional programming is a programming pattern. Generally it can be used in many different language but some are specifically geared toward it such as Haskell and Lisp. It's not that you can't do it in other languages but instead it is just a design decision in most cases.

For the purpose of this article I am focusing on some of the basics of functional programming. Functional programming does the following at it's core:

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
    // time 
    const time = () => new Date().toLocaleTimeString();

    time();
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
    // function f 
    // takes an input of a
    // and logs the value of a
    const f = a => console.log(a);

    // function f2
    // takes an input of a
    // a could be a value or function
    // and returns a
    const f2 = a => a;

    f('output 1') // console logs 'output 1'
    f2('output 2') // doesn't print anything just returns the value 'output 2'
    f2(f('output 3')) // console logs 'output 3'
```
### Currying

Currying is a composed function. It can be imagined as a function with nested functions that each nested function has access to the outer functions arguments. The final nested function would return the result of the function.
```js
    const curry = f => a => b => f(a, b);

    const talk = (a, b) => 'Say: '.concat(a, ' ', b);

    let say = curry(talk);
    say('Hello')('World');
```
### Inspiration and Credits

[About NodeJS](https://nodejs.org/en/about/ "About NodeJS")

[Wikipedia Functional programming](https://en.wikipedia.org/wiki/Functional_programming "Wikipedia Functional programming")