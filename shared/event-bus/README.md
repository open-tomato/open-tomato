# @open-tomato/event-bus

Topic-based publish/subscribe event bus with glob-style pattern matching and three-level routing priority. Designed to route events between agent personas (hats) in the Open Tomato monorepo.

## Purpose

The event bus replaces imperative control flow with a declarative, observable event system. Agents publish events to named topics; subscribers declare the patterns they care about. The bus handles routing, persistence, and replay.

## Installation

This is a private workspace package. Add it as a workspace dependency:

```json
{
  "dependencies": {
    "@open-tomato/event-bus": "workspace:^"
  }
}
```

## Usage

### Subscribe

Register a handler for a topic pattern. Returns an unsubscribe function.

```ts
import { EventBus } from '@open-tomato/event-bus';

const bus = new EventBus();

const unsubscribe = bus.subscribe('build.done', async (event) => {
  console.log('Build finished:', event.payload);
});

// Subscribe with a wildcard pattern
bus.subscribe('impl.*', async (event) => {
  console.log('Impl event:', event.topic, event.payload);
});

// Remove the subscription
unsubscribe();
```

### Publish

Publish an event to all matching subscribers. The bus stamps `ts` automatically if not provided.

```ts
await bus.publish({
  topic: 'build.done',
  payload: JSON.stringify({ status: 'success' }),
  source: 'builder',
});

// Direct routing — delivers only to a subscriber whose pattern equals the target
await bus.publish({
  topic: 'build.done',
  payload: '{}',
  source: 'builder',
  target: 'reviewer', // bypasses pattern matching
});
```

### Observer

Observers receive every published event before routing begins. They are read-only and do not participate in routing priority.

```ts
const removeObserver = bus.addObserver((event) => {
  tuiDisplay.render(event);
});

// Remove the observer
removeObserver();
```

### Persistence and Replay

Pass a `persistencePath` to automatically append events to a JSONL file on every publish. Replay stored events later without re-persisting them.

```ts
const bus = new EventBus({ persistencePath: './events.jsonl' });

await bus.publish({ topic: 'review.blocked', payload: '{}', source: 'reviewer' });
// → appended to ./events.jsonl

// Re-dispatch all stored events through the current subscription set
await bus.replayFromFile('./events.jsonl');
```

JSONL format (one JSON object per line):

```jsonl
{"topic":"build.done","payload":"{}","source":"builder","ts":"2024-01-01T00:00:00.000Z"}
{"topic":"review.blocked","payload":"{}","source":"reviewer","ts":"2024-01-01T00:00:01.000Z"}
```

## Pattern Matching Reference

| Pattern | Type | Matches | Does not match |
|---|---|---|---|
| `build.done` | Exact | `build.done` | `build.started`, `review.done` |
| `*` | Global wildcard | any topic | — |
| `impl.*` | Suffix wildcard | `impl.done`, `impl.started` | `build.done` |
| `*.done` | Prefix wildcard | `build.done`, `review.done` | `build.started` |

## Routing Priority

When a matching event is published, handlers are invoked in this order:

1. **Direct target** — `event.target` is set; only the subscriber whose `pattern` equals `event.target` is invoked. Pattern matching is bypassed entirely.
2. **Specific subscribers** — non-wildcard patterns that match the event topic.
3. **Wildcard / fallback subscribers** — patterns containing `*` that match the event topic.

Observers always receive the event before routing, regardless of priority.
