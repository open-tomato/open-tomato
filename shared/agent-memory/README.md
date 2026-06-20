# @open-tomato/agent-memory

Persistent memory storage and prompt injection for agents in the Open Tomato monorepo. Agents accumulate structured knowledge across sessions as typed markdown entries, with token-budget-controlled injection into prompts to prevent context window overflow.

Memories are stored in `.ralph/agent/memories.md` as categorized markdown blocks. The file should be symlinked across git worktrees to share state (see Worktree Support below).

## Memory types

| Type | Use for |
|---|---|
| `pattern` | Reusable code or architectural patterns discovered in the codebase |
| `decision` | Architecture or technology choices and their rationale |
| `fix` | Solutions to bugs or recurring issues |
| `context` | Project-specific background knowledge |

## Storage format

```markdown
## Patterns

> Always wrap Drizzle queries in a transaction when updating multiple tables.
<!-- id: abc123 | tags: drizzle, database | created: 2024-01-15T10:00:00Z -->

## Decisions

> We chose Drizzle ORM over Prisma for lightweight schema migrations.
<!-- id: def456 | tags: orm, database | created: 2024-01-16T08:30:00Z -->
```

## Usage

### Append a memory

```ts
import { MarkdownMemoryStore } from '@open-tomato/agent-memory';

const store = new MarkdownMemoryStore('.ralph/agent/memories.md');

const memory = await store.append({
  type: 'pattern',
  content: 'Always wrap Drizzle queries in a transaction when updating multiple tables.',
  tags: ['drizzle', 'database'],
});
```

### Read and filter memories

```ts
import { MarkdownMemoryStore, filterMemories } from '@open-tomato/agent-memory';

const store = new MarkdownMemoryStore('.ralph/agent/memories.md');
const all = await store.readAll();

const recent = filterMemories(all, { type: 'pattern', recentDays: 7 });
```

### Inject memories into a prompt

```ts
import { MarkdownMemoryStore, buildPromptWithMemories } from '@open-tomato/agent-memory';

const store = new MarkdownMemoryStore('.ralph/agent/memories.md');

const prompt = await buildPromptWithMemories(basePrompt, store, {
  mode: 'auto',
  budgetTokens: 2000,
  filter: { tags: ['drizzle'] },
});
```

## Token budget

The `budgetTokens` field in `InjectionConfig` controls how many tokens worth of memories are prepended. Estimation uses the 4-chars-per-token heuristic (`Math.ceil(text.length / 4)`). When the formatted memories exceed the budget, blocks are trimmed at block boundaries and a truncation notice is appended.

## File locking

Concurrent writes (and reads) are protected via [`proper-lockfile`](https://github.com/moxystudio/node-proper-lockfile), which creates a sibling `.lock` directory next to the target file as an atomic advisory lock (mkdir strategy). This approach works reliably on local and NFS file systems.

All `readAll`, `append`, and `writeAll` operations acquire an exclusive lock for the full duration of their read-modify-write cycle, preventing any two concurrent callers from observing or writing partially-written state simultaneously. The lock is always released in a `finally` block so it is freed even when the callback throws.

**Retry strategy** (default `timeoutMs = 5000`):
- Retries every 50 ms up to a maximum of `Math.ceil(timeoutMs / 50)` attempts
- Per-attempt back-off capped at 200 ms
- Total wait capped at `timeoutMs`
- Throws with a descriptive message if the lock cannot be acquired within the timeout

`proper-lockfile` follows symlinks internally, so locking always targets the real inode regardless of whether the path is a direct file or a symlink (see Worktree support below).

## Worktree support

When using git worktrees (e.g. for parallel feature branches), symlink the memory file so all worktrees share the same store:

```bash
# In each new worktree
ln -s ../../.ralph/agent/memories.md .ralph/agent/memories.md
```

`resolveMemoryFilePath` resolves symlinks before file operations so that locking always targets the real inode regardless of which worktree initiates the write.

## Notes

- This package is framework-agnostic — no React, no HTTP framework imports.
- TypeScript source is exposed directly via workspace exports; no build step required.
- Types are scoped to this package and re-evaluated at integration time before promotion to `@open-tomato/types`.
