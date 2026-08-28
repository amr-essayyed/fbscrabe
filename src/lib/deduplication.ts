import { getDb, generateTextHash } from './db';

export interface IngestPostPayload {
  facebook_url?: string;
  page_name?: string;
  page_url?: string;
  text: string;
  date?: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'none';
  reactions?: number;
  comments?: number;
  shares?: number;
}

export function checkDuplicate(payload: IngestPostPayload): { isDuplicate: boolean; existingPostId?: number } {
  const db = getDb();

  // 1. Primary check by Facebook URL if present
  if (payload.facebook_url && payload.facebook_url.trim().length > 0) {
    const cleanUrl = payload.facebook_url.trim().split('?')[0]; // strip URL query params
    const existingByUrl = db.prepare('SELECT id FROM posts WHERE facebook_url LIKE ? OR facebook_url = ?')
      .get(`${cleanUrl}%`, payload.facebook_url.trim()) as { id: number } | undefined;

    if (existingByUrl) {
      return { isDuplicate: true, existingPostId: existingByUrl.id };
    }
  }

  // 2. Secondary check by Text Hash + Page URL/Name or Date
  const textHash = generateTextHash(payload.text);
  const existingByHash = db.prepare('SELECT id FROM posts WHERE text_hash = ?').get(textHash) as { id: number } | undefined;

  if (existingByHash) {
    return { isDuplicate: true, existingPostId: existingByHash.id };
  }

  return { isDuplicate: false };
}
