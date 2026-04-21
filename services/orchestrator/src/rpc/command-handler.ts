/**
 * @packageDocumentation
 * Command handler that receives parsed {@link RpcCommand} objects and dispatches
 * them to registered orchestrator hooks.
 *
 * Each command method (`prompt`, `guidance`, `steer`, etc.) is validated with
 * its corresponding Zod schema before dispatch. Handlers are provided by the
 * consumer at construction time via the {@link CommandHooks} interface.
 *
 * The handler publishes acknowledgment events back through the
 * {@link RpcEventBus} for commands that require confirmation (`guidance`,
 * `steer`).
 *
 * @example
 * ```ts
 * import { RpcCommandHandler } from './command-handler.js';
 * import { RpcEventBus } from './event-bus.js';
 *
 * const bus = new RpcEventBus();
 * const handler = new RpcCommandHandler({
 *   bus,
 *   hooks: {
 *     onPrompt: async (params) => { ... },
 *     onGuidance: async (params) => { ... },
 *     // ...
 *   },
 * });
 *
 * handler.dispatch(parsedCommand);
 * ```
 */

import type { RpcEventBus } from './event-bus.js';
import type {
  RpcCommand,
  PromptParams,
  GuidanceParams,
  SteerParams,
  FollowUpParams,
  AbortParams,
  GetIterationsParams,
  SetHatParams,
  RpcEvent,
} from './types/index.js';

import {
  promptCommandSchema,
  guidanceCommandSchema,
  steerCommandSchema,
  followUpCommandSchema,
  abortCommandSchema,
  getStateCommandSchema,
  getIterationsCommandSchema,
  setHatCommandSchema,
} from './types/commands.js';

// ---------------------------------------------------------------------------
// Hook interface
// ---------------------------------------------------------------------------

/**
 * Orchestrator hooks invoked by the {@link RpcCommandHandler} for each
 * command method.
 *
 * All hooks receive the validated params object for their command. Hooks
 * may be synchronous or asynchronous — the handler `await`s the result
 * in either case.
 *
 * `onGetState` is the exception: it must return a synchronous snapshot
 * so it never blocks the orchestration loop.
 */
export interface CommandHooks {
  /** Handle a `prompt` command — start a new orchestration run. */
  onPrompt(params: PromptParams): void | Promise<void>;

  /** Handle a `guidance` command — inject advisory context into the active run. */
  onGuidance(params: GuidanceParams): void | Promise<void>;

  /** Handle a `steer` command — override the orchestrator's next action. */
  onSteer(params: SteerParams): void | Promise<void>;

  /** Handle a `follow_up` command — append a follow-up message to the active run. */
  onFollowUp(params: FollowUpParams): void | Promise<void>;

  /** Handle an `abort` command — terminate the active orchestration run. */
  onAbort(params: AbortParams): void | Promise<void>;

  /**
   * Handle a `get_state` command — return a synchronous state snapshot.
   *
   * This hook **must not** block. It returns a plain object that is
   * published as an `orchestration_event` with kind `state_snapshot`.
   */
  onGetState(): Record<string, unknown>;

  /** Handle a `get_iterations` command — retrieve iteration history. */
  onGetIterations(params: GetIterationsParams): void | Promise<void>;

  /** Handle a `set_hat` command — switch the active hat mid-run. */
  onSetHat(params: SetHatParams): void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * Configuration for constructing an {@link RpcCommandHandler}.
 */
export interface RpcCommandHandlerOptions {
  /** The event bus used to publish acknowledgment and error events. */
  readonly bus: RpcEventBus;

  /** Orchestrator hook implementations for each command method. */
  readonly hooks: CommandHooks;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * Dispatches validated {@link RpcCommand} objects to the appropriate
 * orchestrator hook.
 *
 * Each command is re-validated against its Zod schema at the entry point
 * of its handler to guarantee type safety even when the caller skips
 * upstream validation. Validation failures are published as `error` events
 * on the {@link RpcEventBus}.
 *
 * `guidance` and `steer` commands publish a `guidance_ack` event after
 * the hook completes (or rejects).
 */
export class RpcCommandHandler {
  private readonly bus: RpcEventBus;
  private readonly hooks: CommandHooks;

  constructor(options: RpcCommandHandlerOptions) {
    this.bus = options.bus;
    this.hooks = options.hooks;
  }

  /**
   * Dispatch a parsed command to the correct handler.
   *
   * The method field determines which hook is invoked. Unknown methods
   * produce an `error` event.
   *
   * @param command - The raw command object (will be re-validated).
   */
  async dispatch(command: RpcCommand): Promise<void> {
    switch (command.method) {
      case 'prompt':
        return this.handlePrompt(command);
      case 'guidance':
        return this.handleGuidance(command);
      case 'steer':
        return this.handleSteer(command);
      case 'follow_up':
        return this.handleFollowUp(command);
      case 'abort':
        return this.handleAbort(command);
      case 'get_state':
        return this.handleGetState(command);
      case 'get_iterations':
        return this.handleGetIterations(command);
      case 'set_hat':
        return this.handleSetHat(command);
    }
  }

  // -------------------------------------------------------------------------
  // Per-method handlers
  // -------------------------------------------------------------------------

  /**
   * Validate and dispatch a `prompt` command.
   *
   * @param command - The raw prompt command.
   */
  private async handlePrompt(command: unknown): Promise<void> {
    const parsed = this.parseOrPublishError(
      () => promptCommandSchema.parse(command),
      'prompt',
    );
    if (!parsed) return;

    await this.invokeHook(() => this.hooks.onPrompt(parsed.params), 'prompt');
  }

