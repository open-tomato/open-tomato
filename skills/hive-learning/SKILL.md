---
name: hive-learning
description: >
  Hive learning sync protocol for distributed instinct sharing across
  containerized agent instances. Covers the sync cycle, conflict resolution
  rules, blessed bundle format, and the inherited/ vs personal/ directory
  contract.
tags: [hive-learning, instincts, sync, orchestrator, distributed-learning]
---

# Hive Learning Skill

This skill describes the hive learning sync protocol — how multiple containerized
agent instances share learned instincts through a central orchestrator.

---

## Overview

Each container runs a local instinct-based learning system (derived from
`continuous-learning-v2`). Every 10 minutes a sync agent pushes locally learned
instincts to the orchestrator, which deduplicates, merges, and publishes a
"blessed" bundle. New containers pull the blessed set on startup, eliminating
cold-start knowledge gaps.

```
Container A          Orchestrator           Container B
    |                     |                      |
    |-- POST /sync -----> |                      |
    |                     |-- dedupe + merge     |
    |                     |-- write blessed      |
    | <-- 200 OK -------- |                      |
    |                     | <-- GET /blessed ---- |
    |                     | --- bundle ---------> |
```

If the orchestrator is unreachable, containers fall back to local-only learning
transparently — no crash, no data loss.

---

## Directory Contract: `personal/` vs `inherited/`

Instincts are stored under `~/.instincts/` (configurable via `INSTINCT_DIR` env
var) in two directories with strict ownership rules:

```
~/.instincts/
  personal/    # locally learned instincts — NEVER overwritten by sync
  inherited/   # blessed instincts pulled from the orchestrator
```

### Rules

| Directory    | Written by              | Overwritten by sync? | Promoted to global? |
| ------------ | ----------------------- | -------------------- | ------------------- |
| `personal/`  | Local learning observer | **No** — never       | Yes, via CLI        |
| `inherited/` | Sync agent / bootstrap  | **Yes** — on every sync pull | No (already global) |

- **`personal/`** is the container's own knowledge. The sync agent exports
  instincts *from* this directory but never writes *to* it during import.
- **`inherited/`** is the collective knowledge. On each blessed bundle pull, the
  sync agent writes instincts here. If a blessed instinct has the same `id` as a
  personal instinct, the import is **skipped** — personal always wins.
- Instinct files use YAML frontmatter with a markdown body. The action text lives
  under an `## Action` heading in the body.

---

## Sync Protocol

### 1. Export (container → orchestrator)

The sync agent calls `instinct-cli.py --json` to serialize all `personal/`
instincts to stdout:

```json
{
  "instincts": [
    {
      "id": "<uuid>",
      "trigger": "string",
      "action": "string",
      "action_hash": "<sha256>",
      "confidence": 0.87,
      "usage_count": 14,
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  ]
}
```

The `action_hash` is the SHA-256 of the normalized action string (stripped and
lowercased).

The sync agent then POSTs the payload to `POST /api/instincts/sync`:

```typescript
interface SyncPayload {
  container_id: string;   // UUID from CONTAINER_ID env var
  instincts: InstinctRecord[];
}
```

### 2. Merge (orchestrator)

The orchestrator upserts incoming instincts by `id` into the `instincts` table,
then runs the merge algorithm to update `blessed_instincts`.

### 3. Import (orchestrator → container)

On a successful sync (HTTP 200), the sync agent immediately calls
`GET /api/instincts/blessed` and writes the result through
`instinct-cli.py --import-blessed <tempfile>`, which populates `inherited/`.

---

## Conflict Resolution Rules

When two instincts share the same `trigger` but differ in `action_hash`, the
orchestrator applies these rules in order:

| Condition | Resolution |
| --------- | ---------- |
| Same `trigger` + same `action_hash` | Weighted confidence merge: `(c1 * w1 + c2 * w2) / (w1 + w2)` where weight = `usage_count` |
| Same `trigger` + different `action_hash`, confidence delta > 10% | Higher confidence wins; lower is discarded |
| Same `trigger` + different `action_hash`, confidence delta <= 10% | **Flagged for human review** — both retained with `status: 'flagged'` |

Flagged instincts are excluded from the blessed bundle until manually resolved
via the `/api/instincts/stats` observability endpoint or direct database update.

---

## Blessed Bundle Format

```typescript
interface BlessedBundle {
  version: string;          // ISO8601 timestamp of last merge
  instincts: InstinctRecord[];
}
```

The `GET /api/instincts/blessed` endpoint returns only non-flagged instincts
with `Cache-Control: no-store` to prevent stale caching.

---

## Cold-Start Bootstrap

New containers run `scripts/bootstrap-instincts.sh` as an entrypoint hook
*before* the main process:

1. `GET /api/instincts/blessed` from `ORCHESTRATOR_URL`
2. Write bundle to temp file
3. `instinct-cli.py --import-blessed <tempfile>`
4. On failure → skip silently, proceed with empty `inherited/`

The bootstrap uses `;` (not `&&`) in `CMD` to ensure the main process always
starts even if bootstrap fails.

---

## Environment Variables

| Variable          | Required | Description |
| ----------------- | -------- | ----------- |
| `ORCHESTRATOR_URL`| Yes      | Base URL of the orchestrator (e.g. `http://orchestrator:3000`) |
| `CONTAINER_ID`    | Yes      | UUID identifying this container instance |
| `INSTINCT_DIR`    | No       | Override instinct storage path (default: `~/.instincts`) |

---

## Observability

The orchestrator exposes `GET /api/instincts/stats` returning:

- Total instinct count
- Blessed instinct count
- Flagged instinct count
- Last sync timestamp per container

Sync agent and bootstrap script emit structured JSON log lines:

```json
{
  "event": "sync_complete",
  "container_id": "...",
  "instinct_count": 12,
  "blessed_version": "2026-04-01T10:30:00Z",
  "duration_ms": 245
}
```

---

## Related Resources

- [Orchestrator AGENTS.md](../../open-tomato/services/orchestrator/AGENTS.md) — SQLite path
  conventions, env vars, and orchestrator-specific gotchas
- [API Skill](../api/SKILL.md) — response envelope and validation patterns
- [Drizzle ORM Skill](../drizzle-orm/SKILL.md) — ORM patterns used in the
  orchestrator schema
