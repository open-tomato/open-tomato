/**
 * Lightweight CLI argument parsing helpers.
 * Parses key-value flags (--flag value, --flag=value) and boolean flags.
 */
import process from 'node:process';

export interface ParsedArgs {
  flags: Record<string, string | boolean>;
  positional: string[];
}

/**
 * Parses a raw argv array into flags and positional arguments.
 *
 * Supports:
 *   --flag value      → { flag: 'value' }
 *   --flag=value      → { flag: 'value' }
 *   --flag            → { flag: true }
 *   --no-flag         → { 'no-flag': true }  (caller interprets negation)
 *   positional args   → positional[]
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i] as string;

    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        const value = arg.slice(eqIdx + 1);
        flags[key] = value;
      } else {
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('-')) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      // Short flag: -t value
      const key = arg.slice(1);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }

    i++;
  }

  return { flags, positional };
}

/** Returns a string flag value or undefined. */
export function getStringFlag(flags: Record<string, string | boolean>, ...names: string[]): string | undefined {
  for (const name of names) {
    const val = flags[name];
    if (typeof val === 'string') return val;
  }
  return undefined;
}

/** Returns a numeric flag value or undefined. */
export function getNumberFlag(flags: Record<string, string | boolean>, ...names: string[]): number | undefined {
  const val = getStringFlag(flags, ...names);
  if (val === undefined) return undefined;
  const n = Number(val);
  return Number.isNaN(n)
    ? undefined
    : n;
}

/** Returns true if a boolean flag is present. */
export function getBoolFlag(flags: Record<string, string | boolean>, ...names: string[]): boolean {
  for (const name of names) {
    if (flags[name] === true || flags[name] === 'true') return true;
  }
  return false;
}

/** Prints usage and exits with code 1. */
export function usageError(message: string, help: string): never {
  console.error(`Error: ${message}\n`);
  console.error(help);
  process.exit(1);
}
