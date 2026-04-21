export interface GithubRepo {
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
}

export interface GithubClient {
  listOrgRepos(org: string): Promise<GithubRepo[]>;
}

interface GithubRepoResponse {
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
}

export function createGithubClient(token: string): GithubClient {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  return {
    async listOrgRepos(org: string): Promise<GithubRepo[]> {
      const url = `https://api.github.com/orgs/${encodeURIComponent(org)}/repos?per_page=100&sort=updated&type=all`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `GitHub API error ${response.status}: ${body}`,
        );
      }

      const data = (await response.json()) as GithubRepoResponse[];

      return data.map((repo) => ({
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        html_url: repo.html_url,
        default_branch: repo.default_branch,
      }));
    },
  };
}