  /**
   * Validate and dispatch a `guidance` command.
   *
   * Publishes a `guidance_ack` event after the hook completes or rejects.
   *
   * @param command - The raw guidance command.
   */
  private async handleGuidance(command: unknown): Promise<void> {
    const parsed = this.parseOrPublishError(
      () => guidanceCommandSchema.parse(command),
      'guidance',
    );
    if (!parsed) return;

    const accepted = await this.invokeHook(
      () => this.hooks.onGuidance(parsed.params),
      'guidance',
    );

    this.publishGuidanceAck('guidance', accepted);
  }

  /**
   * Validate and dispatch a `steer` command.
   *
   * Publishes a `guidance_ack` event (with `commandType: 'steer'`) after
   * the hook completes or rejects.
   *
   * @param command - The raw steer command.
   */
  private async handleSteer(command: unknown): Promise<void> {
    const parsed = this.parseOrPublishError(
      () => steerCommandSchema.parse(command),
      'steer',
    );
    if (!parsed) return;

    const accepted = await this.invokeHook(
      () => this.hooks.onSteer(parsed.params),
      'steer',
    );

    this.publishGuidanceAck('steer', accepted);
  }

  /**
   * Validate and dispatch a `follow_up` command.
   *
   * @param command - The raw follow_up command.
   */
  private async handleFollowUp(command: unknown): Promise<void> {
    const parsed = this.parseOrPublishError(
      () => followUpCommandSchema.parse(command),
      'follow_up',
    );
    if (!parsed) return;

    await this.invokeHook(
      () => this.hooks.onFollowUp(parsed.params),
      'follow_up',
    );
  }

  /**
   * Validate and dispatch an `abort` command.
   *
   * @param command - The raw abort command.
   */
  private async handleAbort(command: unknown): Promise<void> {
    const parsed = this.parseOrPublishError(
      () => abortCommandSchema.parse(command),
      'abort',
    );
    if (!parsed) return;

    await this.invokeHook(
      () => this.hooks.onAbort(parsed.params),
      'abort',
    );
  }

  /**
   * Validate and dispatch a `get_state` command.
   *
   * The hook is synchronous — the snapshot is captured without blocking
   * the orchestration loop and published as an `orchestration_event`.
   *
   * @param command - The raw get_state command.
   */
  private handleGetState(command: unknown): void {
    const parsed = this.parseOrPublishError(
      () => getStateCommandSchema.parse(command),
      'get_state',
    );
    if (!parsed) return;

    try {
      const snapshot = this.hooks.onGetState();
      const event: RpcEvent = {
        event: 'orchestration_event',
        data: {
          kind: 'state_snapshot',
          payload: snapshot,
          timestamp: new Date().toISOString(),
        },
      };
      this.bus.publish(event);
    } catch (err: unknown) {
      this.publishError('GET_STATE_FAILED', err);
    }
  }

  /**
   * Validate and dispatch a `get_iterations` command.
   *
   * @param command - The raw get_iterations command.
   */
  private async handleGetIterations(command: unknown): Promise<void> {
    const parsed = this.parseOrPublishError(
      () => getIterationsCommandSchema.parse(command),
      'get_iterations',
    );
    if (!parsed) return;

    await this.invokeHook(
      () => this.hooks.onGetIterations(parsed.params),
      'get_iterations',
    );
  }

  /**
   * Validate and dispatch a `set_hat` command.
   *
   * Publishes a `hat_changed` event after the hook completes successfully.
   *
   * @param command - The raw set_hat command.
   */
  private async handleSetHat(command: unknown): Promise<void> {
    const parsed = this.parseOrPublishError(
      () => setHatCommandSchema.parse(command),
      'set_hat',
    );
    if (!parsed) return;

    const accepted = await this.invokeHook(
      () => this.hooks.onSetHat(parsed.params),
      'set_hat',
    );

    if (accepted) {
      const event: RpcEvent = {
        event: 'hat_changed',
        data: {
          newHatId: parsed.params.hatId,
          timestamp: new Date().toISOString(),
        },
      };
      this.bus.publish(event);
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Attempt to parse a command with its Zod schema. On failure, publish an
   * `error` event and return `undefined`.
   */
  private parseOrPublishError<T>(
    parseFn: () => T,
    method: string,
  ): T | undefined {
    try {
      return parseFn();
    } catch (err: unknown) {
      this.publishError(
        'VALIDATION_ERROR',
        err,
        `Failed to validate '${method}' command`,
      );
      return undefined;
    }
  }

  /**
   * Invoke an orchestrator hook, catching and publishing errors.
   *
   * @returns `true` if the hook succeeded, `false` if it threw.
   */
  private async invokeHook(
    hookFn: () => void | Promise<void>,
    method: string,
  ): Promise<boolean> {
    try {
      await hookFn();
      return true;
    } catch (err: unknown) {
      this.publishError(
        'HOOK_ERROR',
        err,
        `Hook for '${method}' command failed`,
      );
      return false;
    }
  }

  /**
   * Publish a `guidance_ack` event through the event bus.
   */
  private publishGuidanceAck(
    commandType: 'guidance' | 'steer',
    accepted: boolean,
  ): void {
    const event: RpcEvent = {
      event: 'guidance_ack',
      data: {
        commandType,
        accepted,
        timestamp: new Date().toISOString(),
      },
    };
    this.bus.publish(event);
  }

  /**
   * Publish an `error` event through the event bus.
   */
  private publishError(
    code: string,
    err: unknown,
    fallbackMessage?: string,
  ): void {
    const message =
      err instanceof Error
        ? err.message
        : (fallbackMessage ?? 'Unknown error');

    const event: RpcEvent = {
      event: 'error',
      data: {
        code,
        message,
        timestamp: new Date().toISOString(),
      },
    };
    this.bus.publish(event);
  }
}
