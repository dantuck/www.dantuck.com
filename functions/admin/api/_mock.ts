import { json } from './_types';
import type { ArticleSummary } from './_types';
import type { ArticleDetail } from '../../../src/admin/lib/types';

const MOCK_ARTICLES: ArticleSummary[] = [
  {
    slug: 'article/hello-world',
    path: 'src/pages/article/hello-world/index.md',
    title: 'Hello World (mock)',
    publishDate: '27 Mar 2026',
    description: 'A sample live article.',
    tags: ['astro', 'webdev'],
    status: 'live',
  },
  {
    slug: 'article/draft-post',
    path: 'src/pages/article/draft-post/index.md',
    title: 'Draft Post (mock)',
    description: 'A sample draft article.',
    tags: ['draft'],
    status: 'draft',
    prNumber: 42,
    branch: 'draft/draft-post',
    previewUrl: 'https://draft-post.preview.pages.dev',
  },
  {
    slug: 'article/scheduled-post',
    path: 'src/pages/article/scheduled-post/index.md',
    title: 'Scheduled Post (mock)',
    publishDate: '01 May 2026 14:00 UTC',
    description: 'A sample scheduled article.',
    tags: ['future'],
    status: 'scheduled',
    prNumber: 43,
    branch: 'draft/scheduled-post',
    previewUrl: 'https://scheduled-post.preview.pages.dev',
  },
];

const MOCK_ARTICLE_DETAIL: ArticleDetail = {
  slug: 'article/draft-post',
  path: 'src/pages/article/draft-post/index.md',
  fileSha: 'abc123def456',
  branch: 'draft/draft-post',
  prNumber: 42,
  frontmatter: {
    title: 'Draft Post (mock)',
    publishDate: '',
    description: 'A sample draft article.',
    tags: ['draft'],
    author: 'Daniel',
  },
  imports: '',
  body: '## Hello\n\nThis is mock content for local development. Edit away!\n\n- Item one\n- Item two\n\n> A blockquote to test styling.\n',
  extra: [],
};

export function mockList(): Response {
  return json(MOCK_ARTICLES);
}

export function mockDetail(_slug: string): Response {
  return json({ ...MOCK_ARTICLE_DETAIL, slug: _slug });
}

export function mockSave(): Response {
  return json({
    ok: true,
    prNumber: 42,
    branch: 'draft/mock-article',
    fileSha: 'mock' + Date.now(),
    previewUrl: 'https://mock.preview.pages.dev',
  });
}

export function mockOk(): Response {
  return json({ ok: true });
}

export function mockStatus(): Response {
  return json({ status: 'live', url: 'https://www.dantuck.com', branch: 'master' });
}

export function mockUpload(filename: string): Response {
  const safe = filename.toLowerCase().replace(/[^a-z0-9.-]/g, '-');
  return json({ ok: true, path: `./${safe}`, fullPath: `src/pages/article/mock/${safe}` });
}
