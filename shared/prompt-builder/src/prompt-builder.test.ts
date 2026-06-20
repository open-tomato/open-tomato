import type {
  GuardrailRule,
  HatDefinition,
  MemoryBlock,
  PendingEvent,
  PromptContext,
  PromptSection,
  SkillManifest,
  TokenBudget,
} from './types/index.js';

import { describe, expect, it, vi } from 'vitest';

import { PromptBuilder, createDefaultPromptBuilder } from './prompt-builder.js';
import { TokenBudgetManager } from './token-budget/index.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTokenBudget(
  overrides: Partial<TokenBudget> = {},
): TokenBudget {
  return {
    totalTokens: 176_000,
    targetMinPercent: 40,
    targetMaxPercent: 60,
    maxForSection: () => 10_000,
    ...overrides,
  };
}

function makeSkill(id: string): SkillManifest {
  return {
    id,
    name: `Skill ${id}`,
    description: `Description for ${id}`,
    xmlTag: `skill-${id}`,
    docs: `# ${id} docs`,
  };
}

function makeHat(id: string): HatDefinition {
  return {
    id,
    name: `Hat ${id}`,
    role: `Role of ${id}`,
    publishTopics: [`${id}.out`],
    subscribeTopics: [`${id}.in`],
    instructions: `Instructions for ${id}`,
  };
}

function makeMemory(id: string): MemoryBlock {
  return { id, content: `Memory content ${id}`, tokenCount: 50 };
}

function makeGuardrail(index: number): GuardrailRule {
  return { index, level: 'MUST', rule: `Guardrail rule ${index}` };
}

function makePendingEvent(id: string): PendingEvent {
  return { id, topic: 'test.topic', payload: { data: id }, forHatId: 'hat-a' };
}

function makeContext(overrides: Partial<PromptContext> = {}): PromptContext {
  const hat = makeHat('hat-a');
  return {
    hatId: 'hat-a',
    objective: 'Build a reliable agent loop.',
    robotGuidance: ['Check memory before acting.'],
    pendingEvents: [makePendingEvent('evt-1')],
    memories: [makeMemory('mem-1')],
    skills: [makeSkill('skill-a')],
    guardrails: [makeGuardrail(1), makeGuardrail(2)],
    hats: [hat],
    activeHatIds: ['hat-a'],
    tokenBudget: makeTokenBudget(),
    ...overrides,
  };
}

// ─── PromptBuilder (direct) ───────────────────────────────────────────────────

describe('PromptBuilder', () => {
  it('renders sections in the order they were provided', async () => {
    const order: string[] = [];

    const makeSection = (name: string, output: string): PromptSection => ({
      name,
      render: () => {
        order.push(name);
        return output;
      },
    });

    const builder = new PromptBuilder([
      makeSection('first', 'FIRST'),
      makeSection('second', 'SECOND'),
      makeSection('third', 'THIRD'),
    ]);

    const result = await builder.build(makeContext());

    expect(order).toEqual(['first', 'second', 'third']);
    expect(result).toBe('FIRST\n\nSECOND\n\nTHIRD');
  });

  it('filters out sections that return empty strings', async () => {
    const builder = new PromptBuilder([
      { name: 'present', render: () => 'CONTENT' },
      { name: 'empty', render: () => '' },
      { name: 'also-present', render: () => 'MORE' },
    ]);

    const result = await builder.build(makeContext());

    expect(result).toBe('CONTENT\n\nMORE');
  });

  it('joins non-empty sections with double newlines', async () => {
    const builder = new PromptBuilder([
      { name: 'a', render: () => 'A' },
      { name: 'b', render: () => 'B' },
    ]);

    const result = await builder.build(makeContext());

    expect(result).toBe('A\n\nB');
  });

  it('returns an empty string when all sections are empty', async () => {
    const builder = new PromptBuilder([
      { name: 'x', render: () => '' },
      { name: 'y', render: () => '' },
    ]);

    expect(await builder.build(makeContext())).toBe('');
  });

  it('awaits async section render results', async () => {
    const builder = new PromptBuilder([
      { name: 'async', render: () => Promise.resolve('ASYNC_RESULT') },
    ]);

    expect(await builder.build(makeContext())).toBe('ASYNC_RESULT');
  });
});

