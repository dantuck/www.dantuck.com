export type ContentTypeId = 'article' | 'recipe' | 'portfolio';

export interface ContentTypeConfig {
  id: ContentTypeId;
  label: string;
  /** Repo-relative directory containing this content type's files. */
  dir: string;
  /** Prefix prepended to the bare filename/dirname to form a slug, e.g. "article/". */
  slugPrefix: string;
  /**
   * 'nested' — a post may live at "<dir>/<name>.md(x)" or "<dir>/<name>/index.md(x)"
   *            (matches today's articles/recipes, which have a mix of both on disk).
   * 'flat'   — always "<dir>/<name>.md", no directory-per-post form (portfolio).
   */
  pathStyle: 'nested' | 'flat';
  /** Default `layout` frontmatter value for new posts, relative to the post's own directory. */
  defaultLayout: string;
  /** Frontmatter keys beyond the base set (title/publishDate/description/tags/author/draft/layout). */
  extraFields: string[];
  /** Frontmatter keys among extraFields that hold string arrays (rendered/parsed like `tags`). */
  arrayFields?: string[];
}

export const CONTENT_TYPES: Record<ContentTypeId, ContentTypeConfig> = {
  article: {
    id: 'article',
    label: 'Article',
    dir: 'src/pages/article',
    slugPrefix: 'article/',
    pathStyle: 'nested',
    defaultLayout: '../../../layouts/BlogPost.astro',
    extraFields: [],
  },
  recipe: {
    id: 'recipe',
    label: 'Recipe',
    dir: 'src/pages/recipe',
    slugPrefix: 'recipe/',
    pathStyle: 'nested',
    defaultLayout: '../../../layouts/Recipe.astro',
    extraFields: ['prepTime', 'cookTime', 'ingredients'],
    arrayFields: ['ingredients'],
  },
  portfolio: {
    id: 'portfolio',
    label: 'Portfolio project',
    dir: 'src/data/portfolio',
    slugPrefix: '',
    pathStyle: 'flat',
    defaultLayout: '',
    extraFields: ['tagline', 'url', 'screenshot', 'phoneScreenshot', 'techStack', 'role', 'sortOrder', 'featured'],
    arrayFields: ['techStack'],
  },
};

export function contentTypeOf(id: string | null | undefined): ContentTypeConfig {
  return CONTENT_TYPES[(id as ContentTypeId) ?? 'article'] ?? CONTENT_TYPES.article;
}

/** Strip a content type's slug prefix, e.g. "article/foo" -> "foo". Safe no-op if absent (e.g. portfolio). */
export function stripSlugPrefix(slug: string, ct: ContentTypeConfig): string {
  return ct.slugPrefix && slug.startsWith(ct.slugPrefix) ? slug.slice(ct.slugPrefix.length) : slug;
}

/** Candidate repo-relative file paths for a slug under this content type, in lookup priority order. */
export function candidatePaths(slug: string, ct: ContentTypeConfig): string[] {
  const bare = stripSlugPrefix(slug, ct);
  if (ct.pathStyle === 'flat') {
    return [`${ct.dir}/${bare}.md`];
  }
  return [
    `${ct.dir}/${bare}.md`,
    `${ct.dir}/${bare}.mdx`,
    `${ct.dir}/${bare}/index.md`,
    `${ct.dir}/${bare}/index.mdx`,
  ];
}
