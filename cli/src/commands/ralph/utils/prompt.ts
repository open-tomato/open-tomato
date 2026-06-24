import { execSync } from 'child_process';
import readline from 'readline';

import { isMergedToMain } from './git.js';

const CONFLICT_PREFIXES = ['UU', 'AA', 'DD', 'AU', 'UA', 'DU', 'UD'];

function hasConflicts(statusOutput: string): boolean {
  return statusOutput
    .split('\n')
    .some((line) => CONFLICT_PREFIXES.some((prefix) => line.startsWith(prefix)));
}

/**
 * Detects merge conflicts after a checkout. If found, prompts the user to
 * resolve them before continuing. Returns true if the operation should abort.
 */
export async function checkForCheckoutConflict(branch: string): Promise<boolean> {
  let status: string;
  try {
    status = execSync('git status --porcelain', { encoding: 'utf8' });
  } catch {
    return false;
  }

  if (!hasConflicts(status)) return false;

  console.log(`\nMerge conflicts detected on branch '${branch}'.`);
  console.log('Please resolve them manually, commit the result, then return here.');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

  let abort = false;
  while (true) {
    const answer = await ask('Press Enter to verify conflicts are resolved, or type "abort" to stop: ');
    if (answer.trim().toLowerCase() === 'abort') {
      abort = true;
      break;
    }
    const recheck = execSync('git status --porcelain', { encoding: 'utf8' });
    if (!hasConflicts(recheck)) {
      console.log('Conflicts resolved. Continuing.');
      break;
    }
    console.log('Conflicts still detected. Please finish resolving before continuing.');
  }

  rl.close();
  return abort;
}

/**
 * Waits for the user to confirm a PR is merged before continuing to the next
 * issue. Allows "skip" to bypass the check.
 */
export async function waitForMerge(identifier: string, branch: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

  console.log(`\n--- Issue ${identifier} complete ---`);
  console.log(`Branch : ${branch}`);
  console.log('A pull request must be merged into main before the next issue can be processed.\n');

  let done = false;
  while (!done) {
    const input = await ask('Press Enter to verify the PR is merged (or type "skip" to continue anyway): ');

    if (input.trim().toLowerCase() === 'skip') {
      done = true;
      continue;
    }

    process.stdout.write('Checking git log for merge...');
    if (isMergedToMain(identifier)) {
      console.log(' confirmed.\n');
      done = true;
    } else {
      console.log(' not found yet.');
      const retry = await ask(`${identifier} does not appear in main yet. Check again? (y/n): `);
      if (retry.trim().toLowerCase() !== 'y') {
        done = true;
      }
    }
  }

  rl.close();
}
