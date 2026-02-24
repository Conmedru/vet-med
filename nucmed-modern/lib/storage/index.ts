import { prisma } from '@/lib/prisma';
import { uploadImage, deleteImage, generateImageKey, generateThumbnailKey, isS3Configured, getPublicUrl } from './s3';
import { processImage, fetchImageBuffer } from './image-processor';

export interface StoredImageResult {
  id: string;
  originalUrl: string;
  storedUrl: string | null;
  thumbnails: {
    sm: string | null;
    md: string | null;
    lg: string | null;
  };
}

export async function storeArticleImage(
  articleId: string,
  imageUrl: string,
  index: number,
  caption?: string,
  isCover: boolean = false
): Promise<StoredImageResult> {
  if (!isS3Configured()) {
    const image = await prisma.image.create({
      data: {
        articleId,
        originalUrl: imageUrl,
        caption,
        isCover,
      },
    });

    return {
      id: image.id,
      originalUrl: imageUrl,
      storedUrl: null,
      thumbnails: { sm: null, md: null, lg: null },
    };
  }

  try {
    const processed = await processImage(imageUrl);

    const originalKey = generateImageKey(articleId, index, 'webp');
    const smKey = generateThumbnailKey(articleId, index, 'sm');
    const mdKey = generateThumbnailKey(articleId, index, 'md');
    const lgKey = generateThumbnailKey(articleId, index, 'lg');

    const [storedUrl, smUrl, mdUrl, lgUrl] = await Promise.all([
      uploadImage(processed.original, originalKey, 'image/webp'),
      uploadImage(processed.thumbnails.sm, smKey, 'image/webp'),
      uploadImage(processed.thumbnails.md, mdKey, 'image/webp'),
      uploadImage(processed.thumbnails.lg, lgKey, 'image/webp'),
    ]);

    const image = await prisma.image.create({
      data: {
        articleId,
        originalUrl: imageUrl,
        storedUrl,
        thumbnailSmUrl: smUrl,
        thumbnailMdUrl: mdUrl,
        thumbnailLgUrl: lgUrl,
        width: processed.metadata.width,
        height: processed.metadata.height,
        caption,
        isCover,
      },
    });

    return {
      id: image.id,
      originalUrl: imageUrl,
      storedUrl,
      thumbnails: { sm: smUrl, md: mdUrl, lg: lgUrl },
    };
  } catch (error) {
    console.error(`Failed to process/store image ${imageUrl}:`, error);

    const image = await prisma.image.create({
      data: {
        articleId,
        originalUrl: imageUrl,
        caption,
        isCover,
      },
    });

    return {
      id: image.id,
      originalUrl: imageUrl,
      storedUrl: null,
      thumbnails: { sm: null, md: null, lg: null },
    };
  }
}

export async function deleteArticleImages(articleId: string): Promise<void> {
  const images = await prisma.image.findMany({
    where: { articleId },
    select: { id: true, storedUrl: true, thumbnailSmUrl: true, thumbnailMdUrl: true, thumbnailLgUrl: true },
  });

  for (const image of images) {
    const urls = [image.storedUrl, image.thumbnailSmUrl, image.thumbnailMdUrl, image.thumbnailLgUrl];
    for (const url of urls) {
      if (url) {
        const key = url.split('/').slice(-4).join('/');
        try {
          await deleteImage(key);
        } catch (e) {
          console.error(`Failed to delete image ${key}:`, e);
        }
      }
    }
  }

  await prisma.image.deleteMany({ where: { articleId } });
}

export async function reprocessImage(imageId: string): Promise<StoredImageResult | null> {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    include: { article: true },
  });

  if (!image || !image.articleId) return null;

  const index = await prisma.image.count({
    where: {
      articleId: image.articleId,
      createdAt: { lt: image.createdAt },
    },
  });

  return storeArticleImage(
    image.articleId,
    image.originalUrl,
    index,
    image.caption || undefined,
    image.isCover
  );
}

export { isS3Configured, getPublicUrl } from './s3';
export { processImage, fetchImageBuffer, getImageDimensions } from './image-processor';
