/**
 * Parses src/data/about.md into the structured shape about.astro renders.
 *
 * Convention: frontmatter holds title/description only. Everything else is
 * plain markdown — `##` sections (Now / Previously / Military / Education /
 * Skills & Interests), `###` company headings (optionally a markdown link),
 * a location line (optionally "Location · Dates"), `####` role headings,
 * an optional dates line, and a description paragraph. Visual-only details
 * (dot color/opacity fade, which role is "current") are derived, not stored.
 */

export interface AboutRole {
  title: string;
  dates?: string;
  current?: boolean;
  description: string;
}

export interface AboutEntry {
  company: string;
  companyUrl?: string;
  location: string;
  dates?: string;
  dotColor?: string;
  dotOpacity?: number;
  roles: AboutRole[];
}

export interface AboutMilitary {
  organization: string;
  role: string;
  dates: string;
}

export interface AboutEducation {
  institution: string;
  degree: string;
  year: string;
}

export interface AboutContent {
  title: string;
  description: string;
  intro: string[];
  now: AboutEntry[];
  previously: AboutEntry[];
  military: AboutMilitary;
  education: AboutEducation;
  skills: string[];
}

const NOW_DOT_COLOR = 'var(--color-accent-text)';
/** Geometric fade for past roles, closely matching the hand-tuned values this replaced (0.75, 0.55, 0.4, ...). */
const dotOpacityFor = (index: number) => Math.max(0.15, Math.round(0.75 * Math.pow(0.75, index) * 100) / 100);

const isBlank = (line: string) => line.trim() === '';
const looksLikeDates = (line: string) => line.length < 60 && (/\b(19|20)\d{2}\b/.test(line) || /present/i.test(line));

/**
 * Milkdown's markdown serializer backslash-escapes ASCII punctuation that could
 * otherwise be misread as markdown syntax (e.g. "R&D" -> "R\&D", "~20" -> "\~20").
 * Undo that so round-tripped content still displays plainly.
 */
const unescapeMarkdown = (s: string) => s.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~])/g, '$1');

function parseHeadingLink(text: string): { label: string; url?: string } {
  const match = text.match(/^\[(.+)\]\((.+)\)$/);
  return match
    ? { label: unescapeMarkdown(match[1]), url: match[2] }
    : { label: unescapeMarkdown(text) };
}

/** Collect non-blank lines starting at `start` until a blank line, joining wrapped lines with a space. */
function collectParagraph(lines: string[], start: number): { text: string; next: number } {
  const parts: string[] = [];
  let i = start;
  while (i < lines.length && !isBlank(lines[i]) && !lines[i].startsWith('#')) {
    parts.push(unescapeMarkdown(lines[i].trim()));
    i++;
  }
  return { text: parts.join(' '), next: i };
}

function collectIntro(lines: string[], end: number): string[] {
  const paragraphs: string[] = [];
  let i = 0;
  while (i < end) {
    if (isBlank(lines[i])) { i++; continue; }
    const { text, next } = collectParagraph(lines, i);
    if (text) paragraphs.push(text);
    i = next;
  }
  return paragraphs;
}

/** Slice out the lines belonging to a `## <name>` section (case-insensitive prefix match on the heading text). */
function sectionLines(lines: string[], name: string): string[] {
  const startIdx = lines.findIndex(l => l.startsWith('## ') && l.slice(3).trim().toLowerCase().startsWith(name.toLowerCase()));
  if (startIdx === -1) return [];
  let endIdx = lines.findIndex((l, i) => i > startIdx && l.startsWith('## '));
  if (endIdx === -1) endIdx = lines.length;
  return lines.slice(startIdx + 1, endIdx);
}

