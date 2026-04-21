import type { RpcCommand, RpcEvent } from './types/index.js';

import { PassThrough } from 'node:stream';

import { describe, expect, it, vi } from 'vitest';

import { type CommandHooks, RpcCommandHandler } from './command-handler.js';
import { RpcEventBus } from './event-bus.js';
import { RpcServer } from './rpc-server.js';
import { NdjsonTransport } from './transport/ndjson-transport.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a no-op hooks object where every hook is a vi.fn(). */
function createMockHooks(): {
  [K in keyof CommandHooks]: ReturnType<typeof vi.fn>;
} {
  return {
    onPrompt: vi.fn(),
    onGuidance: vi.fn(),
    onSteer: vi.fn(),
    onFollowUp: vi.fn(),
    onAbort: vi.fn(),
    onGetState: vi.fn().mockReturnValue({ iteration: 0, hat: 'coder' }),
    onGetIterations: vi.fn(),
    onSetHat: vi.fn(),
  };
}

/**
 * Writes an NDJSON line to the input stream and returns a promise that
 * resolves after a microtask tick so the server has time to process it.
 */
function sendCommand(input: PassThrough, command: RpcCommand): Promise<void> {
  input.write(JSON.stringify(command) + '\n');
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Collects all NDJSON lines written to the output stream so far.
 * Each line is parsed back into an RpcEvent.
 */
function drainOutput(output: PassThrough): RpcEvent[] {
  const raw = output.read();
  if (!raw) return [];
  const lines = String(raw)
    .split('\n')
    .filter((l) => l.trim());
  return lines.map((l) => JSON.parse(l) as RpcEvent);
}

/**
 * Creates a fully wired RpcServer backed by in-memory PassThrough streams.
 */
function setup() {
  const input = new PassThrough();
  const output = new PassThrough();
  const bus = new RpcEventBus();
  const hooks = createMockHooks();
  const handler = new RpcCommandHandler({ bus, hooks });
  const transport = new NdjsonTransport(input, output);
  const server = new RpcServer({ transport, bus, handler });

  return { input, output, bus, hooks, handler, transport, server };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RpcServer integration', () => {
  it('dispatches a prompt command and emits no error events', async () => {
    const { input, output, hooks, server } = setup();

    const started = server.start();
    await sendCommand(input, { method: 'prompt', params: { text: 'hello' } });
    input.end();
    await started;

    expect(hooks.onPrompt).toHaveBeenCalledOnce();
    expect(hooks.onPrompt).toHaveBeenCalledWith({ text: 'hello' });

    const events = drainOutput(output);
    const errors = events.filter((e) => e.event === 'error');
    expect(errors).toHaveLength(0);
  });

  it('dispatches multiple commands in sequence', async () => {
    const { input, output, hooks, server } = setup();

    const started = server.start();
    await sendCommand(input, { method: 'prompt', params: { text: 'go' } });
    await sendCommand(input, {
      method: 'guidance',
      params: { text: 'be concise', appliesTo: 'current_iteration' },
    });
    await sendCommand(input, { method: 'get_state' });
    input.end();
    await started;

    expect(hooks.onPrompt).toHaveBeenCalledOnce();
    expect(hooks.onGuidance).toHaveBeenCalledOnce();
    expect(hooks.onGetState).toHaveBeenCalledOnce();

    const events = drainOutput(output);
    const guidanceAcks = events.filter((e) => e.event === 'guidance_ack');
    expect(guidanceAcks).toHaveLength(1);
    expect(guidanceAcks[0]!.data).toMatchObject({
      commandType: 'guidance',
      accepted: true,
    });

    const orchestrationEvents = events.filter(
      (e) => e.event === 'orchestration_event',
    );
    expect(orchestrationEvents).toHaveLength(1);
    expect(orchestrationEvents[0]!.data).toMatchObject({
      kind: 'state_snapshot',
      payload: { iteration: 0, hat: 'coder' },
    });
  });

  it('emits error events for malformed JSON on input', async () => {
    const { input, output, server } = setup();

    const started = server.start();
    input.write('this is not json\n');
    await new Promise((resolve) => setTimeout(resolve, 0));
    input.end();
    await started;

    const events = drainOutput(output);
    const errors = events.filter((e) => e.event === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.data).toMatchObject({ code: 'PARSE_ERROR' });
  });

  it('emits error events for commands with invalid params', async () => {
    const { input, output, hooks, server } = setup();

    const started = server.start();
    // prompt requires non-empty text
    await sendCommand(input, {
      method: 'prompt',
      params: { text: '' },
    } as RpcCommand);
    input.end();
    await started;

    expect(hooks.onPrompt).not.toHaveBeenCalled();

    const events = drainOutput(output);
    const errors = events.filter((e) => e.event === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.data).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('emits error events when a hook throws', async () => {
    const { input, output, hooks, server } = setup();
    hooks.onPrompt.mockRejectedValueOnce(new Error('hook exploded'));

    const started = server.start();
    await sendCommand(input, { method: 'prompt', params: { text: 'boom' } });
    input.end();
    await started;

    expect(hooks.onPrompt).toHaveBeenCalledOnce();

    const events = drainOutput(output);
    const errors = events.filter((e) => e.event === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.data).toMatchObject({
      code: 'HOOK_ERROR',
      message: 'hook exploded',
    });
  });

  it('publishes bus events to the output stream', async () => {
    const { input, output, bus, server } = setup();

    const started = server.start();

    bus.publish({
      event: 'loop_started',
      data: { timestamp: new Date().toISOString(), prompt: 'test' },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    bus.publish({
      event: 'iteration_start',
      data: {
        iteration: 1,
        hat: 'coder',
        timestamp: new Date().toISOString(),
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    input.end();
    await started;

    const events = drainOutput(output);
    const loopStarted = events.filter((e) => e.event === 'loop_started');
    const iterationStart = events.filter((e) => e.event === 'iteration_start');
    expect(loopStarted).toHaveLength(1);
    expect(iterationStart).toHaveLength(1);
  });

  it('stop() prevents further command processing', async () => {
    const { input, hooks, server } = setup();

    const started = server.start();
    await sendCommand(input, { method: 'prompt', params: { text: 'first' } });

    server.stop();

    // Write more data after stop — should not be dispatched
    input.write(
      JSON.stringify({ method: 'prompt', params: { text: 'second' } }) + '\n',
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    input.end();
    await started;

    expect(hooks.onPrompt).toHaveBeenCalledOnce();
    expect(hooks.onPrompt).toHaveBeenCalledWith({ text: 'first' });
  });

  it('stop() prevents the transport from emitting further events', async () => {
    const { input, output, bus, server } = setup();

    const started = server.start();

    // Publish an event before stop — should appear on output
    bus.publish({
      event: 'loop_started',
      data: { timestamp: new Date().toISOString(), prompt: 'before' },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    server.stop();
    input.end();
    await started;

    // After stop the transport is closed — publishing still doesn't throw
    // (the bus catches the consumer error internally)
    expect(() => bus.publish({
      event: 'loop_started',
      data: { timestamp: new Date().toISOString(), prompt: 'after' },
    })).not.toThrow();

    const events = drainOutput(output);
    const loopStarted = events.filter((e) => e.event === 'loop_started');
    // Only the event before stop should appear
    expect(loopStarted).toHaveLength(1);
    expect(loopStarted[0]!.data).toMatchObject({ prompt: 'before' });
  });

  it('handles steer command with guidance_ack event', async () => {
    const { input, output, hooks, server } = setup();

    const started = server.start();
    await sendCommand(input, {
      method: 'steer',
      params: { directive: 'focus on tests', force: true },
    });
    input.end();
    await started;

    expect(hooks.onSteer).toHaveBeenCalledWith({
      directive: 'focus on tests',
      force: true,
    });

    const events = drainOutput(output);
    const acks = events.filter((e) => e.event === 'guidance_ack');
    expect(acks).toHaveLength(1);
    expect(acks[0]!.data).toMatchObject({
      commandType: 'steer',
      accepted: true,
    });
  });

  it('handles abort command', async () => {
    const { input, hooks, server } = setup();

    const started = server.start();
    await sendCommand(input, {
      method: 'abort',
      params: { reason: 'user cancelled' },
    });
    input.end();
    await started;

    expect(hooks.onAbort).toHaveBeenCalledWith({ reason: 'user cancelled' });
  });

  it('handles set_hat command', async () => {
    const { input, hooks, server } = setup();

    const started = server.start();
    await sendCommand(input, {
      method: 'set_hat',
      params: { hatId: 'architect' },
    });
    input.end();
    await started;

    expect(hooks.onSetHat).toHaveBeenCalledWith({ hatId: 'architect' });
  });

  it('handles follow_up command', async () => {
    const { input, hooks, server } = setup();

    const started = server.start();
    await sendCommand(input, {
      method: 'follow_up',
      params: { text: 'also do this' },
    });
    input.end();
    await started;

    expect(hooks.onFollowUp).toHaveBeenCalledWith({ text: 'also do this' });
  });

  it('handles get_iterations command', async () => {
    const { input, hooks, server } = setup();

    const started = server.start();
    await sendCommand(input, {
      method: 'get_iterations',
      params: { after: 0, limit: 5 },
    });
    input.end();
    await started;

    expect(hooks.onGetIterations).toHaveBeenCalledWith({
      after: 0,
      limit: 5,
    });
  });

  it('processes a full lifecycle sequence end-to-end', async () => {
    const { input, output, hooks, bus, server } = setup();

    const started = server.start();

    // 1. Client sends a prompt
    await sendCommand(input, {
      method: 'prompt',
      params: { text: 'build feature X', hat: 'coder', maxIterations: 10 },
    });

    // 2. Orchestrator publishes lifecycle events through the bus
    bus.publish({
      event: 'loop_started',
      data: { timestamp: new Date().toISOString(), prompt: 'build feature X' },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    bus.publish({
      event: 'iteration_start',
      data: {
        iteration: 1,
        hat: 'coder',
        timestamp: new Date().toISOString(),
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 3. Client injects guidance mid-loop
    await sendCommand(input, {
      method: 'guidance',
      params: { text: 'be concise' },
    } as RpcCommand);

    // 4. Client queries state
    await sendCommand(input, { method: 'get_state' });

    // 5. Orchestrator completes the iteration
    bus.publish({
      event: 'iteration_end',
      data: {
        iteration: 1,
        durationMs: 1234,
        timestamp: new Date().toISOString(),
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    bus.publish({
      event: 'loop_terminated',
      data: {
        reason: 'completed',
        totalIterations: 1,
        timestamp: new Date().toISOString(),
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    input.end();
    await started;

    // Verify hooks called
    expect(hooks.onPrompt).toHaveBeenCalledOnce();
    expect(hooks.onGuidance).toHaveBeenCalledOnce();
    expect(hooks.onGetState).toHaveBeenCalledOnce();

    // Verify output stream contains all expected events
    const events = drainOutput(output);
    const eventNames = events.map((e) => e.event);

    expect(eventNames).toContain('loop_started');
    expect(eventNames).toContain('iteration_start');
    expect(eventNames).toContain('guidance_ack');
    expect(eventNames).toContain('orchestration_event');
    expect(eventNames).toContain('iteration_end');
    expect(eventNames).toContain('loop_terminated');
  });

  it('is idempotent when start is called twice', async () => {
    const { input, server } = setup();

    const started1 = server.start();
    const started2 = server.start();

    input.end();
    await started1;
    // Second call should resolve immediately (no-op)
    await started2;
  });

  it('skips unknown command methods gracefully', async () => {
    const { input, output, server } = setup();

    const started = server.start();
    // Write a valid JSON line with an unknown method
    input.write(JSON.stringify({ method: 'unknown_method', params: {} }) + '\n');
    await new Promise((resolve) => setTimeout(resolve, 0));
    input.end();
    await started;

    const events = drainOutput(output);
    // The parser rejects unknown methods as a validation error
    const errors = events.filter((e) => e.event === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.data).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('catches transport stream errors and publishes TRANSPORT_ERROR', async () => {
    const { input, output, server } = setup();

    const started = server.start();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Destroy the input stream with an error to simulate a broken pipe
    input.destroy(new Error('stream exploded'));
    await started;

    const events = drainOutput(output);
    const transportErrors = events.filter(
      (e) => e.event === 'error' &&
        (e.data as Record<string, unknown>).code === 'TRANSPORT_ERROR',
    );
    expect(transportErrors).toHaveLength(1);
    expect(transportErrors[0]!.data).toMatchObject({
      code: 'TRANSPORT_ERROR',
      message: 'stream exploded',
    });
  });

  it('calls stop() after the command loop exits normally', async () => {
    const { input, server } = setup();

    const started = server.start();
    input.end();
    await started;

    // After start() resolves, the server should have auto-stopped.
    // Calling stop() again should be safe (idempotent).
    expect(() => server.stop()).not.toThrow();
  });

  it('does not crash when transport.emit throws during bus publish', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const bus = new RpcEventBus();
    const hooks = createMockHooks();
    const handler = new RpcCommandHandler({ bus, hooks });
    const transport = new NdjsonTransport(input, output);
    const server = new RpcServer({ transport, bus, handler });

    const started = server.start();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Close the transport to make emit throw, then publish via bus
    transport.close();

    // Publishing after transport is closed should not throw — the
    // server's subscriber wraps emit in try/catch
    expect(() => bus.publish({
      event: 'loop_started',
      data: { timestamp: new Date().toISOString(), prompt: 'test' },
    })).not.toThrow();

    input.end();
    await started;
  });
});
