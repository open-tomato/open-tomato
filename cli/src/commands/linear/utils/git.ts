/**
 * should return the current repository owner and name
 * ie:bifemecanico/open-tomato
 */
import { execSync } from 'node:child_process';
import process from 'node:process';

function getRepoPath(): string {
  const repoUrl = process.env.GITHUB_REPOSITORY;
  if (!repoUrl) {
    // if it's not set we can try to get it from the git config
    try {
      const gitUrl = execSync('git config --get remote.origin.url').toString()
        .trim()
        .split(':')
        .pop()
        ?.replace('.git', '');

      if (!gitUrl) throw new Error('Could not parse remote.origin.url');
      return gitUrl;
    } catch {
      throw new Error('GITHUB_REPOSITORY environment variable is not set and git command failed to retrieve repository information.');
    }
  }

  const [owner, repo] = repoUrl.split('/');
  if (!owner || !repo) {
    throw new Error('Invalid GITHUB_REPOSITORY format. Expected "owner/repo".');
  }

  return repoUrl;
}

export { getRepoPath };
