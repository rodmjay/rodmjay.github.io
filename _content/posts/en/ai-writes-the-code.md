---
id: ai-writes-the-code
title: What architects do when AI writes the code
dek: Notes on what changes for software architecture once models write a lot of the code.
date: 2026-11-21
tags: [ai, architecture, delivery]
toc: false
draft: false
---
I keep hearing that AI coding tools will make architects less necessary. The argument goes that if a model can write the service, you don't need someone deciding how services get built.

I disagree with that. Choosing what to build is as hard as it ever was, and backing out a bad call hurts as much as it always has. A model typing the code doesn't change either of those.

## A lot more code, very fast

Give a team good AI tools and the first thing you notice is volume. Pull requests get bigger and show up faster, and a prototype that used to take a week can be done in an afternoon. Without direction, that volume piles up into a mess. A model will happily write a fifth way to call the same API, and it'll make up its own error format if you let it. Each PR can look reasonable when you review it, and after a few months of them nobody can explain how the system hangs together. That's why I want people and models following the same patterns.

A model copies what it finds in the repo. In a repo with five competing styles, it grabs whichever one it happens to see. New engineers have always learned the system from a good reference service, and models learn from it the same way, so the boring work of shared libraries and reference services, along with a consistent project layout, gives a model some of the best guidance it can get.

Written decision records help for the same reason. If somebody wrote down why things are built this way, a model can read it. The engineer who made the call may have left two years ago.

## Review can't keep up

When code shows up faster, it piles up waiting for human review. I'd move checks earlier in the process and automate them.

- Scan every change in the pipeline for risky dependencies, leaked secrets and known weak code patterns. A quarterly audit is too slow for this volume.
- Treat tests as the contract. If a behavior matters, it has a test, and once it does I don't care much whether a person or a model wrote the code.
- Automate deployments so shipping is routine and rolling back is easy.
- Keep clear boundaries between services so a mistake in one place stays there.

With those in place, reviewers can spend their time on questions machines still answer badly, like whether we should build this at all and whether it fits where the system is going.

## What still needs a person

You still need someone who understands the business well enough to know what the system is for. That person weighs cost against speed and flexibility against simplicity. They plan for what we'll need in five years as well as today. They get the teams pulling the same way, and they say no when it's needed. Architects have always done this work.

If your team is picking up these tools, I'd start with these four things.

1. Clean up one reference service and make it the example everyone starts from, models included.
2. Write your ten biggest decisions down as short decision records.
3. Move one manual check into the pipeline this month.
4. Track what ships and whether it works.

I've been building software for about 21 years, and this is the biggest change I've seen in how it gets built. Teams with messy architecture are going to feel the problems sooner.
