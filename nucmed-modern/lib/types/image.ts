/**
 * Image type matching Prisma schema
 */
export interface Image {
  id: string;
  articleId: string;
  originalUrl: string;
  storedUrl: string | null;
  thumbnailSmUrl: string | null;
  thumbnailMdUrl: string | null;
  thumbnailLgUrl: string | null;
  caption: string | null;
  isCover: boolean;
  width: number | null;
  height: number | null;
  createdAt: Date;
}

/**
 * Image for display in articles
 */
export interface ImageDisplay {
  id: string;
  url: string;
  caption: string | null;
  width: number | null;
  height: number | null;
}
