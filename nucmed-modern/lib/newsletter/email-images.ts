import sharp from "sharp";
import { isS3Configured, uploadImage } from "@/lib/storage/s3";

/** Width of article images in the digest: 300px shown, twice for retina screens */
const EMAIL_IMAGE_WIDTH = 600;

/**
 * An email-safe copy of an article cover: JPEG, 600px wide, on our S3.
 * Covers are WebP, which Outlook and some webmail clients do not show, and full-size
 * originals made the letter heavy. The key is stable per digest and article, so a repeated
 * run overwrites the file. Any failure returns the original URL: a letter with a WebP image
 * is better than no letter.
 */
export async function emailImageUrl(src: string | null, key: string): Promise<string | null> {
  if (!src || !isS3Configured()) return src;
  try {
    const response = await fetch(src, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const input = Buffer.from(await response.arrayBuffer());
    const output = await sharp(input)
      .resize({ width: EMAIL_IMAGE_WIDTH, withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    return await uploadImage(output, `email/${key}.jpg`, "image/jpeg");
  } catch (error) {
    console.error(`[Newsletter] Email image failed for ${src}:`, error);
    return src;
  }
}
