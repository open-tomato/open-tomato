import type { WorkerPromptOptions } from '../wave/wave-prompt-builder.js';

import { describe, expect, it } from 'bun:test';

import { WavePromptBuilder } from '../wave/wave-prompt-builder.js';

function makeOptions(overrides: Partial<WorkerPromptOptions> = {}): WorkerPromptOptions {
  return {
    hat_instructions: 'You are a research assistant.',
    worker_index: 0,
    worker_total: 3,
    payload: 'Summarize document A',
    publish_command: 'ralph publish results.jsonl',
    ...overrides,
  };
}

describe('WavePromptBuilder', () => {
  const builder = new WavePromptBuilder();

  it('output contains hat instructions verbatim', () => {
    const instructions = 'Analyze data carefully.\nFollow the schema.';
    const prompt = builder.buildWorkerPrompt(makeOptions({ hat_instructions: instructions }));

    expect(prompt).toContain(instructions);
  });

  it('output contains correct worker identity line', () => {
    const prompt = builder.buildWorkerPrompt(makeOptions({ worker_index: 2, worker_total: 5 }));

    expect(prompt).toContain('You are worker 3 of 5.');
  });

  it('output contains the task payload', () => {
    const payload = 'Extract entities from paragraph 7';
    const prompt = builder.buildWorkerPrompt(makeOptions({ payload }));

    expect(prompt).toContain(`Your task: ${payload}`);
  });

  it('output contains the publish command', () => {
    const cmd = 'ralph publish --file output.jsonl';
    const prompt = builder.buildWorkerPrompt(makeOptions({ publish_command: cmd }));

    expect(prompt).toContain(`When complete, run: ${cmd}`);
  });

  it('output contains the nested-wave constraint', () => {
    const prompt = builder.buildWorkerPrompt(makeOptions());

    expect(prompt).toContain('Do not spawn nested wave operations.');
  });

  it('output is consistent across identical inputs', () => {
    const opts = makeOptions({ worker_index: 1, worker_total: 4, payload: 'task-B' });

    const first = builder.buildWorkerPrompt(opts);
    const second = builder.buildWorkerPrompt(opts);

    expect(first).toBe(second);
  });

  it('uses 1-based worker index in the identity line', () => {
    const prompt = builder.buildWorkerPrompt(makeOptions({ worker_index: 0 }));

    expect(prompt).toContain('You are worker 1 of 3.');
  });

  it('does not include session history or full context beyond the five defined sections', () => {
    const opts = makeOptions({
      hat_instructions: 'INSTRUCTIONS',
      worker_index: 0,
      worker_total: 3,
      payload: 'PAYLOAD',
      publish_command: 'CMD',
    });

    const prompt = builder.buildWorkerPrompt(opts);
    const lines = prompt.split('\n');

    expect(lines).toHaveLength(5);
    expect(prompt).not.toContain('session');
    expect(prompt).not.toContain('history');
    expect(prompt).not.toContain('context');
    expect(prompt).not.toContain('previous');
  });

  it('joins all sections with newlines in the correct order', () => {
    const opts = makeOptions({
      hat_instructions: 'INSTRUCTIONS',
      worker_index: 1,
      worker_total: 2,
      payload: 'PAYLOAD',
      publish_command: 'CMD',
    });

    const prompt = builder.buildWorkerPrompt(opts);
    const lines = prompt.split('\n');

    expect(lines[0]).toBe('INSTRUCTIONS');
    expect(lines[1]).toBe('You are worker 2 of 2.');
    expect(lines[2]).toBe('Your task: PAYLOAD');
    expect(lines[3]).toBe('When complete, run: CMD');
    expect(lines[4]).toBe('Do not spawn nested wave operations.');
    expect(lines).toHaveLength(5);
  });
});
