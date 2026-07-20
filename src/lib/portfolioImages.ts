const images = import.meta.glob<{ default: ImageMetadata }>(
  '../images/portfolio/*.jpg',
  { eager: true }
);

export function getPortfolioImage(filename: string): ImageMetadata {
  const mod = images[`../images/portfolio/${filename}`];
  if (!mod) {
    throw new Error(`Portfolio image not found: ${filename}`);
  }
  return mod.default;
}
