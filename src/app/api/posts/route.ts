import { NextResponse } from 'next/server';
import { getDb, generateTextHash } from '@/lib/db';
import { analyzePostWithAI } from '@/lib/aiService';
import { PostRecord } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'date'; // 'engagement' | 'ad_score' | 'date' | 'comments' | 'shares'
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const db = getDb();

    let query = `
      SELECT p.*, pg.name as page_name, pg.url as page_url
      FROM posts p
      LEFT JOIN pages pg ON p.page_id = pg.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (category && category !== 'All') {
      query += ` AND p.category = ?`;
      params.push(category);
    }

    if (status && status !== 'All') {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    if (search && search.trim() !== '') {
      query += ` AND (p.text LIKE ? OR p.manual_notes LIKE ? OR pg.name LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    // Sorting
    let orderByClause = 'ORDER BY p.created_at DESC';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    switch (sortBy) {
      case 'ad_score':
        orderByClause = `ORDER BY p.ad_score ${direction}, p.id DESC`;
        break;
      case 'engagement':
        orderByClause = `ORDER BY (p.reactions + (p.comments * 2) + (p.shares * 3)) ${direction}, p.id DESC`;
        break;
      case 'comments':
        orderByClause = `ORDER BY p.comments ${direction}, p.id DESC`;
        break;
      case 'shares':
        orderByClause = `ORDER BY p.shares ${direction}, p.id DESC`;
        break;
      case 'date':
      default:
        orderByClause = `ORDER BY p.date ${direction}, p.id DESC`;
        break;
    }

    query += ` ${orderByClause}`;

    const rawPosts = db.prepare(query).all(...params) as any[];

    const posts: PostRecord[] = rawPosts.map((row) => ({
      ...row,
      characteristics: row.characteristics ? JSON.parse(row.characteristics) : {},
      ai_analysis: row.ai_analysis ? JSON.parse(row.ai_analysis) : undefined
    }));

    return NextResponse.json({ success: true, count: posts.length, posts });
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, facebook_url, date, media_url, media_type, reactions, comments, shares, page_name, page_url } = body;

    if (!text || text.trim() === '') {
      return NextResponse.json({ success: false, error: 'Post text is required' }, { status: 400 });
    }

    const db = getDb();

    // Ensure Page
    let pageId = null;
    if (page_url || page_name) {
      const targetUrl = page_url || `https://facebook.com/${(page_name || 'unknown').toLowerCase().replace(/\s+/g, '')}`;
      db.prepare('INSERT OR IGNORE INTO pages (name, url) VALUES (?, ?)').run(page_name || 'Facebook Page', targetUrl);
      const pg = db.prepare('SELECT id FROM pages WHERE url = ?').get(targetUrl) as { id: number } | undefined;
      pageId = pg ? pg.id : null;
    }

    const textHash = generateTextHash(text);
    const fbUrl = facebook_url || `https://facebook.com/post/${Date.now()}`;

    // Auto AI analyze on create
    const aiResult = await analyzePostWithAI(text, reactions || 0, comments || 0, shares || 0);

    const stmt = db.prepare(`
      INSERT INTO posts (
        page_id, facebook_url, text, date, media_url, media_type,
        reactions, comments, shares, category, status, ad_score,
        characteristics, ai_analysis, manual_notes, text_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      pageId,
      fbUrl,
      text,
      date || new Date().toISOString(),
      media_url || null,
      media_type || 'none',
      reactions || 0,
      comments || 0,
      shares || 0,
      aiResult.category,
      'Unreviewed',
      aiResult.overall_score,
      JSON.stringify(aiResult.characteristics),
      JSON.stringify(aiResult),
      '',
      textHash
    );

    const createdPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid) as any;

    return NextResponse.json({
      success: true,
      post: {
        ...createdPost,
        characteristics: JSON.parse(createdPost.characteristics || '{}'),
        ai_analysis: JSON.parse(createdPost.ai_analysis || '{}')
      }
    });
  } catch (error: any) {
    console.error('Error creating post:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
