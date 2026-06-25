export interface ParseArgsResult {
  positional: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParseArgsResult {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (const arg of argv) {
    if (arg.startsWith('--') || arg.startsWith('-')) {
      continue;
    }
    positional.push(arg);
  }

  return { positional, flags };
}
