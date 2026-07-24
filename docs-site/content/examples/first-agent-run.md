---
title: "Your first agent run"
category: examples
slug: first-agent-run
order: 1
lead: "Seed a run from the terminal and watch it work end to end."
source: null
editHref: null
---

## Goal

Point an agent at a small, well-scoped task and review its diff before merging.

## Steps

```bash
# 1. seed a run from a plain-language goal
tomato run "add a settings page" --budget 50k

# 2. follow it live in the dashboard, or stream logs in the shell
tomato logs --follow
```

The run appears in the dashboard under **Sessions**. When it finishes, open
the session to see the files it changed.

## Reviewing the result

Every run produces a diff. Merge it with confidence, or kick it back for
another pass with more context. Nothing lands without your review.

> Runs are cheap to throw away. Seed a few in parallel and keep the one that
> lands closest to what you wanted.

