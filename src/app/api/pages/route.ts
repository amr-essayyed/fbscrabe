import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { PageRecord } from '@/lib/types';

export async function GET() {
  try {
    await initDb();
    const db = getDb();
    const result = await db.execute(`
      SELECT pg.*, COUNT(p.id) as post_count
      FROM pages pg
      LEFT JOIN posts p ON p.page_id = pg.id
      GROUP BY pg.id
      ORDER BY pg.created_at DESC
    `);

    const pages: PageRecord[] = result.rows.map((r: any) => ({
      ...r,
      id: Number(r.id),
      post_count: Number(r.post_count),
      categories: r.categories ? JSON.parse(r.categories as string) : []
    }));

    return NextResponse.json({ success: true, pages });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const { name, url, categories } = await request.json();
    if (!name || !url) {
      return NextResponse.json({ success: false, error: 'name and url are required' }, { status: 400 });
    }

    const db = getDb();
    const categoriesJson = JSON.stringify(categories || []);

    await db.execute({
      sql: 'INSERT OR IGNORE INTO pages (name, url, categories) VALUES (?, ?, ?)',
      args: [name, url, categoriesJson]
    });

    const pageResult = await db.execute({
      sql: 'SELECT * FROM pages WHERE url = ?',
      args: [url]
    });
    const page = pageResult.rows[0] as any;

    return NextResponse.json({
      success: true,
      page: { ...page, id: Number(page.id), categories: JSON.parse((page.categories as string) || '[]') }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
