import { describe, it, expect } from 'vitest';
import { isUnpublished, pagePathname } from './hide-unpublished';

const now = new Date('2026-10-26T12:00:00Z');

describe('isUnpublished', () => {
  it('hides drafts regardless of date', () => {
    expect(isUnpublished({ draft: true, publishDate: '01 Jan 2020' }, now)).toBe(true);
  });

  it('hides future dates', () => {
    expect(isUnpublished({ publishDate: '28 Oct 2026 14:00 UTC' }, now)).toBe(true);
  });

  it('shows past dates', () => {
    expect(isUnpublished({ publishDate: '25 Oct 2026' }, now)).toBe(false);
  });

  it('switches over at the exact time', () => {
    expect(isUnpublished({ publishDate: '26 Oct 2026 12:00 UTC' }, now)).toBe(false);
    expect(isUnpublished({ publishDate: '26 Oct 2026 12:01 UTC' }, now)).toBe(true);
  });

  it('keeps pages with no or unparseable date visible', () => {
    expect(isUnpublished({}, now)).toBe(false);
    expect(isUnpublished({ publishDate: 'not a date' }, now)).toBe(false);
  });
});

describe('pagePathname', () => {
  it('maps a file to its directory-style pathname', () => {
    expect(pagePathname('article/anchor-vs-button.md')).toBe('/article/anchor-vs-button/');
  });

  it('collapses index files', () => {
    expect(pagePathname('article/kobo-clara-colour/index.mdx')).toBe('/article/kobo-clara-colour/');
  });

  it('keeps nested series paths', () => {
    expect(pagePathname('article/homelab/rustfs-health-monitoring.md')).toBe('/article/homelab/rustfs-health-monitoring/');
  });
});
