import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { analyzePostWithAI } from '@/lib/aiService';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { reanalyzeAll } = body;

    const db = getDb();
    let query = 'SELECT * FROM posts';
    if (!reanalyzeAll) {
      query += " WHERE ai_analysis = '{}' OR ai_analysis IS NULL OR ad_score = 0";
    }

    const posts = db.prepare(query).all() as any[];

    let analyzedCount = 0;

    for (const post of posts) {
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
        post.id
      );

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
