# @open-tomato/orchestration

Human-in-the-loop primitives for the Open Tomato orchestration system. Enables running agents to ask blocking questions, receive human responses within a configurable timeout, and accept proactive guidance injected into the prompt.

## Purpose

The orchestration package provides a transport-agnostic `RobotService` abstraction. Concrete transports (HTTP webhook, Telegram, Slack, etc.) extend `BaseRobotService` and plug into the orchestration loop without changing core logic. The package also provides session routing, guidance accumulation, and retry utilities.

## Installation

This is a private workspace package. Add it as a workspace dependency:

```json
{
  "dependencies": {
    "@open-tomato/orchestration": "workspace:*"
  }
}
```

## Usage

### Blocking question/response cycle

An agent emits a `human.interact` event. The orchestration loop dispatches it through the `RobotService`, which blocks until the human replies or the timeout expires.

```ts
import { HttpWebhookRobotService, injectGuidance } from '@open-tomato/orchestration';

// 1. Create a service backed by an HTTP webhook
const service = new HttpWebhookRobotService({
  webhookUrl: 'https://example.com/hook',
  timeoutMs: 60_000,      // wait up to 60 s for a reply
  pollIntervalMs: 250,    // poll every 250 ms
  maxRetries: 3,          // retry outbound delivery 3 times
});

// 2. Ask a blocking question
const answer = await service.sendQuestion('session-1', 'Deploy to production?');

if (answer) {
  console.log('Human replied:', answer);
} else {
  console.log('Timed out — no response received');
}

// 3. Send a non-blocking check-in (fire and forget)
await service.sendCheckin('session-1', 'Build completed in 42 s');
```

### Receiving responses via webhook

Wire the included Express router to accept inbound human messages:

```ts
import express from 'express';
import { HttpWebhookRobotService, robotRouter } from '@open-tomato/orchestration';

const app = express();
app.use(express.json());

const service = new HttpWebhookRobotService({
  webhookUrl: 'https://example.com/hook',
});

// Mount the router — exposes POST /robot/response and POST /robot/guidance
app.use('/robot', robotRouter({ service }));

app.listen(3000);
```

The human operator posts a response to unblock a pending `sendQuestion`:

```bash
curl -X POST http://localhost:3000/robot/response \
  -H 'Content-Type: application/json' \
  -d '{ "sessionId": "session-1", "response": "Yes, deploy it" }'
```

### Guidance injection

The human can send proactive guidance at any time. Guidance entries accumulate and are flushed into the prompt as a numbered list before each iteration.

```ts
// Human sends guidance (via webhook, Slack, etc.)
service.acceptGuidance('session-1', 'Use the staging database');
service.acceptGuidance('session-1', 'Skip email notifications');

// Before the next prompt build, flush accumulated guidance
const guidance = service.flushGuidance('session-1');

if (guidance) {
  const prompt = injectGuidance('You are a deploy agent.', guidance);
  // prompt is now:
  // You are a deploy agent.
  //
  // ## ROBOT GUIDANCE
  // 1. Use the staging database
  // 2. Skip email notifications
}
```

### Multi-session routing

When multiple orchestration loops run concurrently, use `SessionRegistry` to route incoming messages to the correct service instance:

```ts
import {
  HttpWebhookRobotService,
  SessionRegistry,
  robotRouter,
} from '@open-tomato/orchestration';

const deploy = new HttpWebhookRobotService({ webhookUrl: 'https://example.com/deploy' });
const build = new HttpWebhookRobotService({ webhookUrl: 'https://example.com/build' });

const registry = new SessionRegistry(
  new Map([
    ['deploy', deploy],
    ['build', build],
  ]),
);

// Mount with registry mode — enables the POST /robot/message endpoint
app.use('/robot', robotRouter({ registry }));
```

Incoming messages are routed by session ID using three strategies (first match wins):

| Strategy | Example message | Resolved session |
| --- | --- | --- |
| `@loop-id` prefix | `@deploy check status` | `deploy` |
| `replyToSessionId` | Reply to a bot message from `build` | `build` |
| Default fallback | `hello` | `main` |

```bash
# Route by @prefix
curl -X POST http://localhost:3000/robot/message \
  -H 'Content-Type: application/json' \
  -d '{ "text": "@deploy check status" }'

# Route by reply-to
curl -X POST http://localhost:3000/robot/message \
  -H 'Content-Type: application/json' \
  -d '{ "text": "looks good", "replyToSessionId": "build" }'
```

### Custom transport

Extend `BaseRobotService` to plug in any messaging platform:

```ts
import { BaseRobotService, waitForResponse } from '@open-tomato/orchestration';

class SlackRobotService extends BaseRobotService {
  async sendQuestion(sessionId: string, question: string, timeoutMs?: number) {
    await this.slackClient.postMessage(question);
    return waitForResponse(
      this.pendingResponses,
      sessionId,
      timeoutMs ?? 300_000,
      250,
      this.shutdownSignal,
    );
  }

  async sendCheckin(sessionId: string, message: string) {
    await this.slackClient.postMessage(message);
  }
}
```

### Graceful shutdown

Call `shutdown()` to abort all in-flight blocking waits. Any pending `sendQuestion` resolves `null`.

```ts
await service.shutdown();
```

## Event types

| Event | Direction | Behavior |
| --- | --- | --- |
| `human.interact` | Agent to Human | Agent emits a question; loop blocks until response or timeout |
| `human.response` | Human to Agent | Reply injected to unblock the loop |
| `human.guidance` | Human to Agent | Proactive message accumulated and injected into prompt |
| `human.interact.timeout` | System | Emitted when a blocking question times out |

## Configuration

The following environment variables configure the robot service at startup (via `@open-tomato/config`):

| Variable | Default | Description |
| --- | --- | --- |
| `ROBOT_SERVICE_TIMEOUT_MS` | `300000` | Max wait time for a human response (ms) |
| `ROBOT_SERVICE_POLL_INTERVAL_MS` | `250` | Poll interval while waiting (ms) |
| `ROBOT_SERVICE_MAX_RETRIES` | `3` | Retry attempts for outbound delivery |
| `ROBOT_SERVICE_WEBHOOK_URL` | — | Webhook URL for the HTTP transport |

## Exports

| Export | Description |
| --- | --- |
| `BaseRobotService` | Abstract base class for transport adapters |
| `HttpWebhookRobotService` | Reference HTTP webhook transport |
| `SessionRegistry` | Multi-session routing registry |
| `robotRouter` | Express router factory for webhook endpoints |
| `GuidanceAccumulator` | Per-session guidance accumulation |
| `injectGuidance` | Append a `## ROBOT GUIDANCE` section to a prompt |
| `waitForResponse` | Polling utility for blocking question/response |
| `resolveSessionId` | Session ID resolution from incoming messages |
| `withExponentialBackoff` | Retry utility with exponential backoff |
| `sleep` | Promise-based delay utility |
