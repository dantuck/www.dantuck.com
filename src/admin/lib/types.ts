import type { ContentTypeId } from './content-types';

export interface ArticleSummary {
  type: ContentTypeId;
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
  type: ContentTypeId;
  slug: string;
  path: string;
  fileSha: string;
  branch: string;
  prNumber?: number;
  frontmatter: import('./frontmatter').Frontmatter;
  imports: string;
  body: string;
  extra: string[];
}

/** IDs for the JSON-singleton "site data" documents (not a collection of posts). */
export type DataId = 'resume' | 'about';

export interface DataSummary {
  id: DataId;
  label: string;
  path: string;
}

export interface DataDetail {
  id: DataId;
  path: string;
  fileSha: string;
  branch: string;
  prNumber?: number;
  data: unknown;
}
