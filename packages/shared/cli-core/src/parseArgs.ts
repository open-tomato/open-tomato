export interface ParseArgsResult {
  positional: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParseArgsResult {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) {
      continue;
    }
    if (arg.startsWith('--')) {
      const body = arg.slice(2);
      const eqIndex = body.indexOf('=');
      if (eqIndex === -1 && body.startsWith('no-') && body.length > 3) {
        const name = body.slice(3);
        flags[name] = false;
        continue;
      }
      if (eqIndex !== -1) {
        const name = body.slice(0, eqIndex);
        const value = body.slice(eqIndex + 1);
        flags[name] = value;
        continue;
      }
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        flags[body] = next;
        i++;
        continue;
      }
      flags[body] = true;
      continue;
    }
    if (arg.startsWith('-') && arg.length > 1) {
      const body = arg.slice(1);
      const eqIndex = body.indexOf('=');
      if (eqIndex !== -1) {
        const name = body.slice(0, eqIndex);
        const value = body.slice(eqIndex + 1);
        flags[name] = value;
        continue;
      }
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        flags[body] = next;
        i++;
        continue;
      }
      flags[body] = true;
      continue;
    }
    positional.push(arg);
  }

  return { positional, flags };
}
