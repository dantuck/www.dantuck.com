export interface GHFile {
  sha: string;
  content: string; // base64 encoded, may contain newlines
  name: string;
  path: string;
}

export interface GHTreeItem {
  path: string;
  type: 'blob' | 'tree';
}

export interface GHPR {
  number: number;
  title: string;
  head: { ref: string };
  labels: Array<{ name: string }>;
}

export class GitHubClient {
  private readonly base = 'https://api.github.com';

  constructor(private token: string, private repo: string) {}

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'dantuck-cms/1.0',
        ...init.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub ${res.status} ${path}: ${body}`);
    }
    // 204 No Content (e.g. delete label) has no body
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  /** SHA of the tip of master */
  async masterSha(): Promise<string> {
    const data = await this.req<{ object: { sha: string } }>(
      `/repos/${this.repo}/git/ref/heads/master`
    );
    return data.object.sha;
  }

  /** Create a new branch off master */
  async createBranch(name: string, sha: string): Promise<void> {
    await this.req(`/repos/${this.repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({ ref: `refs/heads/${name}`, sha }),
    });
  }

  /** Read a file. Returns null if not found. */
  async getFile(path: string, branch = 'master'): Promise<GHFile | null> {
    try {
      return await this.req<GHFile>(
        `/repos/${this.repo}/contents/${path}?ref=${branch}`
      );
    } catch {
      return null;
    }
  }

  /** Create or update a text file on a branch. sha required when updating. */
  async putFile(opts: {
    path: string;
    content: string;
    message: string;
    branch: string;
    sha?: string;
  }): Promise<void> {
    const encoded = btoa(unescape(encodeURIComponent(opts.content)));
    const body: Record<string, string> = {
      message: opts.message,
      content: encoded,
      branch: opts.branch,
    };
    if (opts.sha) body.sha = opts.sha;
    await this.req(`/repos/${this.repo}/contents/${opts.path}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /** Upload a binary file (base64 string from browser FileReader) */
  async putBinary(opts: {
    path: string;
    base64: string; // raw base64, no data-url prefix
    message: string;
    branch: string;
    sha?: string;
  }): Promise<void> {
    const body: Record<string, string> = {
      message: opts.message,
      content: opts.base64,
      branch: opts.branch,
    };
    if (opts.sha) body.sha = opts.sha;
    await this.req(`/repos/${this.repo}/contents/${opts.path}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /** Full recursive tree of the repo at a given ref */
  async getTree(branch = 'master'): Promise<GHTreeItem[]> {
    const data = await this.req<{ tree: GHTreeItem[] }>(
      `/repos/${this.repo}/git/trees/${branch}?recursive=1`
    );
    return data.tree;
  }

  /** Decode base64 file content (GitHub adds \n every 60 chars) */
  decodeContent(base64: string): string {
    return decodeURIComponent(escape(atob(base64.replace(/\n/g, ''))));
  }

  /** Create a PR. Returns PR number. */
  async createPR(title: string, head: string, body = ''): Promise<number> {
    const data = await this.req<{ number: number }>(`/repos/${this.repo}/pulls`, {
      method: 'POST',
      body: JSON.stringify({ title, head, base: 'master', body }),
    });
    return data.number;
  }

  /** Add labels to a PR/issue */
  async addLabels(prNumber: number, labels: string[]): Promise<void> {
    await this.req(`/repos/${this.repo}/issues/${prNumber}/labels`, {
      method: 'POST',
      body: JSON.stringify({ labels }),
    });
  }

  /** Remove a label from a PR/issue (ignores 404 if label not present) */
  async removeLabel(prNumber: number, label: string): Promise<void> {
    try {
      await this.req(
        `/repos/${this.repo}/issues/${prNumber}/labels/${encodeURIComponent(label)}`,
        { method: 'DELETE' }
      );
    } catch { /* label wasn't there */ }
  }

  /** All open PRs (up to 100) */
  async listOpenPRs(): Promise<GHPR[]> {
    return this.req<GHPR[]>(
      `/repos/${this.repo}/pulls?state=open&per_page=100`
    );
  }

  /** Get a single PR by number */
  async getPR(number: number): Promise<GHPR> {
    return this.req<GHPR>(`/repos/${this.repo}/pulls/${number}`);
  }

  /** Squash-merge a PR */
  async mergePR(prNumber: number, commitTitle: string): Promise<void> {
    await this.req(`/repos/${this.repo}/pulls/${prNumber}/merge`, {
      method: 'PUT',
      body: JSON.stringify({ merge_method: 'squash', commit_title: commitTitle }),
    });
  }
}
