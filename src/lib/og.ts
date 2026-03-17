import satori from 'satori';
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load font once at module level (called at build time, not at request time)
const fontData = readFileSync(join(process.cwd(), 'public/fonts/Inter-Bold.ttf'));
const fonts = [{ name: 'Inter', data: fontData, weight: 700 as const }];

export interface CardOptions {
  title: string;
  tags?: string[];
  publishDate?: string;
}

/** Renders the text card as an SVG string via satori. */
async function renderCard(options: CardOptions): Promise<string> {
  const { title, tags = [], publishDate } = options;
  const tagStr = tags.join(' · ');
  const dateStr = publishDate
    ? new Date(publishDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return satori(
    {
      type: 'div',
      props: {
        style: {
          width: '800px',
          height: '418px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '32px 40px',
          fontFamily: 'Inter',
          backgroundColor: 'transparent',
        },
        children: [
          // Top: site name
          {
            type: 'div',
            props: {
              style: { fontSize: '18px', color: '#f9c412', fontWeight: 700 },
              children: 'dantuck.com',
            },
          },
          // Center: title
          {
            type: 'div',
            props: {
              style: {
                fontSize: '48px',
                fontWeight: 700,
                color: 'white',
                lineHeight: 1.2,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              },
              children: title,
            },
          },
          // Bottom row: tags + date
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { fontSize: '16px', color: '#aaaaaa' },
                    children: tagStr,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { fontSize: '16px', color: '#aaaaaa' },
                    children: dateStr,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    { width: 800, height: 418, fonts }
  );
}

/** Builds the dark background with an orange accent strip. */
async function darkBackground(): Promise<sharp.Sharp> {
  const accentStrip = await sharp({
    create: {
      width: 800,
      height: 6,
      channels: 4,
      background: { r: 249, g: 196, b: 18, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: 800,
      height: 418,
      channels: 4,
      background: { r: 26, g: 26, b: 26, alpha: 1 },
    },
  }).composite([{ input: accentStrip, top: 0, left: 0 }]);
}

/** Builds a blurred photo background from an image file path (absolute). */
async function photoBackground(absoluteImagePath: string): Promise<sharp.Sharp> {
  const overlay = await sharp({
    create: {
      width: 800,
      height: 418,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0.55 },
    },
  })
    .png()
    .toBuffer();

  return sharp(absoluteImagePath)
    .resize(800, 418, { fit: 'cover' })
    .blur(8)
    .composite([{ input: overlay, blend: 'over' }]);
}

export interface BuildOgImageOptions extends CardOptions {
  /** Root-relative image path (e.g. /images/article/foo.jpg), or undefined for dark bg. */
  image?: string;
}

/** Full pipeline: background + card → PNG buffer. */
export async function buildOgImage(options: BuildOgImageOptions): Promise<Buffer> {
  const { image, ...cardOptions } = options;

  const bg = image
    ? await photoBackground(join(process.cwd(), 'public', image))
    : await darkBackground();

  const svgString = await renderCard(cardOptions);
  const cardBuffer = await sharp(Buffer.from(svgString), { density: 150 })
    .resize(800, 418)
    .png()
    .toBuffer();

  return bg.composite([{ input: cardBuffer, top: 0, left: 0 }]).png().toBuffer();
}

/** Full pipeline for the default page (centered site name, dark bg only). */
export async function buildDefaultOgImage(): Promise<Buffer> {
  const svgString = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '800px',
          height: '418px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: 'Inter',
          backgroundColor: 'transparent',
        },
        children: {
          type: 'div',
          props: {
            style: { fontSize: '64px', fontWeight: 700, color: '#f9c412' },
            children: 'dantuck.com',
          },
        },
      },
    },
    { width: 800, height: 418, fonts }
  );

  const bg = await darkBackground();
  const cardBuffer = await sharp(Buffer.from(svgString), { density: 150 })
    .resize(800, 418)
    .png()
    .toBuffer();
  return bg.composite([{ input: cardBuffer, top: 0, left: 0 }]).png().toBuffer();
}