function parseEntries(lines: string[], isNow: boolean): AboutEntry[] {
  const entries: AboutEntry[] = [];
  let i = 0;
  let entryIndex = 0;

  while (i < lines.length) {
    if (isBlank(lines[i])) { i++; continue; }

    if (lines[i].startsWith('### ')) {
      const { label, url } = parseHeadingLink(lines[i].slice(4).trim());
      i++;
      while (i < lines.length && isBlank(lines[i])) i++;

      let location = '';
      let dates: string | undefined;
      if (i < lines.length && !lines[i].startsWith('#')) {
        const [loc, dateRange] = lines[i].split('·').map(s => unescapeMarkdown(s.trim()));
        location = loc;
        dates = dateRange;
        i++;
      }

      const entry: AboutEntry = {
        company: label,
        companyUrl: url,
        location,
        dates,
        ...(isNow ? { dotColor: NOW_DOT_COLOR } : { dotOpacity: dotOpacityFor(entryIndex) }),
        roles: [],
      };

      while (i < lines.length && !lines[i].startsWith('### ')) {
        if (isBlank(lines[i])) { i++; continue; }
        if (lines[i].startsWith('#### ')) {
          const title = unescapeMarkdown(lines[i].slice(5).trim());
          i++;
          while (i < lines.length && isBlank(lines[i])) i++;

          let roleDates: string | undefined;
          if (i < lines.length && !lines[i].startsWith('#') && looksLikeDates(lines[i])) {
            roleDates = unescapeMarkdown(lines[i].trim());
            i++;
            while (i < lines.length && isBlank(lines[i])) i++;
          }

          const { text: description, next } = collectParagraph(lines, i);
          i = next;
          entry.roles.push({
            title,
            dates: roleDates,
            current: isNow && entry.roles.length === 0,
            description,
          });
          continue;
        }
        i++;
      }

      entries.push(entry);
      entryIndex++;
      continue;
    }

    i++;
  }

  return entries;
}

function parseMilitary(lines: string[]): AboutMilitary {
  const nonBlank = lines.filter(l => !isBlank(l));
  const [orgRole, dates] = nonBlank;
  const [organization, role] = (orgRole ?? '').split('—').map(s => unescapeMarkdown(s.trim()));
  return { organization: organization ?? '', role: role ?? '', dates: unescapeMarkdown((dates ?? '').trim()) };
}

function parseEducation(lines: string[]): AboutEducation {
  const nonBlank = lines.filter(l => !isBlank(l));
  const [institutionDegree, year] = nonBlank;
  const [institution, degree] = (institutionDegree ?? '').split('—').map(s => unescapeMarkdown(s.trim()));
  return { institution: institution ?? '', degree: degree ?? '', year: unescapeMarkdown((year ?? '').trim()) };
}

function parseSkills(lines: string[]): string[] {
  return lines
    .filter(l => /^[-*+]\s+/.test(l.trim()))
    .map(l => unescapeMarkdown(l.trim().replace(/^[-*+]\s+/, '').trim()));
}

/** Minimal frontmatter reader — About only ever needs flat string fields. */
function parseSimpleFrontmatter(raw: string): { fields: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { fields: {}, body: raw };
  const fields: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim().replace(/^['"]|['"]$/g, '');
    fields[key] = val;
  }
  return { fields, body: match[2] };
}

export function parseAboutContent(raw: string): AboutContent {
  const { fields, body } = parseSimpleFrontmatter(raw);
  const lines = body.split('\n');

  const firstSectionIdx = lines.findIndex(l => l.startsWith('## '));
  const introEnd = firstSectionIdx === -1 ? lines.length : firstSectionIdx;

  return {
    title: fields.title ?? 'About',
    description: fields.description ?? '',
    intro: collectIntro(lines, introEnd),
    now: parseEntries(sectionLines(lines, 'Now'), true),
    previously: parseEntries(sectionLines(lines, 'Previously'), false),
    military: parseMilitary(sectionLines(lines, 'Military')),
    education: parseEducation(sectionLines(lines, 'Education')),
    skills: parseSkills(sectionLines(lines, 'Skills')),
  };
}
