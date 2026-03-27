export interface ArticleFrontmatter {
  title: string;
  publishDate?: string;
  description?: string;
  tags?: string[];
  author?: string;
  draft?: boolean;
}

export interface ParsedFile {
  frontmatter: ArticleFrontmatter;
  imports: string;
  body: string;
}

export function parseFrontmatter(content: string): ParsedFile {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: { title: 'Untitled' }, imports: '', body: content };
  }

  const fmBlock = match[1];
  const rest = match[2];

  // Separate MDX imports from body
  const lines = rest.split('\n');
  const importLines: string[] = [];
  let bodyStartIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('import ')) {
      importLines.push(line);
      bodyStartIdx = i + 1;
    } else if (line.trim() === '' && importLines.length > 0) {
      bodyStartIdx = i + 1;
    } else if (line.trim() !== '') {
      break;
    }
  }

  const imports = importLines.join('\n');
  const body = lines.slice(bodyStartIdx).join('\n').trimStart();

  // Parse simple YAML (key: value and indented list arrays)
  const frontmatter: ArticleFrontmatter = { title: 'Untitled' };
  let capturingTags = false;

  for (const line of fmBlock.split('\n')) {
    if (capturingTags && line.startsWith('  - ')) {
      frontmatter.tags = frontmatter.tags ?? [];
      frontmatter.tags.push(line.slice(4).trim());
      continue;
    }
    capturingTags = false;

    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();

    switch (key) {
      case 'title': frontmatter.title = unquote(val); break;
      case 'publishDate': frontmatter.publishDate = unquote(val); break;
      case 'description': frontmatter.description = unquote(val); break;
      case 'author': frontmatter.author = unquote(val); break;
      case 'draft': frontmatter.draft = val === 'true'; break;
      case 'tags':
        if (val === '') { capturingTags = true; }
        else if (val.startsWith('[')) {
          frontmatter.tags = val.slice(1, -1).split(',').map(t => unquote(t.trim()));
        }
        break;
    }
  }

  return { frontmatter, imports, body };
}

function unquote(s: string): string {
  return s.replace(/^['"]|['"]$/g, '');
}

export function serializeFrontmatter(fm: ArticleFrontmatter): string {
  const lines = ['---'];
  lines.push(`title: ${fm.title}`);
  if (fm.publishDate) lines.push(`publishDate: ${fm.publishDate}`);
  if (fm.description) lines.push(`description: ${fm.description}`);
  if (fm.tags?.length) {
    lines.push('tags:');
    fm.tags.forEach(t => lines.push(`  - ${t}`));
  }
  if (fm.author) lines.push(`author: ${fm.author}`);
  if (fm.draft) lines.push(`draft: true`);
  lines.push('---');
  return lines.join('\n');
}

export function assembleFile(fm: ArticleFrontmatter, imports: string, body: string): string {
  const parts: string[] = [serializeFrontmatter(fm)];
  if (imports) parts.push(imports);
  parts.push(body);
  return parts.join('\n') + '\n';
}
