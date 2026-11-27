---
id: dark-factory-living-spec
title: "The dark factory: the specification as a living document"
dek: Requirements live in versioned sinks, the spec is composed from them, and agents build only the diff.
date: 2026-11-27
tags: [architecture, ai]
cover: /blog/media/dark-factory-living-spec.jpg
cover_alt: A stylized dark factory glowing in a mountain valley at night, its light mirrored in a still lake.
toc: false
draft: false
---
A dark factory runs with the lights off. Machines build and nobody stands on the floor. For software, the control program is the specification, so the spec has to be alive.

Here is how I would run it. Requirements live in sinks. When a change is approved, the spec is recomposed as a new version. Agents then build the difference between the two versions. People write requirements and review changes.

![Typed requirement sinks (product, standards, security) compose into a versioned specification; an agent builds the diff between versions, and any source becomes a sink by speaking a small MCP contract: list, get a version, diff two versions.](/blog/media/dark-factory-diagram.png "The loop: requirements in, spec and diff out.")

## The spec is generated

Every team has a spec that was true once. It went stale because keeping it current was nobody's task on a deadline day. I follow a simple rule: if you can compute a fact from its source, compute it. The spec is the composition of the requirements that hold right now, so I write the requirements and generate the spec.

## Sinks

A sink holds one kind of requirement and has one owner. Product goes in one sink, security in another, and design, performance and cost each get their own. The owner approves changes to that sink, which settles where a requirement belongs.

A sink is currently a repo or a folder in one. Shared standards live in their own repo and feed many workspaces, versioned and pinned like a shared library. A workspace lists the sinks it composes and the version of each. Moving to a new version shows you the diff first.

## Agents build the diff

When a change is approved the spec becomes version 2, then version 3, and the old versions stay. That gives "what changed" an exact answer. An agent handed the whole spec rereads everything and sometimes redoes finished work. An agent handed the diff gets a small job with a list: add these requirements, change this one, drop that one. Each item carries its id and its reason, so the agent knows which test to write.

## MCP makes anything a sink

A repo is a good first sink. Any source can join once it answers three questions: what are your requirements, at what version, and what changed between two versions. Serve those over MCP with well-known endpoints and one shared schema, and a Postgres table, a ticketing system, a design tool or a compliance register can all act as sinks. The workspace composes them without knowing what is behind each one.

Most requirements already live in a dozen systems. With this contract you compose them where they are, and nothing has to be copied into a document that drifts. Keep the contract at those three calls: list, get a version, diff two versions.

## Follow the id

Each requirement gets an id when it is created. The id never changes and is never reused, and it links everything that follows.

Put it where each tool can search:

- Branch: `req/PROD-142-export-csv`, so the id exists before the first commit.
- Issue and pull request: the id in the title and a `req:PROD-142` label.
- Commit: a trailer, `Requirement: PROD-142`, added the way you add a sign-off.
- Test: a tag with the id it verifies.

One search then returns the whole trail. `git log --grep "Requirement: PROD-142"` lists the changes, the label lists the issues and pull requests, and the test tag lists the proof.

You can read it from either end. From a requirement you reach the code. From a line of code you blame to a commit, read its trailer, and arrive at the requirement and its reason. Coverage then becomes a question about requirements: which ids in this release have a merged change and a passing test?

CI enforces it so nobody has to remember. Every pull request carries a real id from the pinned spec, or says `Maintenance:` with a reason. Every requirement in the diff needs a merged change and a tagged test before the version counts as done, or the build fails.

Edge cases need rules. A split gives the children new ids and marks the parent superseded. A merge keeps one id and points the others at it. A pull request that touches several requirements lists them all, and a long list means the pull request is too big. Old code has no ids, so start at the current version and tag what you touch. Compute the trace from trailers, labels and test reports, the same way as the spec, and keep it out of a table.

## Start this week

1. Pick one product and three sinks with different owners: the product, a shared standard, and security. Use the fewest sinks that have different approvers, and let approval be the merge your team already does.
2. Put each in a repo and pin a version in the workspace.
3. Compose the spec at build time and leave the output unedited.
4. On the next change, generate the diff and give an agent only that, with each requirement's id and reason.
5. Give every requirement a permanent id in the branch, the pull request title, the commit trailer and the test tag, and add the CI check described above.
6. When a second system holds requirements you keep copying by hand, put the MCP contract in front of it and make it a sink too.
