import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const row = db.prepare(`
      SELECT p.*, pg.name as page_name, pg.url as page_url
      FROM posts p
      LEFT JOIN pages pg ON p.page_id = pg.id
      WHERE p.id = ?
    `).get(id) as any;

    if (!row) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const post = {
      ...row,
      characteristics: row.characteristics ? JSON.parse(row.characteristics) : {},
      ai_analysis: row.ai_analysis ? JSON.parse(row.ai_analysis) : undefined
    };

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, category, manual_notes, ad_score } = body;

    const db = getDb();

    // Check post exists
    const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any;
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [];

    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }

    if (manual_notes !== undefined) {
      updates.push('manual_notes = ?');
      values.push(manual_notes);
    }

    if (ad_score !== undefined) {
      updates.push('ad_score = ?');
      values.push(ad_score);
    }

    values.push(id);

    db.prepare(`UPDATE posts SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare(`
      SELECT p.*, pg.name as page_name, pg.url as page_url
      FROM posts p
      LEFT JOIN pages pg ON p.page_id = pg.id
      WHERE p.id = ?
    `).get(id) as any;

    return NextResponse.json({
      success: true,
      post: {
        ...updated,
        characteristics: updated.characteristics ? JSON.parse(updated.characteristics) : {},
        ai_analysis: updated.ai_analysis ? JSON.parse(updated.ai_analysis) : undefined
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    db.prepare('DELETE FROM posts WHERE id = ?').run(id);
    return NextResponse.json({ success: true, message: 'Post deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
