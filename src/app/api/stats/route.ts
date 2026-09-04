import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { DashboardStats, PostRecord } from '@/lib/types';

export async function GET() {
  try {
    await initDb();
    const db = getDb();

    const totalRow = await db.execute('SELECT COUNT(*) as cnt FROM posts');
    const selectedRow = await db.execute("SELECT COUNT(*) as cnt FROM posts WHERE status = 'Selected'");
    const rejectedRow = await db.execute("SELECT COUNT(*) as cnt FROM posts WHERE status = 'Rejected'");
    const reviewLaterRow = await db.execute("SELECT COUNT(*) as cnt FROM posts WHERE status = 'Review Later'");
    const unreviewedRow = await db.execute("SELECT COUNT(*) as cnt FROM posts WHERE status = 'Unreviewed'");

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const weekRow = await db.execute({
      sql: 'SELECT COUNT(*) as cnt FROM posts WHERE date >= ? OR created_at >= ?',
      args: [sevenDaysAgo, sevenDaysAgo]
    });

    const avgEngRow = await db.execute('SELECT AVG(reactions + comments + shares) as avg_eng, AVG(ad_score) as avg_score FROM posts');

    const categoriesResult = await db.execute(`
      SELECT category, COUNT(*) as count FROM posts GROUP BY category ORDER BY count DESC LIMIT 6
    `);

    const candidatesResult = await db.execute(`
      SELECT p.*, pg.name as page_name, pg.url as page_url
      FROM posts p LEFT JOIN pages pg ON p.page_id = pg.id
      WHERE p.status != 'Rejected'
      ORDER BY p.ad_score DESC, (p.reactions + p.comments + p.shares) DESC
      LIMIT 6
    `);

    const topPerformingResult = await db.execute(`
      SELECT p.*, pg.name as page_name, pg.url as page_url
      FROM posts p LEFT JOIN pages pg ON p.page_id = pg.id
      ORDER BY (p.reactions + (p.comments * 2) + (p.shares * 3)) DESC
      LIMIT 6
    `);

    const parsePost = (row: any): PostRecord => ({
      ...row,
      id: Number(row.id),
      characteristics: row.characteristics ? JSON.parse(row.characteristics as string) : {},
      ai_analysis: row.ai_analysis ? JSON.parse(row.ai_analysis as string) : undefined,
    });

    const avgEng = avgEngRow.rows[0] as any;

    const stats: DashboardStats = {
      total_posts: Number(totalRow.rows[0]?.cnt) || 0,
      posts_this_week: Number(weekRow.rows[0]?.cnt) || 0,
      selected_count: Number(selectedRow.rows[0]?.cnt) || 0,
      rejected_count: Number(rejectedRow.rows[0]?.cnt) || 0,
      review_later_count: Number(reviewLaterRow.rows[0]?.cnt) || 0,
      unreviewed_count: Number(unreviewedRow.rows[0]?.cnt) || 0,
      avg_engagement: Math.round(Number(avgEng?.avg_eng) || 0),
      avg_ad_score: Math.round(Number(avgEng?.avg_score) || 0),
      top_categories: categoriesResult.rows.map((r: any) => ({ category: r.category as string, count: Number(r.count) })),
      best_candidates: candidatesResult.rows.map(parsePost),
      top_performing: topPerformingResult.rows.map(parsePost),
    };

    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error('Error getting stats:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
