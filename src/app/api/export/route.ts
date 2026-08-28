import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // 'json' | 'csv'
    const status = searchParams.get('status');

    const db = getDb();
    let query = `
      SELECT p.*, pg.name as page_name, pg.url as page_url
      FROM posts p
      LEFT JOIN pages pg ON p.page_id = pg.id
    `;
    const params: any[] = [];
    if (status && status !== 'All') {
      query += ' WHERE p.status = ?';
      params.push(status);
    }
    query += ' ORDER BY p.id DESC';

    const rawPosts = db.prepare(query).all(...params) as any[];

    const posts = rawPosts.map((row) => ({
      ...row,
      characteristics: row.characteristics ? JSON.parse(row.characteristics) : {},
      ai_analysis: row.ai_analysis ? JSON.parse(row.ai_analysis) : undefined
    }));

    if (format === 'csv') {
      const headers = [
        'ID',
        'Page Name',
        'FB URL',
        'Post Text',
        'Date',
        'Media URL',
        'Media Type',
        'Reactions',
        'Comments',
        'Shares',
        'Category',
        'Status',
        'Ad Score',
        'AI Rating',
        'Suggested Angle',
        'Why Ad',
        'Manual Notes'
      ];

      const csvRows = [headers.join(',')];

      for (const p of posts) {
        const row = [
          p.id,
          escapeCsvField(p.page_name || ''),
          escapeCsvField(p.facebook_url || ''),
          escapeCsvField(p.text || ''),
          escapeCsvField(p.date || ''),
          escapeCsvField(p.media_url || ''),
          p.media_type || 'none',
          p.reactions || 0,
          p.comments || 0,
          p.shares || 0,
          escapeCsvField(p.category || 'Other'),
          escapeCsvField(p.status || 'Unreviewed'),
          p.ad_score || 0,
          escapeCsvField(p.ai_analysis?.rating || ''),
          escapeCsvField(p.ai_analysis?.suggested_angle || ''),
          escapeCsvField(p.ai_analysis?.why_ad || ''),
          escapeCsvField(p.manual_notes || '')
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\n');
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="postsnag_export_${Date.now()}.csv"`
        }
      });
    }

    return new NextResponse(JSON.stringify(posts, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="postsnag_export_${Date.now()}.json"`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function escapeCsvField(val: string): string {
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}
