import sharp from 'sharp';

export interface ProcessedImage {
  original: Buffer;
  thumbnails: {
    sm: Buffer;  // 150x150
    md: Buffer;  // 400x400
    lg: Buffer;  // 800x800
  };
  metadata: {
    width: number;
    height: number;
    format: string;
  };
}

export interface ThumbnailSizes {
  sm: { width: number; height: number };
  md: { width: number; height: number };
  lg: { width: number; height: number };
}

const THUMBNAIL_SIZES: ThumbnailSizes = {
  sm: { width: 150, height: 150 },
  md: { width: 400, height: 400 },
  lg: { width: 800, height: 800 },
};

export async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NucmedBot/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function processImage(input: Buffer | string): Promise<ProcessedImage> {
  const buffer = typeof input === 'string' ? await fetchImageBuffer(input) : input;

  const image = sharp(buffer);
  const metadata = await image.metadata();

  const originalWebp = await image
    .webp({ quality: 85 })
    .toBuffer();

  const [sm, md, lg] = await Promise.all([
    sharp(buffer)
      .resize(THUMBNAIL_SIZES.sm.width, THUMBNAIL_SIZES.sm.height, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer(),
    sharp(buffer)
      .resize(THUMBNAIL_SIZES.md.width, THUMBNAIL_SIZES.md.height, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer(),
    sharp(buffer)
      .resize(THUMBNAIL_SIZES.lg.width, THUMBNAIL_SIZES.lg.height, { fit: 'inside' })
      .webp({ quality: 85 })
      .toBuffer(),
  ]);

  return {
    original: originalWebp,
    thumbnails: { sm, md, lg },
    metadata: {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
    },
  };
}

export async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

export async function convertToWebp(buffer: Buffer, quality: number = 85): Promise<Buffer> {
  return sharp(buffer).webp({ quality }).toBuffer();
}

export async function resizeImage(
  buffer: Buffer,
  width: number,
  height: number,
  fit: 'cover' | 'contain' | 'inside' = 'cover'
): Promise<Buffer> {
  return sharp(buffer)
    .resize(width, height, { fit })
    .webp({ quality: 85 })
    .toBuffer();
}
