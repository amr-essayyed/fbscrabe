import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const status = searchParams.get('status');
    const pageId = searchParams.get('page_id');

    const db = getDb();
    const conditions: string[] = [];
    const args: any[] = [];

    if (status && status !== 'All') { conditions.push('p.status = ?'); args.push(status); }
    if (pageId) { conditions.push('p.page_id = ?'); args.push(Number(pageId)); }

    const sql = `
      SELECT p.*, pg.name as page_name, pg.url as page_url
      FROM posts p LEFT JOIN pages pg ON p.page_id = pg.id
      ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
      ORDER BY p.id DESC
    `;

    const result = await db.execute({ sql, args });
    const posts = result.rows.map((row: any) => ({
      ...row,
      characteristics: row.characteristics ? JSON.parse(row.characteristics as string) : {},
      ai_analysis: row.ai_analysis ? JSON.parse(row.ai_analysis as string) : undefined,
    }));

    if (format === 'csv') {
      const headers = [
        'ID', 'Page Name', 'FB URL', 'Post Text', 'Date', 'Media URL', 'Media Type',
        'Reactions', 'Comments', 'Shares', 'Category', 'Status', 'Ad Score',
        'AI Rating', 'Suggested Angle', 'Why Ad', 'Manual Notes'
      ];
      const csvRows = [headers.join(',')];
      for (const p of posts) {
        csvRows.push([
          p.id, esc(p.page_name || ''), esc(p.facebook_url || ''), esc(p.text || ''),
          esc(p.date || ''), esc(p.media_url || ''), p.media_type || 'none',
          p.reactions || 0, p.comments || 0, p.shares || 0,
          esc(p.category || 'Other'), esc(p.status || 'Unreviewed'), p.ad_score || 0,
          esc(p.ai_analysis?.rating || ''), esc(p.ai_analysis?.suggested_angle || ''),
          esc(p.ai_analysis?.why_ad || ''), esc(p.manual_notes || '')
        ].join(','));
      }
      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="postsnag_export_${Date.now()}.csv"`,
        }
      });
    }

    return new NextResponse(JSON.stringify(posts, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="postsnag_export_${Date.now()}.json"`,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function esc(val: string): string {
  return `"${String(val).replace(/"/g, '""')}"`;
}
