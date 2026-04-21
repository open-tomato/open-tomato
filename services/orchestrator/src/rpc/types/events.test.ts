import { describe, expect, it } from 'vitest';

import {
  errorEventSchema,
  guidanceAckEventSchema,
  hatChangedEventSchema,
  iterationEndEventSchema,
  iterationStartEventSchema,
  loopStartedEventSchema,
  loopTerminatedEventSchema,
  orchestrationEventEventSchema,
  rpcEventSchema,
  taskCountsUpdatedEventSchema,
  taskStatusChangedEventSchema,
  textDeltaEventSchema,
  toolCallEndEventSchema,
  toolCallStartEventSchema,
  waveCompletedEventSchema,
  waveStartedEventSchema,
  waveWorkerDoneEventSchema,
} from './events.js';

const TS = '2026-03-31T12:00:00Z';

// ---------------------------------------------------------------------------
// Lifecycle events
// ---------------------------------------------------------------------------

describe('loopStartedEventSchema', () => {
  it('accepts a valid loop_started event', () => {
    const result = loopStartedEventSchema.parse({
      event: 'loop_started',
      data: { timestamp: TS, prompt: 'Build the feature' },
    });

    expect(result.event).toBe('loop_started');
    expect(result.data.prompt).toBe('Build the feature');
  });

  it('accepts optional hatId and maxIterations', () => {
    const result = loopStartedEventSchema.parse({
      event: 'loop_started',
      data: {
        timestamp: TS,
        prompt: 'Go',
        hatId: 'planner',
        maxIterations: 10,
      },
    });

    expect(result.data.hatId).toBe('planner');
    expect(result.data.maxIterations).toBe(10);
  });

  it('rejects missing prompt', () => {
    expect(() => loopStartedEventSchema.parse({
      event: 'loop_started',
      data: { timestamp: TS },
    })).toThrow();
  });

  it('rejects missing timestamp', () => {
    expect(() => loopStartedEventSchema.parse({
      event: 'loop_started',
      data: { prompt: 'Go' },
    })).toThrow();
  });

  it('rejects non-ISO timestamp', () => {
    expect(() => loopStartedEventSchema.parse({
      event: 'loop_started',
      data: { timestamp: 'not-a-date', prompt: 'Go' },
    })).toThrow();
  });
});

describe('iterationStartEventSchema', () => {
  it('accepts a valid iteration_start event', () => {
    const result = iterationStartEventSchema.parse({
      event: 'iteration_start',
      data: { index: 0, timestamp: TS },
    });

    expect(result.data.index).toBe(0);
  });

  it('rejects negative index', () => {
    expect(() => iterationStartEventSchema.parse({
      event: 'iteration_start',
      data: { index: -1, timestamp: TS },
    })).toThrow();
  });

  it('rejects missing index', () => {
    expect(() => iterationStartEventSchema.parse({
      event: 'iteration_start',
      data: { timestamp: TS },
    })).toThrow();
  });
});

describe('iterationEndEventSchema', () => {
  it('accepts a valid iteration_end event', () => {
    const result = iterationEndEventSchema.parse({
      event: 'iteration_end',
      data: { index: 2, timestamp: TS, durationMs: 1500 },
    });

    expect(result.data.durationMs).toBe(1500);
  });

  it('accepts optional tokensUsed', () => {
    const result = iterationEndEventSchema.parse({
      event: 'iteration_end',
      data: { index: 0, timestamp: TS, durationMs: 100, tokensUsed: 500 },
    });

    expect(result.data.tokensUsed).toBe(500);
  });

  it('rejects negative durationMs', () => {
    expect(() => iterationEndEventSchema.parse({
      event: 'iteration_end',
      data: { index: 0, timestamp: TS, durationMs: -1 },
    })).toThrow();
  });

  it('rejects missing durationMs', () => {
    expect(() => iterationEndEventSchema.parse({
      event: 'iteration_end',
      data: { index: 0, timestamp: TS },
    })).toThrow();
  });
});

