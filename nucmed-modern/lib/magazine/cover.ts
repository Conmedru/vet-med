import sharp from "sharp";
import { isS3Configured, uploadImage } from "@/lib/storage/s3";

const JOURNAL_COVER_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export class JournalCoverError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = "JournalCoverError";
  }
}

export function assertJournalCoverFile(file: File | null): asserts file is File {
  if (!file) {
    throw new JournalCoverError("No file provided", 400);
  }

  if (file.type !== "image/jpeg") {
    throw new JournalCoverError("Invalid file type. Only JPEG is allowed", 400);
  }

  if (file.size > JOURNAL_COVER_MAX_SIZE_BYTES) {
    throw new JournalCoverError("File too large. Maximum 10MB", 400);
  }
}

export async function storeJournalIssueCover(issueId: string, file: File): Promise<string> {
  const rawBuffer = Buffer.from(await file.arrayBuffer());

  const normalizedJpeg = await sharp(rawBuffer)
    .rotate()
    .resize({ width: 1600, height: 2200, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  if (!isS3Configured()) {
    return `data:image/jpeg;base64,${normalizedJpeg.toString("base64")}`;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const key = `journal/${year}/${month}/${issueId}/cover.jpg`;

  return uploadImage(normalizedJpeg, key, "image/jpeg");
}
