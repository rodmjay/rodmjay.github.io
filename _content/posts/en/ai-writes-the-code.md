---
id: ai-writes-the-code
title: With AI writing the code, architecture matters more
dek: Code got cheap. Figuring out what to build didn't.
date: 2026-11-21
tags: [ai, architecture, delivery]
toc: false
draft: false
---
I keep hearing that AI coding tools will make architects less necessary. The argument goes that if a model can write the service, you don't need someone deciding how services get built.

I don't think that's right. The typing got cheap. Picking what to build is as hard as ever, and backing out a bad call still hurts just as much.

## A lot more code, very fast

Give a team good AI tools and the first thing you notice is volume. Pull requests get bigger and show up faster. A prototype that used to take a week takes an afternoon.

Without direction, all that volume just gets you to a mess sooner. A model will happily write a fifth way to call the same API. It'll make up its own error format if you let it. Each PR looks fine on its own, and a few months of them later nobody can explain how the system hangs together. So you need everyone, people and models, following the same patterns.

In a clean codebase with clear patterns, what a model writes fits right in. Give it a repo with five competing styles and it'll grab whichever one it happens to see. That's why the boring work (shared libraries, reference services, a consistent project layout) turns out to be about the best prompt you can give a model. New engineers have always learned the system from a good reference service, and now the models do too.

Decision records matter more for the same reason. A model can't walk over and ask the engineer who left two years ago why things are built this way. If somebody wrote the reasoning down, the model can read it.

## Review can't keep up

When code shows up faster, it piles up in human review. The fix is to move checks earlier and automate them.

- Scan dependencies, secrets and known weak patterns on every change, in the pipeline. Don't save it for a quarterly audit.
- Tests are the contract. If a behavior matters, it has a test. Then I don't care much whether a person or a model wrote the code.
- Deployments should be automated and boring, so shipping is routine and rolling back is easy.
- Clear boundaries between services keep a mistake in one place from spreading.

With that in place, reviewers can spend their time on what machines still judge badly, like whether we should build this at all and whether it fits where the system is going.

## The part AI doesn't touch

You still need someone who understands the business well enough to know what the system is for. That person weighs cost against speed and flexibility against simplicity, thinks about what we'll need in five years and not just now, gets the teams pulling the same way, and says no when it's needed. None of that is new.

If your team is picking up these tools, here's what I'd actually do first.

1. Clean up one reference service and make it the example everyone starts from, models included.
2. Write your ten biggest decisions down as short decision records.
3. Move one manual check into the pipeline this month.
4. Measure what ships and whether it works, not lines of code.

I've been building software for about 21 years, and this is the biggest change I've seen in how it gets built. If your architecture's a mess, you'll just find out faster.