describe('loopTerminatedEventSchema', () => {
  it('accepts a valid loop_terminated event', () => {
    const result = loopTerminatedEventSchema.parse({
      event: 'loop_terminated',
      data: { timestamp: TS, reason: 'completed', totalIterations: 5 },
    });

    expect(result.data.reason).toBe('completed');
    expect(result.data.totalIterations).toBe(5);
  });

  it('accepts all valid termination reasons', () => {
    for (const reason of ['completed', 'aborted', 'max_iterations', 'error']) {
      const result = loopTerminatedEventSchema.parse({
        event: 'loop_terminated',
        data: { timestamp: TS, reason, totalIterations: 0 },
      });

      expect(result.data.reason).toBe(reason);
    }
  });

  it('rejects unknown termination reason', () => {
    expect(() => loopTerminatedEventSchema.parse({
      event: 'loop_terminated',
      data: { timestamp: TS, reason: 'timeout', totalIterations: 0 },
    })).toThrow();
  });

  it('rejects missing reason', () => {
    expect(() => loopTerminatedEventSchema.parse({
      event: 'loop_terminated',
      data: { timestamp: TS, totalIterations: 0 },
    })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Streaming events
// ---------------------------------------------------------------------------

describe('textDeltaEventSchema', () => {
  it('accepts a valid text_delta event', () => {
    const result = textDeltaEventSchema.parse({
      event: 'text_delta',
      data: { delta: 'Hello', iterationIndex: 0 },
    });

    expect(result.data.delta).toBe('Hello');
  });

  it('accepts empty string delta', () => {
    const result = textDeltaEventSchema.parse({
      event: 'text_delta',
      data: { delta: '', iterationIndex: 0 },
    });

    expect(result.data.delta).toBe('');
  });

  it('rejects missing iterationIndex', () => {
    expect(() => textDeltaEventSchema.parse({
      event: 'text_delta',
      data: { delta: 'Hi' },
    })).toThrow();
  });
});

describe('toolCallStartEventSchema', () => {
  it('accepts a valid tool_call_start event', () => {
    const result = toolCallStartEventSchema.parse({
      event: 'tool_call_start',
      data: {
        callId: 'c1',
        toolName: 'read_file',
        iterationIndex: 0,
        timestamp: TS,
      },
    });

    expect(result.data.toolName).toBe('read_file');
  });

  it('rejects missing callId', () => {
    expect(() => toolCallStartEventSchema.parse({
      event: 'tool_call_start',
      data: { toolName: 'read_file', iterationIndex: 0, timestamp: TS },
    })).toThrow();
  });
});

describe('toolCallEndEventSchema', () => {
  it('accepts a valid tool_call_end event', () => {
    const result = toolCallEndEventSchema.parse({
      event: 'tool_call_end',
      data: {
        callId: 'c1',
        toolName: 'read_file',
        iterationIndex: 0,
        success: true,
        durationMs: 42,
        timestamp: TS,
      },
    });

    expect(result.data.success).toBe(true);
    expect(result.data.durationMs).toBe(42);
  });

  it('rejects missing success field', () => {
    expect(() => toolCallEndEventSchema.parse({
      event: 'tool_call_end',
      data: {
        callId: 'c1',
        toolName: 'read_file',
        iterationIndex: 0,
        durationMs: 42,
        timestamp: TS,
      },
    })).toThrow();
  });

  it('rejects negative durationMs', () => {
    expect(() => toolCallEndEventSchema.parse({
      event: 'tool_call_end',
      data: {
        callId: 'c1',
        toolName: 'read_file',
        iterationIndex: 0,
        success: true,
        durationMs: -5,
        timestamp: TS,
      },
    })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Error event
// ---------------------------------------------------------------------------

describe('errorEventSchema', () => {
  it('accepts a valid error event', () => {
    const result = errorEventSchema.parse({
      event: 'error',
      data: { code: 'PARSE_ERROR', message: 'Bad JSON', timestamp: TS },
    });

    expect(result.data.code).toBe('PARSE_ERROR');
  });

  it('accepts optional details', () => {
    const result = errorEventSchema.parse({
      event: 'error',
      data: {
        code: 'ERR',
        message: 'Fail',
        timestamp: TS,
        details: { line: 42 },
      },
    });

    expect(result.data.details).toEqual({ line: 42 });
  });

  it('rejects missing code', () => {
    expect(() => errorEventSchema.parse({
      event: 'error',
      data: { message: 'Fail', timestamp: TS },
    })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Orchestration events
// ---------------------------------------------------------------------------

describe('hatChangedEventSchema', () => {
  it('accepts a valid hat_changed event', () => {
    const result = hatChangedEventSchema.parse({
      event: 'hat_changed',
      data: { newHatId: 'developer', timestamp: TS },
    });

    expect(result.data.newHatId).toBe('developer');
    expect(result.data.previousHatId).toBeUndefined();
  });

  it('accepts optional previousHatId', () => {
    const result = hatChangedEventSchema.parse({
      event: 'hat_changed',
      data: {
        previousHatId: 'planner',
        newHatId: 'developer',
        timestamp: TS,
      },
    });

    expect(result.data.previousHatId).toBe('planner');
  });

  it('rejects missing newHatId', () => {
    expect(() => hatChangedEventSchema.parse({
      event: 'hat_changed',
      data: { timestamp: TS },
    })).toThrow();
  });
});

describe('taskStatusChangedEventSchema', () => {
  it('accepts a valid task_status_changed event', () => {
    const result = taskStatusChangedEventSchema.parse({
      event: 'task_status_changed',
      data: {
        taskId: 't1',
        previousStatus: 'pending',
        newStatus: 'in_progress',
        timestamp: TS,
      },
    });

    expect(result.data.newStatus).toBe('in_progress');
  });

  it('rejects missing taskId', () => {
    expect(() => taskStatusChangedEventSchema.parse({
      event: 'task_status_changed',
      data: {
        previousStatus: 'pending',
        newStatus: 'in_progress',
        timestamp: TS,
      },
    })).toThrow();
  });
});

describe('taskCountsUpdatedEventSchema', () => {
  it('accepts a valid task_counts_updated event', () => {
    const result = taskCountsUpdatedEventSchema.parse({
      event: 'task_counts_updated',
      data: {
        pending: 3,
        inProgress: 1,
        completed: 5,
        failed: 0,
        timestamp: TS,
      },
    });

    expect(result.data.pending).toBe(3);
  });

  it('rejects negative count values', () => {
    expect(() => taskCountsUpdatedEventSchema.parse({
      event: 'task_counts_updated',
      data: {
        pending: -1,
        inProgress: 0,
        completed: 0,
        failed: 0,
        timestamp: TS,
      },
    })).toThrow();
  });

  it('rejects missing count fields', () => {
    expect(() => taskCountsUpdatedEventSchema.parse({
      event: 'task_counts_updated',
      data: { pending: 0, timestamp: TS },
    })).toThrow();
  });
});

describe('orchestrationEventEventSchema', () => {
  it('accepts a valid orchestration_event', () => {
    const result = orchestrationEventEventSchema.parse({
      event: 'orchestration_event',
      data: { kind: 'phase_change', timestamp: TS },
    });

    expect(result.data.kind).toBe('phase_change');
  });

  it('accepts optional payload', () => {
    const result = orchestrationEventEventSchema.parse({
      event: 'orchestration_event',
      data: {
        kind: 'phase_change',
        payload: { from: 'plan', to: 'execute' },
        timestamp: TS,
      },
    });

    expect(result.data.payload).toEqual({ from: 'plan', to: 'execute' });
  });
});

// ---------------------------------------------------------------------------
// Guidance events
// ---------------------------------------------------------------------------

describe('guidanceAckEventSchema', () => {
  it('accepts a valid guidance_ack event for guidance', () => {
    const result = guidanceAckEventSchema.parse({
      event: 'guidance_ack',
      data: { commandType: 'guidance', accepted: true, timestamp: TS },
    });

    expect(result.data.accepted).toBe(true);
  });

  it('accepts a valid guidance_ack event for steer', () => {
    const result = guidanceAckEventSchema.parse({
      event: 'guidance_ack',
      data: { commandType: 'steer', accepted: false, reason: 'No active loop', timestamp: TS },
    });

    expect(result.data.reason).toBe('No active loop');
  });

  it('rejects unknown commandType', () => {
    expect(() => guidanceAckEventSchema.parse({
      event: 'guidance_ack',
      data: { commandType: 'follow_up', accepted: true, timestamp: TS },
    })).toThrow();
  });

  it('rejects missing accepted field', () => {
    expect(() => guidanceAckEventSchema.parse({
      event: 'guidance_ack',
      data: { commandType: 'guidance', timestamp: TS },
    })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Wave events
// ---------------------------------------------------------------------------

describe('waveStartedEventSchema', () => {
  it('accepts a valid wave_started event', () => {
    const result = waveStartedEventSchema.parse({
      event: 'wave_started',
      data: { waveId: 'w1', workerCount: 3, timestamp: TS },
    });

    expect(result.data.workerCount).toBe(3);
  });

  it('rejects zero workerCount', () => {
    expect(() => waveStartedEventSchema.parse({
      event: 'wave_started',
      data: { waveId: 'w1', workerCount: 0, timestamp: TS },
    })).toThrow();
  });

  it('rejects missing waveId', () => {
    expect(() => waveStartedEventSchema.parse({
      event: 'wave_started',
      data: { workerCount: 3, timestamp: TS },
    })).toThrow();
  });
});

describe('waveWorkerDoneEventSchema', () => {
  it('accepts a valid wave_worker_done event', () => {
    const result = waveWorkerDoneEventSchema.parse({
      event: 'wave_worker_done',
      data: {
        waveId: 'w1',
        workerId: 'wk1',
        success: true,
        durationMs: 200,
        timestamp: TS,
      },
    });

    expect(result.data.workerId).toBe('wk1');
  });

  it('rejects negative durationMs', () => {
    expect(() => waveWorkerDoneEventSchema.parse({
      event: 'wave_worker_done',
      data: {
        waveId: 'w1',
        workerId: 'wk1',
        success: true,
        durationMs: -1,
        timestamp: TS,
      },
    })).toThrow();
  });
});

describe('waveCompletedEventSchema', () => {
  it('accepts a valid wave_completed event', () => {
    const result = waveCompletedEventSchema.parse({
      event: 'wave_completed',
      data: {
        waveId: 'w1',
        succeededCount: 2,
        failedCount: 1,
        durationMs: 500,
        timestamp: TS,
      },
    });

    expect(result.data.succeededCount).toBe(2);
    expect(result.data.failedCount).toBe(1);
  });

  it('rejects negative succeededCount', () => {
    expect(() => waveCompletedEventSchema.parse({
      event: 'wave_completed',
      data: {
        waveId: 'w1',
        succeededCount: -1,
        failedCount: 0,
        durationMs: 0,
        timestamp: TS,
      },
    })).toThrow();
  });

  it('rejects missing waveId', () => {
    expect(() => waveCompletedEventSchema.parse({
      event: 'wave_completed',
      data: {
        succeededCount: 1,
        failedCount: 0,
        durationMs: 0,
        timestamp: TS,
      },
    })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// rpcEventSchema — discriminated union
// ---------------------------------------------------------------------------

describe('rpcEventSchema', () => {
  it('narrows to loop_started event', () => {
    const result = rpcEventSchema.parse({
      event: 'loop_started',
      data: { timestamp: TS, prompt: 'Go' },
    });

    expect(result.event).toBe('loop_started');
  });

  it('narrows to text_delta event', () => {
    const result = rpcEventSchema.parse({
      event: 'text_delta',
      data: { delta: 'Hi', iterationIndex: 0 },
    });

    expect(result.event).toBe('text_delta');
  });

  it('narrows to wave_completed event', () => {
    const result = rpcEventSchema.parse({
      event: 'wave_completed',
      data: {
        waveId: 'w1',
        succeededCount: 1,
        failedCount: 0,
        durationMs: 100,
        timestamp: TS,
      },
    });

    expect(result.event).toBe('wave_completed');
  });

  it('rejects unknown event discriminant', () => {
    expect(() => rpcEventSchema.parse({
      event: 'unknown_event',
      data: {},
    })).toThrow();
  });

  it('rejects missing event field', () => {
    expect(() => rpcEventSchema.parse({ data: { timestamp: TS } })).toThrow();
  });

  it('rejects completely empty object', () => {
    expect(() => rpcEventSchema.parse({})).toThrow();
  });

  it('rejects non-object input', () => {
    expect(() => rpcEventSchema.parse('not an object')).toThrow();
    expect(() => rpcEventSchema.parse(42)).toThrow();
    expect(() => rpcEventSchema.parse(null)).toThrow();
  });
});
