import { slugify as transliSlugify } from 'transliteration';

export function generateSlug(title: string): string {
  // Transliterate Cyrillic to Latin and slugify
  const slug = transliSlugify(title, {
    lowercase: true,
    separator: '-',
    trim: true,
    ignore: ['/', '\\', ':', '*', '?', '"', '<', '>', '|'] // Characters to remove
  });
  
  // Remove any remaining non-alphanumeric characters (except hyphens)
  const cleanSlug = slug.replace(/[^a-z0-9-]/g, '');
  
  // Remove multiple consecutive hyphens
  return cleanSlug.replace(/-+/g, '-').replace(/^-|-$/g, '');
}
