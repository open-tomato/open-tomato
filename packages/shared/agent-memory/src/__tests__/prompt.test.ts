import type { InjectionConfig } from '../types.js';

import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildPromptWithMemories } from '../budget.js';
import { MarkdownMemoryStore } from '../store.js';

function tmpStorePath(): string {
  return join(tmpdir(), `prompt-test-${crypto.randomUUID()}`, 'memories.md');
}

const BASE_PROMPT = 'Do the thing.';

describe('buildPromptWithMemories', () => {
  let store: MarkdownMemoryStore;

  beforeEach(() => {
    store = new MarkdownMemoryStore(tmpStorePath());
  });

  afterEach(async () => {
    // Ensure the store file is created so cleanup is predictable — no-op if unused
  });

  it('returns basePrompt unchanged when mode is off', async () => {
    const config: InjectionConfig = { mode: 'off', budgetTokens: 2000 };
    const result = await buildPromptWithMemories(BASE_PROMPT, store, config);
    expect(result).toBe(BASE_PROMPT);
  });

  it('returns basePrompt unchanged when mode is off even with memories in store', async () => {
    await store.append({ type: 'pattern', content: 'Some pattern.', tags: [] });
    const config: InjectionConfig = { mode: 'off', budgetTokens: 2000 };
    const result = await buildPromptWithMemories(BASE_PROMPT, store, config);
    expect(result).toBe(BASE_PROMPT);
  });

  it('returns basePrompt unchanged when store is empty', async () => {
    const config: InjectionConfig = { mode: 'auto', budgetTokens: 2000 };
    const result = await buildPromptWithMemories(BASE_PROMPT, store, config);
    expect(result).toBe(BASE_PROMPT);
  });

  it('prepends memories before basePrompt with blank line separator', async () => {
    await store.append({ type: 'pattern', content: 'Use Zod for validation.', tags: ['zod'] });
    const config: InjectionConfig = { mode: 'auto', budgetTokens: 2000 };
    const result = await buildPromptWithMemories(BASE_PROMPT, store, config);
    expect(result).toContain('## Agent Memories');
    expect(result).toContain('Use Zod for validation.');
    expect(result).toContain(`\n\n${BASE_PROMPT}`);
    expect(result.endsWith(BASE_PROMPT)).toBe(true);
  });

  it('applies filter before formatting', async () => {
    await store.append({ type: 'pattern', content: 'Pattern memory.', tags: ['ts'] });
    await store.append({ type: 'decision', content: 'Decision memory.', tags: ['arch'] });
    const config: InjectionConfig = {
      mode: 'auto',
      budgetTokens: 2000,
      filter: { type: 'pattern' },
    };
    const result = await buildPromptWithMemories(BASE_PROMPT, store, config);
    expect(result).toContain('Pattern memory.');
    expect(result).not.toContain('Decision memory.');
  });

  it('returns basePrompt unchanged when filter matches no memories', async () => {
    await store.append({ type: 'decision', content: 'Decision memory.', tags: [] });
    const config: InjectionConfig = {
      mode: 'auto',
      budgetTokens: 2000,
      filter: { type: 'pattern' },
    };
    const result = await buildPromptWithMemories(BASE_PROMPT, store, config);
    expect(result).toBe(BASE_PROMPT);
  });

  it('truncates memories to fit within budgetTokens', async () => {
    const longContent = 'A'.repeat(400); // ~100 tokens
    await store.append({ type: 'pattern', content: longContent, tags: [] });
    await store.append({ type: 'fix', content: 'Short fix.', tags: [] });

    // Budget large enough for header + first block + notice but not second block
    const config: InjectionConfig = { mode: 'auto', budgetTokens: 30 };
    const result = await buildPromptWithMemories(BASE_PROMPT, store, config);
    // The truncation notice should appear (memories were cut)
    expect(result).toContain('<!-- memories truncated to fit token budget -->');
    expect(result.endsWith(BASE_PROMPT)).toBe(true);
  });
});
