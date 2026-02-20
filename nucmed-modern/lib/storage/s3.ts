import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'https://s3.twcstorage.ru',
  region: process.env.S3_REGION || 'ru-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET || '1873f82d-617b-4505-a1ec-3fe47ebe0e64';
const PREFIX = process.env.S3_PREFIX || 'neurology';

export function isS3Configured(): boolean {
  return !!(process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY && process.env.S3_BUCKET);
}

export async function uploadImage(
  buffer: Buffer,
  key: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  if (!isS3Configured()) {
    throw new Error('S3 storage not configured');
  }

  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
  }));

  return getPublicUrl(key);
}

export async function deleteImage(key: string): Promise<void> {
  if (!isS3Configured()) return;

  await s3Client.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}

export async function getImage(key: string): Promise<Buffer | null> {
  if (!isS3Configured()) return null;

  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));

    if (!response.Body) return null;

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

export function getPublicUrl(key: string): string {
  const endpoint = process.env.S3_ENDPOINT || 'https://s3.twcstorage.ru';
  return `${endpoint}/${BUCKET}/${key}`;
}

export function generateImageKey(articleId: string, index: number, extension: string = 'webp'): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${PREFIX}/articles/${year}/${month}/${articleId}/${index}.${extension}`;
}

export function generateThumbnailKey(articleId: string, index: number, size: 'sm' | 'md' | 'lg'): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${PREFIX}/articles/${year}/${month}/${articleId}/thumb_${size}_${index}.webp`;
}
