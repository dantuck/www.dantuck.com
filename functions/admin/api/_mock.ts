import { json } from './_types';
import type { ArticleSummary } from './_types';
import type { ArticleDetail, DataDetail, DataId } from '../../../src/admin/lib/types';
import type { ContentTypeId } from '../../../src/admin/lib/content-types';

const MOCK_ARTICLES: ArticleSummary[] = [
  {
    type: 'article',
    slug: 'article/hello-world',
    path: 'src/pages/article/hello-world/index.md',
    title: 'Hello World (mock)',
    publishDate: '27 Mar 2026',
    description: 'A sample live article.',
    tags: ['astro', 'webdev'],
    status: 'live',
  },
  {
    type: 'article',
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
    type: 'article',
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

const MOCK_RECIPES: ArticleSummary[] = [
  {
    type: 'recipe',
    slug: 'recipe/mock-tacos',
    path: 'src/pages/recipe/mock-tacos.md',
    title: 'Mock Tacos',
    publishDate: '10 Feb 2026',
    description: 'A sample live recipe.',
    tags: ['dinner'],
    status: 'live',
  },
];

const MOCK_PORTFOLIO: ArticleSummary[] = [
  {
    type: 'portfolio',
    slug: 'mock-project',
    path: 'src/data/portfolio/mock-project.md',
    title: 'Mock Project',
    status: 'live',
  },
];

const MOCK_ARTICLE_DETAIL: ArticleDetail = {
  type: 'article',
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

const MOCK_RECIPE_DETAIL: ArticleDetail = {
  ...MOCK_ARTICLE_DETAIL,
  type: 'recipe',
  slug: 'recipe/mock-tacos',
  path: 'src/pages/recipe/mock-tacos.md',
  frontmatter: {
    title: 'Mock Tacos',
    description: 'A sample recipe.',
    tags: ['dinner'],
    author: 'Daniel',
    prepTime: '15 min',
    cookTime: '20 min',
    ingredients: ['1 lb chicken', '2 cups rice'],
  },
};

const MOCK_PORTFOLIO_DETAIL: ArticleDetail = {
  ...MOCK_ARTICLE_DETAIL,
  type: 'portfolio',
  slug: 'mock-project',
  path: 'src/data/portfolio/mock-project.md',
  frontmatter: {
    title: 'Mock Project',
    tagline: 'A sample portfolio project',
    url: 'https://example.com',
    techStack: ['Astro', 'Svelte'],
  },
};

const MOCK_DATA: Record<DataId, unknown> = {
  resume: { contact: { name: 'Mock Person', email: 'mock@example.com' }, military: [], experience: [], skills: [], education: [] },
  about: { experience: [], military: [], education: [], skills: [] },
};

export function mockList(type: ContentTypeId = 'article'): Response {
  const byType: Record<ContentTypeId, ArticleSummary[]> = {
    article: MOCK_ARTICLES,
    recipe: MOCK_RECIPES,
    portfolio: MOCK_PORTFOLIO,
  };
  return json(byType[type] ?? MOCK_ARTICLES);
}

export function mockDetail(slug: string, type: ContentTypeId = 'article'): Response {
  const byType: Record<ContentTypeId, ArticleDetail> = {
    article: MOCK_ARTICLE_DETAIL,
    recipe: MOCK_RECIPE_DETAIL,
    portfolio: MOCK_PORTFOLIO_DETAIL,
  };
  return json({ ...(byType[type] ?? MOCK_ARTICLE_DETAIL), slug });
}

export function mockDataDetail(id: DataId): Response {
  return json({
    id,
    path: id === 'resume' ? 'src/data/resume.json' : 'src/data/about.json',
    fileSha: 'mock' + id,
    branch: 'master',
    data: MOCK_DATA[id],
  } satisfies DataDetail);
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
