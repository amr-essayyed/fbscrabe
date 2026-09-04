import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { analyzePostWithAI } from '@/lib/aiService';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const { id } = await params;
    const db = getDb();

    const postResult = await db.execute({ sql: 'SELECT * FROM posts WHERE id = ?', args: [id] });
    if (postResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }
    const post = postResult.rows[0] as any;

    const aiResult = await analyzePostWithAI(
      post.text as string,
      Number(post.reactions) || 0,
      Number(post.comments) || 0,
      Number(post.shares) || 0
    );

    await db.execute({
      sql: `UPDATE posts SET ad_score = ?, category = ?, characteristics = ?, ai_analysis = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [aiResult.overall_score, aiResult.category, JSON.stringify(aiResult.characteristics), JSON.stringify(aiResult), id]
    });

    const updated = await db.execute({
      sql: `SELECT p.*, pg.name as page_name, pg.url as page_url
            FROM posts p LEFT JOIN pages pg ON p.page_id = pg.id WHERE p.id = ?`,
      args: [id]
    });
    const row = updated.rows[0] as any;

    return NextResponse.json({
      success: true,
      post: {
        ...row,
        id: Number(row.id),
        characteristics: JSON.parse((row.characteristics as string) || '{}'),
        ai_analysis: JSON.parse((row.ai_analysis as string) || '{}'),
      }
    });
  } catch (error: any) {
    console.error('Error analyzing post:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
