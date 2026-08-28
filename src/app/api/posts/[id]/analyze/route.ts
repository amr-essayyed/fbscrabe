import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { analyzePostWithAI } from '@/lib/aiService';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any;

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const aiResult = await analyzePostWithAI(
      post.text,
      post.reactions || 0,
      post.comments || 0,
      post.shares || 0
    );

    db.prepare(`
      UPDATE posts SET
        ad_score = ?,
        category = ?,
        characteristics = ?,
        ai_analysis = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      aiResult.overall_score,
      aiResult.category,
      JSON.stringify(aiResult.characteristics),
      JSON.stringify(aiResult),
      id
    );

    const updated = db.prepare(`
      SELECT p.*, pg.name as page_name, pg.url as page_url
      FROM posts p
      LEFT JOIN pages pg ON p.page_id = pg.id
      WHERE p.id = ?
    `).get(id) as any;

    return NextResponse.json({
      success: true,
      post: {
        ...updated,
        characteristics: JSON.parse(updated.characteristics || '{}'),
        ai_analysis: JSON.parse(updated.ai_analysis || '{}')
      }
    });
  } catch (error: any) {
    console.error('Error analyzing post:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
