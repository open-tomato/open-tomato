import type { RpcCommand, RpcEvent } from './types/index.js';

import { describe, expect, it, vi } from 'vitest';

import { type CommandHooks, RpcCommandHandler } from './command-handler.js';
import { RpcEventBus } from './event-bus.js';

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
    onGetState: vi.fn().mockReturnValue({ iteration: 3, hat: 'coder' }),
    onGetIterations: vi.fn(),
    onSetHat: vi.fn(),
  };
}

/** Creates a handler + bus + hooks triple for testing. */
function setup() {
  const bus = new RpcEventBus();
  const hooks = createMockHooks();
  const handler = new RpcCommandHandler({ bus, hooks });
  const published: RpcEvent[] = [];
  bus.subscribe((evt) => published.push(evt));
  return { bus, hooks, handler, published };
}

// ---------------------------------------------------------------------------
// prompt
// ---------------------------------------------------------------------------

describe('RpcCommandHandler', () => {
  describe('prompt', () => {
    it('calls onPrompt with parsed params', async () => {
      const { handler, hooks } = setup();
      const cmd: RpcCommand = {
        method: 'prompt',
        params: { text: 'hello world' },
      };

      await handler.dispatch(cmd);

      expect(hooks.onPrompt).toHaveBeenCalledOnce();
      expect(hooks.onPrompt).toHaveBeenCalledWith({ text: 'hello world' });
    });

    it('calls onPrompt with optional hat and maxIterations', async () => {
      const { handler, hooks } = setup();
      const cmd: RpcCommand = {
        method: 'prompt',
        params: { text: 'go', hat: 'reviewer', maxIterations: 5 },
      };

      await handler.dispatch(cmd);

      expect(hooks.onPrompt).toHaveBeenCalledWith({
        text: 'go',
        hat: 'reviewer',
        maxIterations: 5,
      });
    });

    it('publishes error event when params are invalid', async () => {
      const { handler, hooks, published } = setup();

      await handler.dispatch({
        method: 'prompt',
        params: { text: '' },
      } as RpcCommand);

      expect(hooks.onPrompt).not.toHaveBeenCalled();
      expect(published).toHaveLength(1);
      expect(published[0]!.event).toBe('error');
      expect(published[0]!.data).toMatchObject({ code: 'VALIDATION_ERROR' });
    });

    it('publishes error event when hook throws', async () => {
      const { handler, hooks, published } = setup();
      hooks.onPrompt.mockRejectedValueOnce(new Error('prompt boom'));

      await handler.dispatch({
        method: 'prompt',
        params: { text: 'valid' },
      });

      expect(hooks.onPrompt).toHaveBeenCalledOnce();
      expect(published).toHaveLength(1);
      expect(published[0]!.event).toBe('error');
      expect(published[0]!.data).toMatchObject({
        code: 'HOOK_ERROR',
        message: 'prompt boom',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // guidance
  // ---------------------------------------------------------------------------

  describe('guidance', () => {
    it('calls onGuidance with parsed params and publishes guidance_ack', async () => {
      const { handler, hooks, published } = setup();
      const cmd: RpcCommand = {
        method: 'guidance',
        params: { text: 'be concise', appliesTo: 'current_iteration' },
      };

      await handler.dispatch(cmd);

      expect(hooks.onGuidance).toHaveBeenCalledOnce();
      expect(hooks.onGuidance).toHaveBeenCalledWith({
        text: 'be concise',
        appliesTo: 'current_iteration',
      });
      expect(published).toHaveLength(1);
      expect(published[0]!.event).toBe('guidance_ack');
      expect(published[0]!.data).toMatchObject({
        commandType: 'guidance',
        accepted: true,
      });
    });

    it('applies default appliesTo when omitted', async () => {
      const { handler, hooks } = setup();

      await handler.dispatch({
        method: 'guidance',
        params: { text: 'help' },
      } as RpcCommand);

      expect(hooks.onGuidance).toHaveBeenCalledWith({
        text: 'help',
        appliesTo: 'remaining',
      });
    });

    it('publishes guidance_ack with accepted=false when hook throws', async () => {
      const { handler, hooks, published } = setup();
      hooks.onGuidance.mockRejectedValueOnce(new Error('nope'));

      await handler.dispatch({
        method: 'guidance',
        params: { text: 'try this' },
      } as RpcCommand);

      // error event + guidance_ack
      const ack = published.find((e) => e.event === 'guidance_ack');
      expect(ack).toBeDefined();
      expect(ack!.data).toMatchObject({
        commandType: 'guidance',
        accepted: false,
      });
    });

    it('publishes error when params are invalid', async () => {
      const { handler, hooks, published } = setup();

      await handler.dispatch({
        method: 'guidance',
        params: { text: '' },
      } as RpcCommand);

      expect(hooks.onGuidance).not.toHaveBeenCalled();
      expect(published[0]!.event).toBe('error');
      expect(published[0]!.data).toMatchObject({ code: 'VALIDATION_ERROR' });
    });
  });

  // ---------------------------------------------------------------------------
  // steer
  // ---------------------------------------------------------------------------

  describe('steer', () => {
    it('calls onSteer with parsed params and publishes guidance_ack', async () => {
      const { handler, hooks, published } = setup();
      const cmd: RpcCommand = {
        method: 'steer',
        params: { directive: 'skip tests', force: true },
      };

      await handler.dispatch(cmd);

      expect(hooks.onSteer).toHaveBeenCalledOnce();
      expect(hooks.onSteer).toHaveBeenCalledWith({
        directive: 'skip tests',
        force: true,
      });
      expect(published).toHaveLength(1);
      expect(published[0]!.event).toBe('guidance_ack');
      expect(published[0]!.data).toMatchObject({
        commandType: 'steer',
        accepted: true,
      });
    });

    it('applies default force=false when omitted', async () => {
      const { handler, hooks } = setup();

      await handler.dispatch({
        method: 'steer',
        params: { directive: 'do it' },
      } as RpcCommand);

      expect(hooks.onSteer).toHaveBeenCalledWith({
        directive: 'do it',
        force: false,
      });
    });

    it('publishes guidance_ack with accepted=false when hook throws', async () => {
      const { handler, hooks, published } = setup();
      hooks.onSteer.mockRejectedValueOnce(new Error('steer fail'));

      await handler.dispatch({
        method: 'steer',
        params: { directive: 'go left' },
      } as RpcCommand);

      const ack = published.find((e) => e.event === 'guidance_ack');
      expect(ack).toBeDefined();
      expect(ack!.data).toMatchObject({
        commandType: 'steer',
        accepted: false,
      });
    });

    it('publishes error when directive is missing', async () => {
      const { handler, hooks, published } = setup();

      await handler.dispatch({
        method: 'steer',
        params: {},
      } as unknown as RpcCommand);

      expect(hooks.onSteer).not.toHaveBeenCalled();
      expect(published[0]!.event).toBe('error');
    });
  });

  // ---------------------------------------------------------------------------
  // follow_up
  // ---------------------------------------------------------------------------

  describe('follow_up', () => {
    it('calls onFollowUp with parsed params', async () => {
      const { handler, hooks } = setup();
      const cmd: RpcCommand = {
        method: 'follow_up',
        params: { text: 'also do this' },
      };

      await handler.dispatch(cmd);

      expect(hooks.onFollowUp).toHaveBeenCalledOnce();
      expect(hooks.onFollowUp).toHaveBeenCalledWith({
        text: 'also do this',
      });
    });

    it('publishes error when text is empty', async () => {
      const { handler, hooks, published } = setup();

      await handler.dispatch({
        method: 'follow_up',
        params: { text: '' },
      } as RpcCommand);

      expect(hooks.onFollowUp).not.toHaveBeenCalled();
      expect(published[0]!.event).toBe('error');
    });

    it('publishes error when hook throws', async () => {
      const { handler, hooks, published } = setup();
      hooks.onFollowUp.mockRejectedValueOnce(new Error('follow_up fail'));

      await handler.dispatch({
        method: 'follow_up',
        params: { text: 'retry' },
      });

      expect(published).toHaveLength(1);
      expect(published[0]!.data).toMatchObject({
        code: 'HOOK_ERROR',
        message: 'follow_up fail',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // abort
  // ---------------------------------------------------------------------------

  describe('abort', () => {
    it('calls onAbort with parsed params including reason', async () => {
      const { handler, hooks } = setup();
      const cmd: RpcCommand = {
        method: 'abort',
        params: { reason: 'user cancelled' },
      };

      await handler.dispatch(cmd);

      expect(hooks.onAbort).toHaveBeenCalledOnce();
      expect(hooks.onAbort).toHaveBeenCalledWith({
        reason: 'user cancelled',
      });
    });

    it('calls onAbort with empty params when reason is omitted', async () => {
      const { handler, hooks } = setup();

      await handler.dispatch({
        method: 'abort',
        params: {},
      });

      expect(hooks.onAbort).toHaveBeenCalledWith({});
    });

    it('publishes error when hook throws', async () => {
      const { handler, hooks, published } = setup();
      hooks.onAbort.mockRejectedValueOnce(new Error('abort fail'));

      await handler.dispatch({
        method: 'abort',
        params: {},
      });

      expect(published).toHaveLength(1);
      expect(published[0]!.data).toMatchObject({
        code: 'HOOK_ERROR',
        message: 'abort fail',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // get_state
  // ---------------------------------------------------------------------------

  describe('get_state', () => {
    it('calls onGetState and publishes orchestration_event with snapshot', async () => {
      const { handler, hooks, published } = setup();
      hooks.onGetState.mockReturnValue({ iteration: 5, hat: 'planner' });

      await handler.dispatch({ method: 'get_state' });

      expect(hooks.onGetState).toHaveBeenCalledOnce();
      expect(published).toHaveLength(1);
      expect(published[0]!.event).toBe('orchestration_event');
      expect(published[0]!.data).toMatchObject({
        kind: 'state_snapshot',
        payload: { iteration: 5, hat: 'planner' },
      });
    });

    it('includes a timestamp in the orchestration_event', async () => {
      const { handler, published } = setup();

      await handler.dispatch({ method: 'get_state' });

      expect(published[0]!.data.timestamp).toBeDefined();
      expect(Number.isNaN(Date.parse(published[0]!.data.timestamp))).toBe(
        false,
      );
    });

    it('publishes error when onGetState throws', async () => {
      const { handler, hooks, published } = setup();
      hooks.onGetState.mockImplementation(() => {
        throw new Error('snapshot fail');
      });

      await handler.dispatch({ method: 'get_state' });

      expect(published).toHaveLength(1);
      expect(published[0]!.event).toBe('error');
      expect(published[0]!.data).toMatchObject({
        code: 'GET_STATE_FAILED',
        message: 'snapshot fail',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // get_iterations
  // ---------------------------------------------------------------------------

  describe('get_iterations', () => {
    it('calls onGetIterations with parsed params', async () => {
      const { handler, hooks } = setup();
      const cmd: RpcCommand = {
        method: 'get_iterations',
        params: { after: 2, limit: 10 },
      };

      await handler.dispatch(cmd);

      expect(hooks.onGetIterations).toHaveBeenCalledOnce();
      expect(hooks.onGetIterations).toHaveBeenCalledWith({
        after: 2,
        limit: 10,
      });
    });

    it('calls onGetIterations with empty params when optional fields omitted', async () => {
      const { handler, hooks } = setup();

      await handler.dispatch({
        method: 'get_iterations',
        params: {},
      });

      expect(hooks.onGetIterations).toHaveBeenCalledWith({});
    });

    it('publishes error when after is negative', async () => {
      const { handler, hooks, published } = setup();

      await handler.dispatch({
        method: 'get_iterations',
        params: { after: -1 },
      } as RpcCommand);

      expect(hooks.onGetIterations).not.toHaveBeenCalled();
      expect(published[0]!.event).toBe('error');
    });

    it('publishes error when limit is zero', async () => {
      const { handler, hooks, published } = setup();

      await handler.dispatch({
        method: 'get_iterations',
        params: { limit: 0 },
      } as RpcCommand);

      expect(hooks.onGetIterations).not.toHaveBeenCalled();
      expect(published[0]!.event).toBe('error');
    });
  });

  // ---------------------------------------------------------------------------
  // set_hat
  // ---------------------------------------------------------------------------

  describe('set_hat', () => {
    it('calls onSetHat with parsed params', async () => {
      const { handler, hooks } = setup();
      const cmd: RpcCommand = {
        method: 'set_hat',
        params: { hatId: 'architect' },
      };

      await handler.dispatch(cmd);

      expect(hooks.onSetHat).toHaveBeenCalledOnce();
      expect(hooks.onSetHat).toHaveBeenCalledWith({ hatId: 'architect' });
    });

    it('publishes error when hatId is missing', async () => {
      const { handler, hooks, published } = setup();

      await handler.dispatch({
        method: 'set_hat',
        params: {},
      } as unknown as RpcCommand);

      expect(hooks.onSetHat).not.toHaveBeenCalled();
      expect(published[0]!.event).toBe('error');
    });

    it('publishes error when hook throws', async () => {
      const { handler, hooks, published } = setup();
      hooks.onSetHat.mockRejectedValueOnce(new Error('hat fail'));

      await handler.dispatch({
        method: 'set_hat',
        params: { hatId: 'coder' },
      });

      // error event only — no hat_changed when hook fails
      expect(published).toHaveLength(1);
      expect(published[0]!.data).toMatchObject({
        code: 'HOOK_ERROR',
        message: 'hat fail',
      });
    });

    it('publishes hat_changed event after successful hook', async () => {
      const { handler, published } = setup();

      await handler.dispatch({
        method: 'set_hat',
        params: { hatId: 'architect' },
      });

      expect(published).toHaveLength(1);
      expect(published[0]!.event).toBe('hat_changed');
      expect(published[0]!.data).toMatchObject({ newHatId: 'architect' });
      expect(published[0]!.data).toHaveProperty('timestamp');
    });

    it('does not publish hat_changed when hook throws', async () => {
      const { handler, hooks, published } = setup();
      hooks.onSetHat.mockRejectedValueOnce(new Error('nope'));

      await handler.dispatch({
        method: 'set_hat',
        params: { hatId: 'reviewer' },
      });

      const hatEvents = published.filter((e) => e.event === 'hat_changed');
      expect(hatEvents).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // General dispatch behavior
  // ---------------------------------------------------------------------------

  describe('dispatch', () => {
    it('does not throw for any valid command', async () => {
      const { handler } = setup();

      const commands: RpcCommand[] = [
        { method: 'prompt', params: { text: 'go' } },
        { method: 'guidance', params: { text: 'help', appliesTo: 'current_iteration' } },
        { method: 'steer', params: { directive: 'left', force: false } },
        { method: 'follow_up', params: { text: 'more' } },
        { method: 'abort', params: {} },
        { method: 'get_state' },
        { method: 'get_iterations', params: {} },
        { method: 'set_hat', params: { hatId: 'coder' } },
      ];

      for (const cmd of commands) {
        await expect(handler.dispatch(cmd)).resolves.toBeUndefined();
      }
    });

    it('publishes error events with timestamps', async () => {
      const { handler, published } = setup();

      await handler.dispatch({
        method: 'prompt',
        params: { text: '' },
      } as RpcCommand);

      expect(published[0]!.data.timestamp).toBeDefined();
      expect(Number.isNaN(Date.parse(published[0]!.data.timestamp))).toBe(
        false,
      );
    });
  });
});
