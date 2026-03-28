import { describe, it, expect } from 'vitest';
import { parseFrontmatter, serializeFrontmatter, assembleFile } from './frontmatter';

// Tags use no indent — matches real article files
const BASIC_MD = `---
title: Hello World
publishDate: 27 Mar 2026
description: A test post
tags:
- astro
- webdev
author: Daniel
---

Body content here.
`;

// MDX with block scalar description and layout passthrough field
const MDX_WITH_IMPORTS = `---
title: With Image
publishDate: 27 Mar 2026
layout: '../../../layouts/BlogPost.astro'
description: |
    The Kobo Clara Colour's font flexibility makes it great.
    Second line of description.
tags:
- reading
- tools
---
import { Image } from 'astro:assets';
import hero from './hero.webp';

Body content here.
`;

describe('parseFrontmatter', () => {
  it('parses title and body', () => {
    const { frontmatter, body } = parseFrontmatter(BASIC_MD);
    expect(frontmatter.title).toBe('Hello World');
    expect(body.trim()).toBe('Body content here.');
  });

  it('parses tags array with no indent', () => {
    const { frontmatter } = parseFrontmatter(BASIC_MD);
    expect(frontmatter.tags).toEqual(['astro', 'webdev']);
  });

  it('parses tags array with no indent (real file format)', () => {
    const content = `---
title: Test
tags:
- reading
- tools
- accessibility
---
Body.
`;
    const { frontmatter } = parseFrontmatter(content);
    expect(frontmatter.tags).toEqual(['reading', 'tools', 'accessibility']);
  });

  it('parses publishDate', () => {
    const { frontmatter } = parseFrontmatter(BASIC_MD);
    expect(frontmatter.publishDate).toBe('27 Mar 2026');
  });

  it('extracts MDX imports separately from body', () => {
    const { imports, body } = parseFrontmatter(MDX_WITH_IMPORTS);
    expect(imports).toContain("import { Image }");
    expect(imports).toContain("import hero");
    expect(body.trim()).toBe('Body content here.');
  });

  it('returns empty imports for plain md', () => {
    const { imports } = parseFrontmatter(BASIC_MD);
    expect(imports).toBe('');
  });

  it('parses description: | block scalar (not "|")', () => {
    const { frontmatter } = parseFrontmatter(MDX_WITH_IMPORTS);
    expect(frontmatter.description).not.toBe('|');
    expect(frontmatter.description).toContain("Kobo Clara Colour");
    expect(frontmatter.description).toContain("Second line");
  });

  it('preserves unknown fields like layout in extra', () => {
    const { extra } = parseFrontmatter(MDX_WITH_IMPORTS);
    expect(extra.some(line => line.includes('layout'))).toBe(true);
    expect(extra.some(line => line.includes("layouts/BlogPost.astro"))).toBe(true);
  });

  it('returns empty extra for files with only known fields', () => {
    const { extra } = parseFrontmatter(BASIC_MD);
    expect(extra).toEqual([]);
  });
});

describe('serializeFrontmatter', () => {
  it('round-trips basic frontmatter', () => {
    const fm = { title: 'Hello', publishDate: '27 Mar 2026', tags: ['astro'], author: 'Daniel' };
    const serialized = serializeFrontmatter(fm);
    expect(serialized).toContain('title: Hello');
    expect(serialized).toContain('publishDate: 27 Mar 2026');
    expect(serialized).toContain('- astro');
  });

  it('omits undefined optional fields', () => {
    const serialized = serializeFrontmatter({ title: 'Only Title' });
    expect(serialized).not.toContain('description:');
    expect(serialized).not.toContain('tags:');
  });
});

describe('assembleFile', () => {
  it('joins frontmatter + imports + body with newlines', () => {
    const fm = { title: 'Test' };
    const imports = "import hero from './hero.webp';";
    const body = 'Content here.';
    const result = assembleFile(fm, imports, body);
    expect(result).toContain('---\ntitle: Test\n---');
    expect(result).toContain(imports);
    expect(result).toContain(body);
  });

  it('omits imports block when empty', () => {
    const result = assembleFile({ title: 'Test' }, '', 'Body.');
    expect(result.indexOf('import')).toBe(-1);
  });

  it('includes extra passthrough fields in frontmatter block', () => {
    const fm = { title: 'Test' };
    const extra = ["layout: '../../../layouts/BlogPost.astro'"];
    const result = assembleFile(fm, '', 'Body.', extra);
    expect(result).toContain("layout: '../../../layouts/BlogPost.astro'");
    // extra lines should appear before closing ---
    const fmEnd = result.indexOf('\n---\n');
    const layoutPos = result.indexOf('layout:');
    expect(layoutPos).toBeGreaterThan(0);
    expect(layoutPos).toBeLessThan(fmEnd);
  });

  it('round-trips a file with layout field preserved', () => {
    const { frontmatter, imports, body, extra } = parseFrontmatter(MDX_WITH_IMPORTS);
    const result = assembleFile(frontmatter, imports, body, extra);
    expect(result).toContain("layout: '../../../layouts/BlogPost.astro'");
    expect(result).toContain('title: With Image');
  });
});
