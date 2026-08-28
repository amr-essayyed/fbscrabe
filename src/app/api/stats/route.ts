import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { DashboardStats, PostRecord } from '@/lib/types';

export async function GET() {
  try {
    const db = getDb();

    // 1. Counts
    const totalRow = db.prepare('SELECT COUNT(*) as cnt FROM posts').get() as { cnt: number };
    const selectedRow = db.prepare("SELECT COUNT(*) as cnt FROM posts WHERE status = 'Selected'").get() as { cnt: number };
    const rejectedRow = db.prepare("SELECT COUNT(*) as cnt FROM posts WHERE status = 'Rejected'").get() as { cnt: number };
    const reviewLaterRow = db.prepare("SELECT COUNT(*) as cnt FROM posts WHERE status = 'Review Later'").get() as { cnt: number };
    const unreviewedRow = db.prepare("SELECT COUNT(*) as cnt FROM posts WHERE status = 'Unreviewed'").get() as { cnt: number };

    // Posts this week (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const weekRow = db.prepare('SELECT COUNT(*) as cnt FROM posts WHERE date >= ? OR created_at >= ?').get(sevenDaysAgo, sevenDaysAgo) as { cnt: number };

    // Average engagement
    const avgEngRow = db.prepare('SELECT AVG(reactions + comments + shares) as avg_eng, AVG(ad_score) as avg_score FROM posts').get() as { avg_eng: number; avg_score: number };

    // Top categories
    const categoriesRows = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM posts
      GROUP BY category
      ORDER BY count DESC
      LIMIT 6
    `).all() as { category: string; count: number }[];

    // Best Ad Candidates (top ad_score, excluding rejected)
    const candidatesRows = db.prepare(`
      SELECT p.*, pg.name as page_name, pg.url as page_url
      FROM posts p
      LEFT JOIN pages pg ON p.page_id = pg.id
      WHERE p.status != 'Rejected'
      ORDER BY p.ad_score DESC, (p.reactions + p.comments + p.shares) DESC
      LIMIT 6
    `).all() as any[];

    // Top Performing by Engagement
    const topPerformingRows = db.prepare(`
      SELECT p.*, pg.name as page_name, pg.url as page_url
      FROM posts p
      LEFT JOIN pages pg ON p.page_id = pg.id
      ORDER BY (p.reactions + (p.comments * 2) + (p.shares * 3)) DESC
      LIMIT 6
    `).all() as any[];

    const parsePost = (row: any): PostRecord => ({
      ...row,
      characteristics: row.characteristics ? JSON.parse(row.characteristics) : {},
      ai_analysis: row.ai_analysis ? JSON.parse(row.ai_analysis) : undefined
    });

    const stats: DashboardStats = {
      total_posts: totalRow.cnt || 0,
      posts_this_week: weekRow.cnt || 0,
      selected_count: selectedRow.cnt || 0,
      rejected_count: rejectedRow.cnt || 0,
      review_later_count: reviewLaterRow.cnt || 0,
      unreviewed_count: unreviewedRow.cnt || 0,
      avg_engagement: Math.round(avgEngRow.avg_eng || 0),
      avg_ad_score: Math.round(avgEngRow.avg_score || 0),
      top_categories: categoriesRows,
      best_candidates: candidatesRows.map(parsePost),
      top_performing: topPerformingRows.map(parsePost)
    };

    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error('Error getting stats:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
