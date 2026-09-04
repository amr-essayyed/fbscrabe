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
    const pageId = Number(id);
    const db = getDb();

    const pageResult = await db.execute({ sql: 'SELECT * FROM pages WHERE id = ?', args: [pageId] });
    if (pageResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
    }
    const page = pageResult.rows[0] as any;

    let customCategories: string[] = [];
    try {
      customCategories = page.categories ? JSON.parse(page.categories as string) : [];
    } catch { /* ignore */ }

    if (customCategories.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No AI Classification Categories configured for this page. Add categories in Page Settings first.'
      }, { status: 400 });
    }

    const postsResult = await db.execute({ sql: 'SELECT * FROM posts WHERE page_id = ?', args: [pageId] });
    const posts = postsResult.rows as any[];

    if (posts.length === 0) {
      return NextResponse.json({ success: true, message: 'No posts to categorize for this page.', analyzed_count: 0 });
    }

    let analyzedCount = 0;
    for (const post of posts) {
      const aiResult = await analyzePostWithAI(
        post.text as string,
        Number(post.reactions) || 0,
        Number(post.comments) || 0,
        Number(post.shares) || 0,
        customCategories
      );

      await db.execute({
        sql: `UPDATE posts SET ad_score = ?, category = ?, characteristics = ?, ai_analysis = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [aiResult.overall_score, aiResult.category, JSON.stringify(aiResult.characteristics), JSON.stringify(aiResult), post.id]
      });
      analyzedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Categorized ${analyzedCount} post${analyzedCount !== 1 ? 's' : ''} using ${customCategories.length} categories: ${customCategories.join(', ')}`,
      analyzed_count: analyzedCount
    });
  } catch (error: any) {
    console.error('Error in page categorize:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
