import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const existing = db.prepare('SELECT id FROM pages WHERE id = ?').get(Number(id));
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
    if (body.url !== undefined) { fields.push('url = ?'); values.push(body.url); }
    if (body.categories !== undefined) { fields.push('categories = ?'); values.push(JSON.stringify(body.categories)); }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    values.push(Number(id));
    db.prepare(`UPDATE pages SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM pages WHERE id = ?').get(Number(id)) as any;
    return NextResponse.json({
      success: true,
      page: { ...updated, categories: JSON.parse(updated.categories || '[]') }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();

    const existing = db.prepare('SELECT id FROM pages WHERE id = ?').get(Number(id));
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
    }

    // Delete posts belonging to this page first
    db.prepare('DELETE FROM posts WHERE page_id = ?').run(Number(id));
    db.prepare('DELETE FROM pages WHERE id = ?').run(Number(id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