// ─── PromptBuilder.buildWithBudget ────────────────────────────────────────────

describe('PromptBuilder.buildWithBudget', () => {
  it('records token consumption for each non-empty section', async () => {
    const budgetManager = new TokenBudgetManager(makeTokenBudget());
    const consumeSpy = vi.spyOn(budgetManager, 'consume');

    const builder = new PromptBuilder([
      { name: 'section-a', render: () => 'Hello world' },
      { name: 'section-b', render: () => 'Another piece' },
    ]);

    await builder.buildWithBudget(makeContext(), budgetManager);

    expect(consumeSpy).toHaveBeenCalledWith('section-a', expect.any(Number));
    expect(consumeSpy).toHaveBeenCalledWith('section-b', expect.any(Number));
  });

  it('does not record consumption for empty sections', async () => {
    const budgetManager = new TokenBudgetManager(makeTokenBudget());
    const consumeSpy = vi.spyOn(budgetManager, 'consume');

    const builder = new PromptBuilder([
      { name: 'empty-section', render: () => '' },
      { name: 'present-section', render: () => 'Content' },
    ]);

    await builder.buildWithBudget(makeContext(), budgetManager);

    expect(consumeSpy).not.toHaveBeenCalledWith('empty-section', expect.any(Number));
    expect(consumeSpy).toHaveBeenCalledWith('present-section', expect.any(Number));
  });

  it('produces the same assembled text as build()', async () => {
    const builder = new PromptBuilder([
      { name: 'a', render: () => 'First' },
      { name: 'b', render: () => 'Second' },
    ]);

    const ctx = makeContext();
    const budgetManager = new TokenBudgetManager(makeTokenBudget());

    const withBudget = await builder.buildWithBudget(ctx, budgetManager);
    const plain = await builder.build(ctx);

    expect(withBudget).toBe(plain);
  });
});

// ─── createDefaultPromptBuilder ──────────────────────────────────────────────

