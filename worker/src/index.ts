export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    await Promise.all([
      triggerDeploy(env),
      mergeScheduledPRs(env),
    ]);
  },
};

async function triggerDeploy(env: Env): Promise<void> {
  const res = await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`Deploy hook failed: ${res.status} ${res.statusText}`);
  }
}

async function mergeScheduledPRs(env: Env): Promise<void> {
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'dantuck-cms-worker/1.0',
  };

  // Fetch open PRs labeled 'scheduled'
  const prsRes = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/pulls?state=open&per_page=100`,
    { headers }
  );
  if (!prsRes.ok) return;

  const prs: Array<{
    number: number;
    title: string;
    head: { ref: string };
    labels: Array<{ name: string }>;
  }> = await prsRes.json();

  const scheduled = prs.filter(pr => pr.labels.some(l => l.name === 'scheduled'));
  if (scheduled.length === 0) return;

  const now = Date.now();

  for (const pr of scheduled) {
    // Find the article file in the draft branch
    const branch = pr.head.ref; // e.g. "draft/my-post"
    const slug = branch.replace('draft/', 'article/');

    const candidates = [
      `src/pages/${slug}/index.md`,
      `src/pages/${slug}/index.mdx`,
      `src/pages/${slug}.md`,
      `src/pages/${slug}.mdx`,
    ];

    let publishDate: Date | null = null;

    for (const path of candidates) {
      const fileRes = await fetch(
        `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}?ref=${branch}`,
        { headers }
      );
      if (!fileRes.ok) continue;

      const file: { content: string } = await fileRes.json();
      const content = new TextDecoder().decode(
        Uint8Array.from(atob(file.content.replace(/\n/g, '')), c => c.charCodeAt(0))
      );

      // Extract publishDate from frontmatter
      const match = content.match(/^publishDate:\s*(.+)$/m);
      if (match) {
        publishDate = new Date(match[1].trim());
      }
      break;
    }

    if (!publishDate || isNaN(publishDate.getTime())) continue;
    if (publishDate.getTime() > now) continue;

    // Merge the PR
    await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO}/pulls/${pr.number}/merge`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          merge_method: 'squash',
          commit_title: `publish: ${pr.title}`,
        }),
      }
    );
  }
}

interface Env {
  DEPLOY_HOOK_URL: string;
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
}
