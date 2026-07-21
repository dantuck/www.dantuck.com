export function tagToSlug(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, '-');
}
