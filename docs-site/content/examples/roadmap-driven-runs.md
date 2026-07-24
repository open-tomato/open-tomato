---
title: "Roadmap-driven runs"
category: examples
slug: roadmap-driven-runs
order: 2
lead: "Keep your work in one list and seed agents straight from it."
source: null
editHref: null
---

## The idea

Keep tasks in the **Roadmap**. Seed an agent from any task, watch the diff,
and merge — the task closes itself when the work lands.

## Seeding from a task

```bash
tomato run --from-task OPT-123
```

The agent inherits the task's title and description as its goal, and the run
is linked back to the task so the roadmap stays in sync.

## Fan-out

Because runs are isolated, you can seed several roadmap tasks at once and
review them as they finish — no waiting for one to complete before starting
the next.

