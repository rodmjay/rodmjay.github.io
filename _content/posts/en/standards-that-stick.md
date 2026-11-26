---
id: standards-that-stick
title: Standards people actually use
dek: For me, the standards that lasted were libraries and starter code, not wiki pages.
date: 2026-11-21
tags: [architecture, standards, leadership]
toc: false
draft: false
---
Most standards I've written got ignored. A few became the default without anyone being told to use them, and it wasn't about who approved them.

Someone senior writes a long wiki page on logging, naming, and how services should call each other. It gets approved in a meeting and then nobody opens it again. It isn't stubbornness. Following the page is extra work, and on a deadline people skip extra work.

## The ones that worked were code

Every standard of mine that stuck was something people could install or copy.

When I worked with Microsoft's Site Reliability Engineering group, the problem was logging. Each service did it a bit differently, so following one request across services was slow and painful. I could have written a logging guideline. I built a library instead. You added it to your service and you were logging the right way with almost no effort. It became the department's standard without anyone mandating it, mostly because it was less work than writing your own.

Same with a reference microservice architecture. I didn't write up what a good service should look like. I built one, working and documented, and later services were built off it. People copy whatever already works, so a working example spreads on its own.

At Solution Stream it was a shared .NET codebase. New projects started from it, so they all started with the same structure and the same bug fixes. We never had to police consistency.

Looking back, the ones that lasted had a few other things in common. They were opinionated about the boring stuff, logging and naming and project layout, and left the real design decisions to the team that owns the problem. They were easy to change. If you can't improve a standard, people end up fighting it instead, so take pull requests, and when a team finds a better way, fold it in so everyone gets it. And someone has to own it and fix it when it breaks.

I still write a lot of documents. The useful ones record why we picked a database, or what we gave up to get there. That's what architecture decision records are for, and they pay off years later when someone asks why the system looks the way it does. An ADR is the why. The library is the thing people actually use. You need both.

My test is whether people are still talking about it a year later. If they aren't, it worked. Nobody brings up the logging library anymore. They just use it.
