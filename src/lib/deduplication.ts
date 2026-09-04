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

export async function checkDuplicate(payload: IngestPostPayload): Promise<{ isDuplicate: boolean; existingPostId?: number }> {
  const db = getDb();

  // 1. Primary check by Facebook URL
  if (payload.facebook_url && payload.facebook_url.trim().length > 0) {
    const cleanUrl = payload.facebook_url.trim().split('?')[0];
    const result = await db.execute({
      sql: 'SELECT id FROM posts WHERE facebook_url = ? OR facebook_url LIKE ?',
      args: [payload.facebook_url.trim(), `${cleanUrl}%`]
    });
    if (result.rows.length > 0) {
      return { isDuplicate: true, existingPostId: Number(result.rows[0].id) };
    }
  }

  // 2. Secondary check by text hash
  const textHash = generateTextHash(payload.text);
  const hashResult = await db.execute({
    sql: 'SELECT id FROM posts WHERE text_hash = ?',
    args: [textHash]
  });

  if (hashResult.rows.length > 0) {
    return { isDuplicate: true, existingPostId: Number(hashResult.rows[0].id) };
  }

  return { isDuplicate: false };
}
