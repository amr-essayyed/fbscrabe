import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { analyzePostWithAI } from '@/lib/aiService';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pageId = Number(id);
    const db = getDb();

    // Fetch the page and its custom categories
    const page = db.prepare('SELECT * FROM pages WHERE id = ?').get(pageId) as any;
    if (!page) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
    }

    let customCategories: string[] = [];
    try {
      customCategories = page.categories ? JSON.parse(page.categories) : [];
    } catch { /* ignore */ }

    if (customCategories.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No AI Classification Categories configured for this page. Add categories in Page Settings first.'
      }, { status: 400 });
    }

    // Fetch all posts for this page
    const posts = db.prepare('SELECT * FROM posts WHERE page_id = ?').all(pageId) as any[];

    if (posts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No posts to categorize for this page.',
        analyzed_count: 0
      });
    }

    let analyzedCount = 0;

    for (const post of posts) {
      const aiResult = await analyzePostWithAI(
        post.text,
        post.reactions || 0,
        post.comments || 0,
        post.shares || 0,
        customCategories
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
      message: `Categorized ${analyzedCount} post${analyzedCount !== 1 ? 's' : ''} using ${customCategories.length} categories: ${customCategories.join(', ')}`,
      analyzed_count: analyzedCount
    });
  } catch (error: any) {
    console.error('Error in page categorize:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
