export interface ParseArgsResult {
  positional: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParseArgsResult {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const body = arg.slice(2);
      const eqIndex = body.indexOf('=');
      if (eqIndex !== -1) {
        const name = body.slice(0, eqIndex);
        const value = body.slice(eqIndex + 1);
        flags[name] = value;
      }
      continue;
    }
    if (arg.startsWith('-')) {
      continue;
    }
    positional.push(arg);
  }

  return { positional, flags };
}
