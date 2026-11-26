---
id: standards-that-stick
title: Standards that stuck
dek: The standards of mine that lasted were libraries and starter code that people could install or copy.
date: 2026-11-21
tags: [architecture, standards, leadership]
toc: false
draft: false
---
Most standards I've written got ignored. A few became the default without anyone being told to use them.

Someone senior writes a long wiki page on logging, naming, and how services should call each other. It gets approved in a meeting and then nobody opens it again. Following the page takes extra work, and people on a deadline skip extra work.

## Code people could install or copy

Every standard of mine that stuck was something people could install or copy.

When I worked with Microsoft's Site Reliability Engineering group, the problem was logging. Each service did it a bit differently, so following one request across services was slow and painful. So I built a logging library. You added it to your service and you were logging the right way with almost no effort. Teams picked it up because it saved them from writing their own, and over time it became the department's standard.

I did the same with a reference microservice architecture. I built one, working and documented, and later services were built off it. Teams could see it running and copy it, so it spread without much push from me.

At Solution Stream it was a shared .NET codebase. New projects started from it, so they all began with the same structure and the same bug fixes, and they stayed consistent.

Looking back, the ones that lasted had more in common. They set firm rules for the boring stuff like logging, naming and project layout, and the team that owns a problem made its own design decisions.

They were also easy to change. I took pull requests, and when a team found a better way I folded it in so everyone got it. Each one had an owner who fixed it when it broke.

I still write a lot of documents. The ones I come back to record why we picked a database, or what we gave up to get there. That's what architecture decision records are for, and they pay off years later when someone asks why the system looks the way it does. I keep ADRs and shared libraries side by side. The ADR holds the reasoning, and teams use the library day to day.

A year later I check whether teams still use a standard. Teams still use the logging library.
