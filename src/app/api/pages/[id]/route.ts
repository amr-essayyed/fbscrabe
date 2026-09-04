import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const existing = await db.execute({ sql: 'SELECT id FROM pages WHERE id = ?', args: [Number(id)] });
    if (existing.rows.length === 0) {
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
    await db.execute({ sql: `UPDATE pages SET ${fields.join(', ')} WHERE id = ?`, args: values });

    const updated = await db.execute({ sql: 'SELECT * FROM pages WHERE id = ?', args: [Number(id)] });
    const page = updated.rows[0] as any;
    return NextResponse.json({
      success: true,
      page: { ...page, id: Number(page.id), categories: JSON.parse((page.categories as string) || '[]') }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const db = getDb();

    const existing = await db.execute({ sql: 'SELECT id FROM pages WHERE id = ?', args: [Number(id)] });
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
    }

    await db.execute({ sql: 'DELETE FROM posts WHERE page_id = ?', args: [Number(id)] });
    await db.execute({ sql: 'DELETE FROM pages WHERE id = ?', args: [Number(id)] });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
