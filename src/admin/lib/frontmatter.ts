export interface ArticleFrontmatter {
  title: string;
  publishDate?: string;
  description?: string;
  tags?: string[];
  author?: string;
  draft?: boolean;
  layout?: string;
}

export interface ParsedFile {
  frontmatter: ArticleFrontmatter;
  imports: string;
  body: string;
  extra: string[];  // unrecognized frontmatter lines preserved verbatim
}

export function parseFrontmatter(content: string): ParsedFile {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: { title: 'Untitled' }, imports: '', body: content, extra: [] };
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

  // Parse YAML frontmatter (handles key: value, block scalars, and indented list arrays)
  const frontmatter: ArticleFrontmatter = { title: 'Untitled' };
  const extra: string[] = [];
  let capturingTags = false;
  let capturingBlockScalar = false;
  let blockScalarKey: keyof ArticleFrontmatter | null = null;
  let blockScalarLines: string[] = [];

  const knownKeys = new Set(['title', 'publishDate', 'description', 'author', 'draft', 'tags', 'layout']);

  const fmLines = fmBlock.split('\n');

  function flushBlockScalar() {
    if (blockScalarKey && blockScalarLines.length > 0) {
      (frontmatter as Record<string, unknown>)[blockScalarKey] = blockScalarLines.join('\n');
    }
    blockScalarKey = null;
    blockScalarLines = [];
    capturingBlockScalar = false;
  }

  for (const line of fmLines) {
    // If capturing a block scalar, look for continuation lines (indented)
    if (capturingBlockScalar) {
      if (line.match(/^\s+\S/) || line.trim() === '') {
        // Indented line or blank line — continuation of block scalar
        blockScalarLines.push(line.trim());
        continue;
      } else {
        // Non-indented line ends the block scalar
        flushBlockScalar();
      }
    }

    // If capturing tags, accept lines matching /^\s*- (.+)$/
    if (capturingTags) {
      const tagMatch = line.match(/^\s*- (.+)$/);
      if (tagMatch) {
        frontmatter.tags = frontmatter.tags ?? [];
        frontmatter.tags.push(unquote(tagMatch[1].trim()));
        continue;
      }
      capturingTags = false;
    }

    const colon = line.indexOf(':');
    if (colon === -1) {
      // Lines without colons that aren't part of known capturing modes go to extra
      if (line.trim() !== '') extra.push(line);
      continue;
    }

    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();

    if (!knownKeys.has(key)) {
      extra.push(line);
      continue;
    }

    switch (key) {
      case 'title': frontmatter.title = unquote(val); break;
      case 'publishDate': frontmatter.publishDate = unquote(val); break;
      case 'description':
        if (val === '|' || val === '>') {
          // Block scalar — capture subsequent indented lines
          capturingBlockScalar = true;
          blockScalarKey = 'description';
          blockScalarLines = [];
        } else {
          frontmatter.description = unquote(val);
        }
        break;
      case 'author': frontmatter.author = unquote(val); break;
      case 'draft': frontmatter.draft = val === 'true'; break;
      case 'layout': frontmatter.layout = unquote(val); break;
      case 'tags':
        if (val === '') { capturingTags = true; }
        else if (val.startsWith('[')) {
          frontmatter.tags = val.slice(1, -1).split(',').map(t => unquote(t.trim()));
        }
        break;
    }
  }

  // Flush any pending block scalar at end of frontmatter
  if (capturingBlockScalar) {
    flushBlockScalar();
  }

  return { frontmatter, imports, body, extra };
}

function unquote(s: string): string {
  return s.replace(/^['"]|['"]$/g, '');
}

// Wrap in single quotes if the value contains ': ' or leading special chars that
// would cause a standards-compliant YAML parser to misinterpret the scalar.
function yamlString(s: string): string {
  if (s.includes(': ') || /^[:{[&*!|>'"%@`]/.test(s)) {
    return `'${s.replace(/'/g, "''")}'`;
  }
  return s;
}

export function serializeFrontmatter(fm: ArticleFrontmatter): string {
  const lines: string[] = [];
  lines.push(`title: ${yamlString(fm.title)}`);
  if (fm.publishDate) lines.push(`publishDate: ${fm.publishDate}`);
  if (fm.description) lines.push(`description: ${yamlString(fm.description)}`);
  if (fm.tags?.length) {
    lines.push('tags:');
    fm.tags.forEach(t => lines.push(`- ${yamlString(t)}`));
  }
  if (fm.author) lines.push(`author: ${yamlString(fm.author)}`);
  if (fm.draft) lines.push(`draft: true`);
  if (fm.layout) lines.push(`layout: '${fm.layout}'`);
  return lines.join('\n');
}

export function assembleFile(fm: ArticleFrontmatter, imports: string, body: string, extra?: string[]): string {
  const fmLines = ['---', serializeFrontmatter(fm)];
  if (extra && extra.length > 0) {
    fmLines.push(...extra);
  }
  fmLines.push('---');
  const parts: string[] = [fmLines.join('\n')];
  if (imports) {
    parts.push(imports);
    parts.push(''); // blank line between imports and body (required by MDX v2)
  }
  parts.push(body);
  return parts.join('\n') + '\n';
}
