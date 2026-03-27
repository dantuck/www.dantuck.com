export interface ArticleSummary {
  slug: string;         // e.g. "article/kobo-clara-colour"
  path: string;         // full path: "src/pages/article/kobo-clara-colour/index.mdx"
  title: string;
  publishDate?: string;
  description?: string;
  tags?: string[];
  status: 'live' | 'draft' | 'scheduled' | 'building';
  prNumber?: number;
  previewUrl?: string;  // Cloudflare branch preview URL
  branch?: string;      // draft branch name
}

export interface ArticleDetail {
  slug: string;
  path: string;
  fileSha: string;
  branch: string;
  prNumber?: number;
  frontmatter: import('./frontmatter').ArticleFrontmatter;
  imports: string;
  body: string;
  extra: string[];
}