describe('createDefaultPromptBuilder', () => {
  it('builds a prompt without throwing', async () => {
    const builder = createDefaultPromptBuilder();
    await expect(builder.build(makeContext())).resolves.not.toThrow();
  });

  it('includes the objective text in the output', async () => {
    const objective = 'Build a reliable agent loop.';
    const ctx = makeContext({ objective });

    const result = await createDefaultPromptBuilder().build(ctx);

    expect(result).toContain(objective);
  });

  it('objective appears identically in two successive builds', async () => {
    const objective = 'Persistent goal across iterations.';
    const ctx = makeContext({ objective });
    const builder = createDefaultPromptBuilder();

    const first = await builder.build(ctx);
    const second = await builder.build(ctx);

    expect(first).toBe(second);
  });

  it('includes a guardrails block when guardrails are provided', async () => {
    const ctx = makeContext({
      guardrails: [
        { index: 1, level: 'MUST', rule: 'Never delete production data.' },
      ],
    });

    const result = await createDefaultPromptBuilder().build(ctx);

    expect(result.toLowerCase()).toContain('guardrail');
  });

  it('guardrails block is present and non-empty in every assembled prompt', async () => {
    // makeContext() includes two guardrail rules, so the rendered block must
    // contain the ## GUARDRAILS header AND at least one RFC2119 numbered rule.
    // Checking only for the word "guardrail" is not sufficient — the header
    // alone (## GUARDRAILS) passes that check even when rules is empty.
    const ctx = makeContext();
    const result = await createDefaultPromptBuilder().build(ctx);

    expect(result).toContain('## GUARDRAILS');
    expect(result).toMatch(
      /## GUARDRAILS\n\n\d+\. (?:MUST|MUST NOT|SHOULD|SHOULD NOT|MAY):/,
    );
  });

  it('robot guidance is absent when robotGuidance is empty', async () => {
    const ctx = makeContext({ robotGuidance: [] });
    const result = await createDefaultPromptBuilder().build(ctx);

    expect(result).not.toContain('ROBOT GUIDANCE');
  });

  it('pending events block is absent when pendingEvents is empty', async () => {
    const ctx = makeContext({ pendingEvents: [] });
    const result = await createDefaultPromptBuilder().build(ctx);

    // Check for the section header specifically — other sections may reference
    // "PENDING EVENTS" as a term (e.g. DoneSection checklist) but should not
    // render the section header when there are no events.
    expect(result).not.toContain('## PENDING EVENTS');
  });

  it('solo workflow text appears when activeHatIds has one entry', async () => {
    const ctx = makeContext({ activeHatIds: ['hat-a'] });
    const result = await createDefaultPromptBuilder().build(ctx);

    // WorkflowSection uses STUDY→PLAN→IMPLEMENT→VERIFY→REPEAT for solo
    expect(result).toMatch(/STUDY|solo/i);
  });

  it('multi-hat workflow text appears when activeHatIds has more than one entry', async () => {
    const hatB = makeHat('hat-b');
    const ctx = makeContext({
      hats: [makeHat('hat-a'), hatB],
      activeHatIds: ['hat-a', 'hat-b'],
    });
    const result = await createDefaultPromptBuilder().build(ctx);

    // WorkflowSection uses PLAN→DELEGATE for multi-hat
    expect(result).toMatch(/DELEGATE|multi/i);
  });

  it('hat instructions for inactive hats are absent from output', async () => {
    const ctx = makeContext({
      hats: [makeHat('hat-a'), makeHat('hat-b')],
      activeHatIds: ['hat-a'],
    });
    const result = await createDefaultPromptBuilder().build(ctx);

    expect(result).not.toContain('Instructions for hat-b');
  });

  it('hat instructions for active hats are present in output', async () => {
    const ctx = makeContext({
      hats: [makeHat('hat-a'), makeHat('hat-b')],
      activeHatIds: ['hat-a'],
    });
    const result = await createDefaultPromptBuilder().build(ctx);

    expect(result).toContain('Instructions for hat-a');
  });

  it('assembled prompt falls within smart zone given a representative context', async () => {
    // The default sections produce roughly 800–2000 tokens for a minimal fixture.
    // Set totalTokens to 10_000 with a 1–100% range so any non-trivial output
    // satisfies the smart-zone check, without hard-coding an exact token count.
    const tokenBudget = makeTokenBudget({
      totalTokens: 10_000,
      targetMinPercent: 1,
      targetMaxPercent: 100,
    });
    const ctx = makeContext({ tokenBudget });

    const builder = createDefaultPromptBuilder();
    const budgetManager = new TokenBudgetManager(tokenBudget);

    await builder.buildWithBudget(ctx, budgetManager);

    expect(budgetManager.withinSmartZone()).toBe(true);
  });

  it('accepts section overrides and uses them in the assembled prompt', async () => {
    const customSection: PromptSection = {
      name: 'objective',
      render: () => 'CUSTOM OBJECTIVE OUTPUT',
    };

    const builder = createDefaultPromptBuilder({ objective: customSection });
    const result = await builder.build(makeContext());

    expect(result).toContain('CUSTOM OBJECTIVE OUTPUT');
  });

  it('non-overridden sections still appear when overrides are partial', async () => {
    const customObjective: PromptSection = {
      name: 'objective',
      render: () => 'REPLACED',
    };

    const ctx = makeContext();
    const builder = createDefaultPromptBuilder({ objective: customObjective });
    const result = await builder.build(ctx);

    // GUARDRAILS from CorePromptSection should still be present
    expect(result.toLowerCase()).toContain('guardrail');
  });

  it('builds a full prompt from a realistic fixture with all 10 sections present in order', async () => {
    // Use a fully-populated PromptContext so every section renders non-empty
    // output. Section 1 and 3 require non-empty skills; sections 5 and 6
    // require non-empty robotGuidance / pendingEvents.
    const ctx = makeContext({
      hatId: 'planner',
      objective: 'Implement an authentication API with JWT support.',
      robotGuidance: ['Prioritise security over speed.'],
      pendingEvents: [makePendingEvent('evt-auth-1')],
      skills: [makeSkill('memory-data')],
      guardrails: [
        { index: 1, level: 'MUST', rule: 'Never expose secrets in event payloads.' },
      ],
      hats: [makeHat('planner')],
      activeHatIds: ['planner'],
    });

    const result = await createDefaultPromptBuilder().build(ctx);

    // One unique marker per section in pipeline order (1–10).
    // Section 1 uses the skill xmlTag rendered as an XML open-tag.
    const markers = [
      '<skill-memory-data>',  // Section 1 — Auto-Injected Skills
      '## ORIENTATION',       // Section 2 — Core Prompt
      '## SKILL INDEX',       // Section 3 — Skill Index
      '## OBJECTIVE',         // Section 4 — Objective
      '## ROBOT GUIDANCE',    // Section 5 — Robot Guidance
      '## PENDING EVENTS',    // Section 6 — Pending Events
      '## WORKFLOW',          // Section 7 — Workflow
      '## HATS',              // Section 8 — Hats
      '## EVENT WRITING',     // Section 9 — Event Writing
      '## DONE',              // Section 10 — Done
    ];

    // Every marker must be present.
    for (const marker of markers) {
      expect(result, `expected marker to be present: "${marker}"`).toContain(marker);
    }

    // Every marker must appear strictly after the previous one.
    let previousIndex = -1;

    for (const marker of markers) {
      const currentIndex = result.indexOf(marker);
      expect(
        currentIndex,
        `expected "${marker}" (index ${currentIndex}) to appear after previous marker (index ${previousIndex})`,
      ).toBeGreaterThan(previousIndex);
      previousIndex = currentIndex;
    }
  });

  it('produces output with all 10 section names present (via names check)', async () => {
    const sectionNames: string[] = [];

    const wrapSection = (section: PromptSection): PromptSection => ({
      name: section.name,
      render: (ctx: PromptContext) => {
        sectionNames.push(section.name);
        return section.render(ctx);
      },
    });

    const builder = createDefaultPromptBuilder({
      autoInjectedSkills: wrapSection(
        { name: 'auto-injected-skills', render: () => 'S1' },
      ),
      corePrompt: wrapSection({ name: 'core-prompt', render: () => 'S2' }),
      skillIndex: wrapSection({ name: 'skill-index', render: () => 'S3' }),
      objective: wrapSection({ name: 'objective', render: () => 'S4' }),
      robotGuidance: wrapSection({ name: 'robot-guidance', render: () => 'S5' }),
      pendingEvents: wrapSection({ name: 'pending-events', render: () => 'S6' }),
      workflow: wrapSection({ name: 'workflow', render: () => 'S7' }),
      hats: wrapSection({ name: 'hats', render: () => 'S8' }),
      eventWriting: wrapSection({ name: 'event-writing', render: () => 'S9' }),
      done: wrapSection({ name: 'done', render: () => 'S10' }),
    });

    await builder.build(makeContext());

    expect(sectionNames).toEqual([
      'auto-injected-skills',
      'core-prompt',
      'skill-index',
      'objective',
      'robot-guidance',
      'pending-events',
      'workflow',
      'hats',
      'event-writing',
      'done',
    ]);
  });
});
