---
id: standards-that-stick
title: Standards that stick
dek: Most engineering standards die in a wiki. The ones that stick are code people want to use. Here's what made the difference for me.
date: 2026-11-21
tags: [architecture, standards, leadership]
toc: false
draft: false
---
I've written engineering standards that nobody followed. I've also built a few that became the default without anyone being told to use them. The difference had almost nothing to do with authority.

## The wiki page that dies

You know the pattern. Someone senior writes a long page: how we log, how we name things, how services talk to each other. It gets a meeting and a round of approval. Then it gets ignored.

Not because engineers are stubborn. Because following it costs something, and ignoring it costs nothing. The page asks people to do extra work on a deadline, and the deadline always wins.

A standard that depends on everyone remembering to follow it is a wish.

## Make the right way the easy way

The standards that stuck for me all had one thing in common: they were code, not documents.

When I worked with Microsoft's Site Reliability Engineering group, the problem was logging. Every service did it a little differently, so following one request across services was slow and painful. Instead of writing a logging guideline, I built a logging library. Add it, and your service logged the right way with almost no effort.

It became the department's standard. Nobody mandated it. It was simply less work than doing it yourself.

The same thing happened with a reference microservice architecture. I didn't describe what a good service should look like. I built one, working and documented, and it became the model later services were built from. Engineers copy what works. Give them something worth copying.

At Solution Stream it was a shared .NET codebase. Every new project started from it, so every project got the same structure, the same patterns and the same fixes on day one. Consistency wasn't a rule anyone had to enforce. It was the starting point.

## What makes a standard stick

Looking back, these are the things that mattered:

1. **It saves time on day one.** If adopting the standard is slower than ignoring it, people will ignore it. Lead with the shortcut.
2. **It's opinionated about the boring parts only.** Standardize logging, structure, deployment and naming. Leave the interesting design decisions to the team that owns the problem.
3. **There's a working example.** One real service built the right way teaches more than any document.
4. **It's easy to change.** A standard you can't improve turns into a fight. Take pull requests. When a team finds a better way, fold it in so everyone gets it.
5. **Someone owns it.** Shared code with no owner rots. Give it a maintainer and a way to report problems.

## Where documents still help

I'm not against writing things down. I write a lot of them. The useful kind records *why*: why we chose this database, why services talk this way, what we gave up. That's what an architecture decision record is for, and it pays off years later when someone asks "why is it like this?"

The document explains the decision. The code carries it out. When you only have the document, you have a standard on paper. When you have the code, you have a standard in production.

## The real test

Here's how I judge whether a standard worked: a year later, is anyone still talking about it?

The best ones disappear. Nobody debates the logging library anymore. They just use it, and they spend their energy on the work that actually needs them.
