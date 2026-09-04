import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const { id } = await params;
    const db = getDb();

    const result = await db.execute({
      sql: `SELECT p.*, pg.name as page_name, pg.url as page_url
            FROM posts p LEFT JOIN pages pg ON p.page_id = pg.id
            WHERE p.id = ?`,
      args: [id]
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const row = result.rows[0] as any;
    return NextResponse.json({
      success: true,
      post: {
        ...row,
        id: Number(row.id),
        characteristics: row.characteristics ? JSON.parse(row.characteristics as string) : {},
        ai_analysis: row.ai_analysis ? JSON.parse(row.ai_analysis as string) : undefined,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const { id } = await params;
    const body = await request.json();
    const { status, category, manual_notes, ad_score } = body;

    const db = getDb();

    const existing = await db.execute({ sql: 'SELECT id FROM posts WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [];

    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (manual_notes !== undefined) { updates.push('manual_notes = ?'); values.push(manual_notes); }
    if (ad_score !== undefined) { updates.push('ad_score = ?'); values.push(ad_score); }

    values.push(id);
    await db.execute({ sql: `UPDATE posts SET ${updates.join(', ')} WHERE id = ?`, args: values });

    const updated = await db.execute({
      sql: `SELECT p.*, pg.name as page_name, pg.url as page_url
            FROM posts p LEFT JOIN pages pg ON p.page_id = pg.id
            WHERE p.id = ?`,
      args: [id]
    });
    const row = updated.rows[0] as any;

    return NextResponse.json({
      success: true,
      post: {
        ...row,
        id: Number(row.id),
        characteristics: row.characteristics ? JSON.parse(row.characteristics as string) : {},
        ai_analysis: row.ai_analysis ? JSON.parse(row.ai_analysis as string) : undefined,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDb();
    const { id } = await params;
    const db = getDb();
    await db.execute({ sql: 'DELETE FROM posts WHERE id = ?', args: [id] });
    return NextResponse.json({ success: true, message: 'Post deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
