import { CONTENT_TYPES } from './content-types';

export interface Frontmatter {
  title: string;
  publishDate?: string;
  description?: string;
  tags?: string[];
  author?: string;
  draft?: boolean;
  layout?: string;
  // recipe
  prepTime?: string;
  cookTime?: string;
  ingredients?: string[];
  // portfolio
  tagline?: string;
  url?: string;
  screenshot?: string;
  phoneScreenshot?: string;
  techStack?: string[];
  role?: string;
  sortOrder?: number;
  featured?: boolean;
}

/** Backwards-compatible alias — this used to be article-only. */
export type ArticleFrontmatter = Frontmatter;

const BASE_KEYS = ['title', 'publishDate', 'description', 'author', 'draft', 'tags', 'layout'];
const ALL_KNOWN_KEYS = new Set([
  ...BASE_KEYS,
  ...Object.values(CONTENT_TYPES).flatMap(ct => ct.extraFields),
]);
const ARRAY_FIELDS = new Set(['tags', ...Object.values(CONTENT_TYPES).flatMap(ct => ct.arrayFields ?? [])]);
const NUMBER_FIELDS = new Set(['sortOrder']);
const BOOLEAN_FIELDS = new Set(['draft', 'featured']);

export interface ParsedFile {
  frontmatter: Frontmatter;
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
  const frontmatter: Frontmatter = { title: 'Untitled' };
  const extra: string[] = [];
  let capturingArrayKey: string | null = null;
  let capturingBlockScalar = false;
  let blockScalarKey: keyof Frontmatter | null = null;
  let blockScalarLines: string[] = [];

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

    // If capturing an array field, accept lines matching /^\s*- (.+)$/
    if (capturingArrayKey) {
      const itemMatch = line.match(/^\s*- (.+)$/);
      if (itemMatch) {
        const key = capturingArrayKey as keyof Frontmatter;
        const arr = ((frontmatter as Record<string, unknown>)[key] as string[] | undefined) ?? [];
        arr.push(unquote(itemMatch[1].trim()));
        (frontmatter as Record<string, unknown>)[key] = arr;
        continue;
      }
      capturingArrayKey = null;
    }

    const colon = line.indexOf(':');
    if (colon === -1) {
      // Lines without colons that aren't part of known capturing modes go to extra
      if (line.trim() !== '') extra.push(line);
      continue;
    }

    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();

    if (!ALL_KNOWN_KEYS.has(key)) {
      extra.push(line);
      continue;
    }

    if (key === 'description' && (val === '|' || val === '>')) {
      capturingBlockScalar = true;
      blockScalarKey = 'description';
      blockScalarLines = [];
      continue;
    }

    if (ARRAY_FIELDS.has(key)) {
      if (val === '') {
        capturingArrayKey = key;
      } else if (val.startsWith('[')) {
        (frontmatter as Record<string, unknown>)[key] = val.slice(1, -1).split(',').map(t => unquote(t.trim()));
      }
      continue;
    }

    if (NUMBER_FIELDS.has(key)) {
      (frontmatter as Record<string, unknown>)[key] = Number(val);
      continue;
    }

    if (BOOLEAN_FIELDS.has(key)) {
      (frontmatter as Record<string, unknown>)[key] = val === 'true';
      continue;
    }

    (frontmatter as Record<string, unknown>)[key] = unquote(val);
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

const KEY_ORDER = [
  'title', 'publishDate', 'description', 'tagline', 'url', 'prepTime', 'cookTime',
  'tags', 'ingredients', 'techStack', 'author', 'role', 'screenshot', 'phoneScreenshot',
  'sortOrder', 'featured', 'draft', 'layout',
];

export function serializeFrontmatter(fm: Frontmatter): string {
  const lines: string[] = [];
  const data = fm as Record<string, unknown>;

  for (const key of KEY_ORDER) {
    if (key === 'title') { lines.push(`title: ${yamlString(fm.title)}`); continue; }
    const val = data[key];
    if (val === undefined || val === null || val === '') continue;

    if (ARRAY_FIELDS.has(key)) {
      const arr = val as string[];
      if (!arr.length) continue;
      lines.push(`${key}:`);
      arr.forEach(t => lines.push(`- ${yamlString(t)}`));
    } else if (NUMBER_FIELDS.has(key)) {
      lines.push(`${key}: ${val}`);
    } else if (BOOLEAN_FIELDS.has(key)) {
      if (val) lines.push(`${key}: true`);
    } else if (key === 'layout') {
      lines.push(`layout: '${val}'`);
    } else {
      lines.push(`${key}: ${yamlString(String(val))}`);
    }
  }

  return lines.join('\n');
}

export function assembleFile(fm: Frontmatter, imports: string, body: string, extra?: string[]): string {
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
