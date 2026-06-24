import { execSync } from 'child_process';

export function getRepoRoot(): string {
  return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
}

export function getCurrentBranch(): string {
  return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
}

export function getMainCommitHash(): string {
  try {
    execSync('git fetch origin main', { stdio: 'pipe' });
    return execSync('git rev-parse origin/main', { encoding: 'utf8' }).trim();
  } catch {
    return execSync('git rev-parse main', { encoding: 'utf8' }).trim();
  }
}

export function checkoutBranch(branch: string): void {
  execSync('git checkout main', { stdio: 'inherit' });
  execSync('git pull', { stdio: 'inherit' });
  execSync(`git checkout ${branch}`, { stdio: 'inherit' });
}

export function isMergedToMain(identifier: string): boolean {
  try {
    execSync('git fetch origin main', { stdio: 'pipe' });
    const log = execSync('git log origin/main --oneline -30', { encoding: 'utf8' });
    return log.toLowerCase().includes(identifier.toLowerCase());
  } catch {
    return false;
  }
}
