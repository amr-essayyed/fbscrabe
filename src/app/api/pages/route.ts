import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { PageRecord } from '@/lib/types';

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT pg.*, COUNT(p.id) as post_count
      FROM pages pg
      LEFT JOIN posts p ON p.page_id = pg.id
      GROUP BY pg.id
      ORDER BY pg.created_at DESC
    `).all() as any[];

    const pages: PageRecord[] = rows.map((r) => ({
      ...r,
      categories: r.categories ? JSON.parse(r.categories) : []
    }));

    return NextResponse.json({ success: true, pages });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, url, categories } = await request.json();
    if (!name || !url) {
      return NextResponse.json({ success: false, error: 'name and url are required' }, { status: 400 });
    }

    const db = getDb();
    const categoriesJson = JSON.stringify(categories || []);

    db.prepare('INSERT OR IGNORE INTO pages (name, url, categories) VALUES (?, ?, ?)').run(name, url, categoriesJson);
    const page = db.prepare('SELECT * FROM pages WHERE url = ?').get(url) as any;

    return NextResponse.json({
      success: true,
      page: { ...page, categories: JSON.parse(page.categories || '[]') }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
