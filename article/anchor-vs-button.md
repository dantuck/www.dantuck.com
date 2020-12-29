---
date: 2019-11-20T14:45:02-06:00
draft: true
title: "Anchors vs. Buttons"
layout: layouts/post.njk

---

I have recently been drawn to understand the difference between `<button>` and `<a>`.
When and why to use each can spur up discussions and opinion that are sometimes borderline
unfounded and don't have a backing of fact.

How are they different?

The `<a>` and `<button>` elements can look exactly the same
through styling. But, if you look at them semantically
they have different purposes.

An Anchor element, `<a>`, is by definition a hyperlink.
Because it is a link it has the css pseudo-classes `:link` and
`:visited` available to it; along with others such as `:hover`,
`:active` and `:focus`.

In addition to styling action, the action performed when clicking
or pressing the enter key has an expected outcome of navigating
away to another page or section on that page.

A Button element, `<button>`, does nothing. What I mean here is
it has no default behavior. Clicking, pressing enter or space
will render no action unless embedded in a form that has an action
or assigning JavaScript to the button such as onclick.

So what is the problem?

First lets start with a button. As you remember the button
has no default behavior so it relys on JavaScript to
perform some action. Because of this reliance a user requires
JavaScript to be enabled.

So that takes us to the Anchor tag. In order to accomplish a
button like experience but with a more symantic solution, the
anchor element must be modified.

1. If at all possible use href for linking and onclick for
JavaScript actions.
2. If using JavaScript actions then try to add a meaningful
fallback link in the href attribute.
3. Alter the symantics of the anchor element by adding
role="button" to help your screen readers.
4. Help the screen readers still use the spacebar to click
on the link by adding JavaScript to bind to the keyup of
event.keyCode == 32 (spacebar) and have it click the link.

I also like to point out some security awareness. If you have
an anchor or button element that is using an onclick event
that takes you to a url, you are hiding the location from the
user until they click the button. If you change it to an href
you will be able to provide the user peace of mind knowing
they are going to a trusted location.
