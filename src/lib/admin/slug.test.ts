import { describe, it, expect } from 'vitest';
import { toSlug } from './slug';

describe('toSlug', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(toSlug('Hello World')).toBe('hello-world');
  });
  it('removes special characters', () => {
    expect(toSlug('My Article! (2026)')).toBe('my-article-2026');
  });
  it('collapses multiple hyphens', () => {
    expect(toSlug('foo  ---  bar')).toBe('foo-bar');
  });
  it('trims leading/trailing hyphens', () => {
    expect(toSlug('  hello  ')).toBe('hello');
  });
  it('handles empty string', () => {
    expect(toSlug('')).toBe('');
  });
});
