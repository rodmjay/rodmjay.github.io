---
id: dark-factory-living-spec
title: "The dark factory: the specification as a living document"
dek: You edit the requirements, the spec writes itself, and agents build the difference between one version and the next.
date: 2026-11-27
tags: [architecture, ai]
cover: /blog/media/dark-factory-living-spec.jpg
cover_alt: A stylized dark factory glowing in a mountain valley at night, its light mirrored in a still lake.
toc: false
draft: false
---
A dark factory runs with the lights off. Machines do the building and nobody stands on the floor.

I think software can work this way. The control program is the specification, and it has to stay alive.

## The idea

You edit the requirements. The spec writes itself. The factory builds the difference.

1. Requirements live in sinks.
2. Approve a change and the spec recomposes into a new version.
3. Agents build the diff between versions.
4. You work the requirements, and the factory works the floor.

People don't write the spec in this picture, and they don't work the floor. They tend the requirements.

## Why the spec has to be derived

Every team has a spec that was true once. Someone wrote it with care, the product moved, and the page stayed put. Nobody chose to let it rot. Keeping it current was never anyone's job on a deadline day.

I keep a rule for myself: when a fact can be computed from its source, compute it. A value you have to keep updating will drift, and a derived one can't. A spec is a derived value we've been treating as a document. So stop writing it, and compose it.

## Sinks

A sink is a place requirements live, one kind each. A product sink holds what the product must do. Others hold tech standards, design standards, security, speed and uptime and cost. Each has an owner who knows that kind of thing, so nobody argues about where a requirement belongs.

A sink is a repo, or a folder in one. Shared standards get their own repo and feed many workspaces, like a design system with its design standards beside it. Requirements for one product stay with the product. A workspace chooses which sinks it composes and which version of each.

If you've shared a code library across products, this is the same move. The thing shared, versioned and pinned is a standard instead of code, and moving to a new version is a choice that shows you exactly what changed.

## Approval makes a version

A change to a sink waits until the right person approves it. Product changes go to the product owner. A security rule goes to security. When it passes, the spec recomposes and gets a new version. Version one, version two, version three, and the old ones stay.

Now "what changed?" has a precise answer. Put two versions side by side and you get the diff: this requirement added, that one reworded, this one dropped.

## Build the difference

An agent handed a whole spec has to guess what is new. It rereads everything and sometimes redoes finished work. An agent handed the diff has a small, exact job: implement these three, change this one, remove that one. The work and the cost track the size of the change. Each requirement in the diff carries its reason and its id, so the agent knows what test to write or update.

## One idea to explore

If a repo can be a sink, so can anything that speaks a standard interface. Define what a requirements source must answer, give it well-known endpoints and a shared shape, and a repo, a database or a service can plug in, with MCP as the likely carrier. I wouldn't design that contract first. I'd build with repos, see what two or three real sinks have in common, and write the interface from that.

## What to watch

Too many sinks bring back the wiki problem, so start with the fewest that have different approvers. Two sinks can disagree, so composing needs a conflict check that stops and names who decides. A diff hides context, so each changed requirement should carry its reason. And none of this should add a meeting. The approval can be the merge your team already does.

Start small: one product, three sinks, one agent working from the diff. If the loop holds, widen it. I expect to come back to this, because there's more to say about the checks at the approval gate and about tests reporting which requirements they cover.
