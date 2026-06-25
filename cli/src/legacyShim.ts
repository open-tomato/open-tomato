import type { CliContext } from '@open-tomato/cli-core';

import { resolveRepoRoot } from './root.js';

export interface LegacyCommandContext {
  repoRoot: string | null;
}

export type LegacyCommandDefault = (
  args: readonly string[],
  ctx: LegacyCommandContext,
) => unknown;

export async function runLegacyCommand(
  ctx: CliContext,
  mod: { default: (...args: unknown[]) => unknown },
): Promise<void> {
  const adapter: LegacyCommandContext = {
    repoRoot: resolveRepoRoot(),
  };

  const fn = mod.default as unknown as LegacyCommandDefault;
  await fn(ctx.args, adapter);
}
