import { describe, it, expect } from 'vitest';
import { parseFrontmatter, serializeFrontmatter, assembleFile } from './frontmatter';

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

const MDX_WITH_IMPORTS = `---
title: With Image
publishDate: 27 Mar 2026
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

  it('parses tags array', () => {
    const { frontmatter } = parseFrontmatter(BASIC_MD);
    expect(frontmatter.tags).toEqual(['astro', 'webdev']);
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
});

describe('serializeFrontmatter', () => {
  it('round-trips basic frontmatter', () => {
    const fm = { title: 'Hello', publishDate: '27 Mar 2026', tags: ['astro'], author: 'Daniel' };
    const serialized = serializeFrontmatter(fm);
    expect(serialized).toContain('title: Hello');
    expect(serialized).toContain('publishDate: 27 Mar 2026');
    expect(serialized).toContain('  - astro');
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
});
