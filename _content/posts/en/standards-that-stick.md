---
id: standards-that-stick
title: Put your standards where your agents work
dek: Write the standards down, build them into the workflow, and make your AI agents load them.
date: 2026-11-21
tags: [architecture, standards, leadership]
toc: false
draft: false
---
A standards page on a wiki gets skipped on deadlines, and an AI agent never sees it. I now follow three steps.

## 1. Write the standard as text

Keep each standard short and in markdown: naming, logging, error format, how services call each other, how we write. People and agents can both read it.

Put the standards in their own repo, outside your monorepo. Every product and every agent then reads the same copy, and a change to a standard gets its own review and history instead of getting buried in a feature pull request. Each code repo pulls the standards in through a package, a git submodule or the MCP server described below.

## 2. Build it into the workflow

Put the standard where the work happens:

- a shared library or starter template that already follows it
- a lint rule or CI check that fails the build when it's broken
- a review checklist built from the same file

## 3. Make your agent load it

With Claude Code there are a few ways to do this:

- **CLAUDE.md** in the repo points to the standards files, so every session reads them.
- **Skills** package a standard with its steps, for example "write a migration" or "write release notes".
- **Hooks** run a check on their own, before a commit or after a file is written, and stop work that breaks the standard.
- **An MCP server** can serve your standards to any agent. Give it one tool to look up a standard and one to check a draft against it, and every tool your team uses reads the same source.

## Keep it current

When someone finds a better way, change the standard in one place, then update the library, the checks and the agent instructions from it. Give each standard an owner. When you make a call someone will question later, write an ADR with the reasoning.

## Start small

1. Pick one standard your team argues about.
2. Write it as a short markdown file in a separate standards repo.
3. Add one automated check for it.
4. Point CLAUDE.md at it and add a hook that runs the check.
