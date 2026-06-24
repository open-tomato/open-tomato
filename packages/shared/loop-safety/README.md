# @open-tomato/loop-safety

Loop safety mechanisms for the orchestration event loop. Detects and terminates runaway loops caused by thrashing agents, stale repeated outputs, malformed JSONL, consecutive failures, and budget overruns.

## Overview

The package exposes five focused detectors and a central `TerminationChecker` that composes them. Each detector is stateful but side-effect-free — state changes only through explicit method calls, and no detector depends on another at construction time.

```text
TerminationChecker
├── BudgetTracker       — cumulative API cost limit
├── FailureTracker      — consecutive process failure count
├── StaleDetector       — identical event signature repetition
├── ThrottleTracker     — abandoned task redispatch (thrashing)
└── BackpressureValidator — consecutive malformed JSONL
    + workspaceExists() — filesystem check for the git worktree
```

## Detectors

### BudgetTracker

Accumulates API cost across loop iterations and signals when the configured maximum is exceeded.

```typescript
import { BudgetTracker } from '@open-tomato/loop-safety'

const budget = new BudgetTracker({ maxCostUsd: 1.00 })
budget.addCost(0.25)
budget.isExceeded() // false
budget.addCost(0.80)
budget.isExceeded() // true
```

### FailureTracker

Counts consecutive process failures. A successful event resets the counter to zero.

```typescript
import { FailureTracker } from '@open-tomato/loop-safety'

const tracker = new FailureTracker({ maxConsecutiveFailures: 3 })
tracker.recordFailure() // 1
tracker.recordFailure() // 2
tracker.recordSuccess() // resets to 0
tracker.recordFailure() // 1
```

### StaleDetector

Detects loops where consecutive events share the same `(topic, source, payloadFingerprint)` signature. The default threshold is **3**. The `task.complete` topic is excluded by default.

```typescript
import { StaleDetector } from '@open-tomato/loop-safety'

const detector = new StaleDetector({ threshold: 3 })
detector.record('agent.output', 'agentA', 'abc123') // false
detector.record('agent.output', 'agentA', 'abc123') // false
detector.record('agent.output', 'agentA', 'abc123') // true — threshold reached
detector.resetOnHatActivation()                      // clears counter
```

### ThrottleTracker

Tracks tasks that are repeatedly blocked and redispatched. A task becomes "abandoned" after `blockThreshold` blocks (default **3**). When `redispatchThreshold` abandoned tasks are redispatched (default **3**), `isThrashing()` returns `true`.

```typescript
import { ThrottleTracker } from '@open-tomato/loop-safety'

const tracker = new ThrottleTracker({ blockThreshold: 3, redispatchThreshold: 3 })
tracker.recordBlock('task-1')   // false (1st block)
tracker.recordBlock('task-1')   // false (2nd block)
tracker.recordBlock('task-1')   // true  — task-1 is now abandoned
tracker.recordRedispatch('task-1')
tracker.isThrashing()           // depends on redispatch threshold
```

### BackpressureValidator

Validates raw JSONL lines and build evidence payloads. Three consecutive malformed JSONL lines trigger the threshold.

```typescript
import { BackpressureValidator } from '@open-tomato/loop-safety'

const validator = new BackpressureValidator()
validator.validateJsonl('{"event":"ok"}')  // null — valid
validator.validateJsonl('not json')        // "Unexpected token..." — error string
validator.recordMalformed()               // increments counter
validator.recordValid()                   // resets counter
validator.validateBuildEvidence({ tests: 'pass', lint: 'pass' }) // null — valid
validator.validateBuildEvidence({ tests: 'fail' })               // reason string
```

## TerminationChecker

`TerminationChecker` composes all detectors and evaluates the decision tree on every call to `check(iteration)`.

### Decision Tree Order

The first condition that matches wins. The order is:

