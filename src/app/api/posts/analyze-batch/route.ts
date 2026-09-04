import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { analyzePostWithAI } from '@/lib/aiService';

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json().catch(() => ({}));
    const { reanalyzeAll } = body;

    const db = getDb();
    const sql = reanalyzeAll
      ? 'SELECT * FROM posts'
      : "SELECT * FROM posts WHERE ai_analysis = '{}' OR ai_analysis IS NULL OR ad_score = 0";

    const postsResult = await db.execute(sql);
    const posts = postsResult.rows as any[];
    let analyzedCount = 0;

    for (const post of posts) {
      const aiResult = await analyzePostWithAI(
        post.text as string,
        Number(post.reactions) || 0,
        Number(post.comments) || 0,
        Number(post.shares) || 0
      );

      await db.execute({
        sql: `UPDATE posts SET ad_score = ?, category = ?, characteristics = ?, ai_analysis = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [aiResult.overall_score, aiResult.category, JSON.stringify(aiResult.characteristics), JSON.stringify(aiResult), post.id]
      });
      analyzedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Batch analyzed ${analyzedCount} posts successfully`,
      analyzed_count: analyzedCount
    });
  } catch (error: any) {
    console.error('Error in batch analysis:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
