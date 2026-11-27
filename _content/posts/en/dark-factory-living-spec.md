---
id: dark-factory-living-spec
title: "The dark factory: the specification as a living document"
dek: Stop writing specs. Put requirements in versioned sinks, compose the spec from them, and give agents only the diff.
date: 2026-11-27
tags: [architecture, ai]
cover: /blog/media/dark-factory-living-spec.jpg
cover_alt: A stylized dark factory glowing in a mountain valley at night, its light mirrored in a still lake.
toc: false
draft: false
---
A dark factory runs lights-out. The machines build, nobody stands on the floor. The control program is the specification, and that only works if the spec is alive.

Here is the whole model:

- Requirements live in sinks.
- Approving a change recomposes the spec into a new version.
- Agents build the diff between versions.

People don't write the spec and they don't work the floor. They tend the requirements. Everything else is derived.

![Typed requirement sinks (product, standards, security) compose into a versioned specification; an agent builds the diff between versions, and any source becomes a sink by speaking a small MCP contract: list, get a version, diff two versions.](/blog/media/dark-factory-diagram.png "The loop: requirements in, spec and diff out.")

## Derive the spec, don't maintain it

Every team has a spec that was true once. It rots because keeping it current was never anyone's job on a deadline. So stop treating the spec as a document you maintain. A fact you can compute from its source should be computed, and a spec is a computed thing: the composition of the requirements that are true right now. Write the requirements. Generate the spec.

## Sinks

A sink is a typed source of requirements, one concern each, with one owner. Product in one, security in another, then design, performance, cost. The owner approves changes to their sink, so nobody argues about where a requirement belongs.

Today a sink is a repo, or a folder in one. Shared standards get their own repo and feed many workspaces, versioned and pinned exactly like a shared library. A workspace declares the sinks it composes and the version of each. Bumping a version is a decision that shows you the diff before you take it.

## Agents build the diff

Approve a change and the spec recomposes: version 2, version 3, the old versions kept. Now "what changed" has an exact answer. Hand an agent the whole spec and it rereads everything and redoes finished work. Hand it the diff and the job is small and precise: add these three requirements, change this one, drop that one. Each carries its id and its reason, so the agent knows which test to write. Cost tracks the size of the change, not the size of the system.

## MCP makes anything a sink

Repos are where you start, not where this ends. A requirements source has to answer three questions: what are your requirements, at what version, and what changed between two versions. Define that as a small contract and serve it over MCP, and the source stops mattering. A repo, a Postgres table, a ticketing system, a design tool, a compliance register: each becomes a sink the moment it speaks the contract. Well-known endpoints, one shared schema, versions and diffs in a fixed shape. The workspace composes them and never cares what sits behind each one.

This is the leverage. Your requirements already live in a dozen systems. MCP lets you compose them where they are instead of copying them into a document that drifts the day after you write it. The contract is small on purpose: list, get a version, diff two versions. Keep it that small and everything plugs in.

## Start this week

1. Pick one product and three sinks with different owners: the product, a shared standard, and security.
2. Put each in a repo and pin a version in the workspace.
3. Compose the spec at build time. Never hand-edit the output.
4. On the next change, generate the diff and give an agent only that, with each requirement's id and reason attached.
5. When a second system holds requirements you keep copying by hand, put the MCP contract in front of it and make it a sink too.

Use the fewest sinks that have different approvers. Make the approval the merge your team already does. The spec stays current because nobody is keeping it current.