| Priority | Reason | Exit Code | Trigger |
|----------|--------|-----------|---------|
| 1 | `MaxCost` | 2 | Accumulated cost ≥ `maxCostUsd` |
| 2 | `MaxIterations` | 2 | `iteration` ≥ `maxIterations` |
| 3 | `MaxRuntime` | 2 | Elapsed time > `maxRuntimeMs` |
| 4 | `ConsecutiveFailures` | 1 | Consecutive failures ≥ `maxConsecutiveFailures` |
| 5 | `LoopStale` | 1 | Stale threshold reached via `recordEvent()` |
| 6 | `LoopThrashing` | 1 | `ThrottleTracker.isThrashing()` |
| 7 | `ValidationFailure` | 1 | Malformed JSONL threshold reached via `validateJsonl()` |
| 8 | `WorkspaceGone` | 1 | `workspaceExists()` returns `false` |
| 9 | — | — | `{ shouldTerminate: false }` |

### Routing Events Through TerminationChecker

`StaleDetector` and `BackpressureValidator` signal state via return values, not polling methods. Route all loop events through the checker's delegation methods so the decision tree can act on them:

```typescript
// On every loop event
checker.recordEvent(topic, source, payloadFingerprint)

// On every raw JSONL line received from an agent
const error = checker.validateJsonl(rawLine)
```

### Configuration and Usage

```typescript
import {
  TerminationChecker,
  BudgetTracker,
  FailureTracker,
  StaleDetector,
  ThrottleTracker,
  BackpressureValidator,
  createWorkspaceExistsCheck,
} from '@open-tomato/loop-safety'

const checker = new TerminationChecker(
  {
    maxIterations: 100,
    maxRuntimeMs: 30 * 60 * 1000, // 30 minutes
    maxCostUsd: 5.00,
    maxConsecutiveFailures: 3,
    startTime: Date.now(),
  },
  new BudgetTracker({ maxCostUsd: 5.00 }),
  new FailureTracker({ maxConsecutiveFailures: 3 }),
  new StaleDetector({ threshold: 3 }),
  new ThrottleTracker({ blockThreshold: 3, redispatchThreshold: 3 }),
  new BackpressureValidator(),
  createWorkspaceExistsCheck('/path/to/workspace'),
)

// In the loop body
const result = await checker.check(iteration)
if (result.shouldTerminate) {
  console.error(`Loop stopped: ${result.reason} — ${result.detail}`)
  process.exit(result.exitCode)
}
```

## Termination Reasons and Exit Codes

| Reason | Exit Code | Description |
|--------|-----------|-------------|
| `Completed` | 0 | All tasks done (set externally by the caller) |
| `MaxIterations` | 2 | Iteration count hit the configured limit |
| `MaxRuntime` | 2 | Elapsed wall-clock time exceeded the limit |
| `MaxCost` | 2 | Cumulative API cost exceeded the budget |
| `ConsecutiveFailures` | 1 | Too many consecutive process failures |
| `LoopThrashing` | 1 | Abandoned tasks redispatched too many times |
| `LoopStale` | 1 | Consecutive identical event signatures |
| `ValidationFailure` | 1 | Consecutive malformed JSONL lines |
| `WorkspaceGone` | 1 | Git worktree deleted while loop was running |
| `Interrupted` | 130 | SIGINT or SIGTERM received |

## Default Thresholds

| Parameter | Default | Configured via |
|-----------|---------|----------------|
| Block threshold (per task) | 3 | `ThrottleTrackerConfig.blockThreshold` |
| Redispatch threshold | 3 | `ThrottleTrackerConfig.redispatchThreshold` |
| Stale detection threshold | 3 | `StaleDetectorConfig.threshold` |
| Malformed JSONL threshold | 3 | hardcoded in `BackpressureValidator` |
| Max consecutive failures | — | `TerminationCheckerConfig.maxConsecutiveFailures` |
| Max iterations | — | `TerminationCheckerConfig.maxIterations` |
| Max runtime | — | `TerminationCheckerConfig.maxRuntimeMs` |
| Max cost | — | `TerminationCheckerConfig.maxCostUsd` |

## API Reference

TypeDoc output is generated by running:

```sh
bun docs:generate
```

The generated HTML is written to `docs/` within this package.
