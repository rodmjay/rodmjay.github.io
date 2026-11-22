---
id: ai-writes-the-code
title: When AI writes the code, architecture matters more
dek: AI made writing code cheap. It didn't make deciding what to build cheap, which is why architecture matters more now, not less.
date: 2026-11-21
tags: [ai, architecture, delivery]
toc: false
draft: false
---
A common prediction says AI coding tools will make architects less necessary. If a model can write the service, why do you need someone deciding how services should be built?

I think it's the opposite. AI made writing code cheap. It didn't make deciding what to build cheap, and it didn't make bad decisions any cheaper to undo.

## More code, faster, in more directions

Give a team good AI tools and the first thing you notice is volume. Pull requests get bigger and arrive faster. Prototypes that took a week take an afternoon.

That's real, and it's good. But volume without direction is just a faster way to build a mess. A model will happily write a fifth way to call the same API, invent a slightly different error format, or pull in a library nobody else uses. Every piece looks fine on its own. Together they make a system nobody can reason about.

The faster code is produced, the more it matters that everyone, people and models, is building toward the same shape.

## The patterns are the prompt

Here's what I've found works: models copy what's in front of them. Point an AI tool at a clean codebase with clear patterns and it writes code that fits. Point it at a codebase with five competing styles and it picks one at random.

So the old architecture work, shared libraries, reference services, consistent structure, turns out to be the best prompt you can write. A good reference implementation used to teach new engineers. Now it also teaches every model working in the repo.

Decision records matter more too. A model can't ask the person who left two years ago why the system is built this way. If the reasoning is written down, it can read it.

## Guardrails beat review

When code arrives faster, human review becomes the bottleneck. You can't fix that by asking reviewers to read faster. You fix it by moving checks earlier and making them automatic:

- **Security checks in the pipeline,** not in a quarterly audit. Scan dependencies, secrets and known weak patterns on every change.
- **Tests as the contract.** If the behavior matters, it has a test. Then it doesn't matter who or what wrote the code.
- **Automated, boring deployments,** so shipping is routine and rolling back is easy.
- **Clear boundaries between services,** so a mistake in one place stays in one place.

Reviewers then spend their time on the questions machines can't answer well: is this the right thing to build, and does it fit where the system is going?

## What doesn't change

Some things AI doesn't touch at all.

Someone still has to understand the business well enough to know what the system is for. Someone has to weigh trade-offs: cost against speed, flexibility against simplicity, now against five years from now. Someone has to get different teams pulling in the same direction. And someone has to say no.

That was always the job. The tools just made it more obvious.

## Where I'd start

If your team is adopting AI coding tools, here's what I'd do first:

1. **Clean up one reference service** and make it the example everyone, and every model, starts from.
2. **Write down your top ten decisions** as short decision records.
3. **Move one manual check into the pipeline** this month.
4. **Measure what ships, not lines written.** Lines of code were never the point.

AI is the biggest change to how software gets built that I've seen in 21 years. It rewards teams with good architecture and punishes teams without it, faster than ever.
