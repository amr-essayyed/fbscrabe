import { NextResponse } from 'next/server';
import { getDb, initDb, generateTextHash } from '@/lib/db';
import { checkDuplicate } from '@/lib/deduplication';
import { analyzePostWithAI } from '@/lib/aiService';
import { PostRecord } from '@/lib/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const pageId = searchParams.get('page_id');

    const db = getDb();

    let query = `
      SELECT p.*, pg.name as page_name, pg.url as page_url
      FROM posts p
      LEFT JOIN pages pg ON p.page_id = pg.id
    `;
    const conditions: string[] = [];
    const args: any[] = [];

    if (status && status !== 'All') {
      conditions.push('p.status = ?');
      args.push(status);
    }
    if (category && category !== 'All') {
      conditions.push('p.category = ?');
      args.push(category);
    }
    if (pageId) {
      conditions.push('p.page_id = ?');
      args.push(Number(pageId));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await db.execute({ sql: query, args });

    const posts: PostRecord[] = result.rows.map((r: any) => ({
      ...r,
      id: Number(r.id),
      page_id: r.page_id ? Number(r.page_id) : undefined,
      reactions: Number(r.reactions || 0),
      comments: Number(r.comments || 0),
      shares: Number(r.shares || 0),
      ad_score: Number(r.ad_score || 0),
      characteristics: r.characteristics
        ? typeof r.characteristics === 'string'
          ? JSON.parse(r.characteristics)
          : r.characteristics
        : {},
      ai_analysis: r.ai_analysis
        ? typeof r.ai_analysis === 'string'
          ? JSON.parse(r.ai_analysis)
          : r.ai_analysis
        : undefined,
    }));

    return NextResponse.json({ success: true, posts }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();
    const {
      text,
      page_name,
      page_url,
      facebook_url,
      media_url,
      media_type,
      reactions = 0,
      comments = 0,
      shares = 0,
    } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Post text is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = getDb();

    // Look up or create page if page info is provided
    let pageId: number | null = null;
    if (page_url || page_name) {
      const pUrl =
        page_url ||
        `https://www.facebook.com/${(page_name || 'page')
          .toLowerCase()
          .replace(/\s+/g, '')}`;
      const pName = page_name || 'Facebook Page';
      await db.execute({
        sql: 'INSERT OR IGNORE INTO pages (name, url) VALUES (?, ?)',
        args: [pName, pUrl],
      });
      const pg = await db.execute({
        sql: 'SELECT id FROM pages WHERE url = ?',
        args: [pUrl],
      });
      if (pg.rows.length > 0) {
        pageId = Number(pg.rows[0].id);
      }
    }

    // Check duplicate
    const dupResult = await checkDuplicate({ facebook_url, text });
    if (dupResult.isDuplicate && dupResult.existingPostId) {
      const existing = await db.execute({
        sql: `SELECT p.*, pg.name as page_name, pg.url as page_url
              FROM posts p LEFT JOIN pages pg ON p.page_id = pg.id
              WHERE p.id = ?`,
        args: [dupResult.existingPostId],
      });
      if (existing.rows.length > 0) {
        const row = existing.rows[0] as any;
        const post: PostRecord = {
          ...row,
          id: Number(row.id),
          page_id: row.page_id ? Number(row.page_id) : undefined,
          reactions: Number(row.reactions || 0),
          comments: Number(row.comments || 0),
          shares: Number(row.shares || 0),
          ad_score: Number(row.ad_score || 0),
          characteristics: row.characteristics
            ? JSON.parse(row.characteristics as string)
            : {},
          ai_analysis: row.ai_analysis
            ? JSON.parse(row.ai_analysis as string)
            : undefined,
        };
        return NextResponse.json(
          { success: true, post, is_duplicate: true },
          { headers: corsHeaders }
        );
      }
    }

    // Fetch custom categories for page if pageId exists
    let customCategories: string[] | undefined;
    if (pageId) {
      const pageRes = await db.execute({
        sql: 'SELECT categories FROM pages WHERE id = ?',
        args: [pageId],
      });
      if (pageRes.rows.length > 0 && pageRes.rows[0].categories) {
        try {
          const cats = JSON.parse(pageRes.rows[0].categories as string);
          if (Array.isArray(cats) && cats.length > 0) {
            customCategories = cats;
          }
        } catch {}
      }
    }

    // AI Analysis
    const aiResult = await analyzePostWithAI(
      text,
      Number(reactions),
      Number(comments),
      Number(shares),
      customCategories
    );
    const textHash = generateTextHash(text);
    const fbUrl =
      facebook_url ||
      `https://www.facebook.com/post/${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 7)}`;

    const insertResult = await db.execute({
      sql: `INSERT INTO posts (
        page_id, facebook_url, text, date, media_url, media_type,
        reactions, comments, shares, category, status, ad_score,
        characteristics, ai_analysis, manual_notes, text_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        pageId,
        fbUrl,
        text,
        new Date().toISOString(),
        media_url || null,
        media_type || (media_url ? 'image' : 'none'),
        Number(reactions),
        Number(comments),
        Number(shares),
        aiResult.category,
        'Unreviewed',
        aiResult.overall_score,
        JSON.stringify(aiResult.characteristics),
        JSON.stringify(aiResult),
        '',
        textHash,
      ],
    });

    const newId = Number(insertResult.lastInsertRowid);

    const postQuery = await db.execute({
      sql: `SELECT p.*, pg.name as page_name, pg.url as page_url
            FROM posts p LEFT JOIN pages pg ON p.page_id = pg.id
            WHERE p.id = ?`,
      args: [newId],
    });

    const row = postQuery.rows[0] as any;
    const post: PostRecord = {
      ...row,
      id: Number(row.id),
      page_id: row.page_id ? Number(row.page_id) : undefined,
      reactions: Number(row.reactions || 0),
      comments: Number(row.comments || 0),
      shares: Number(row.shares || 0),
      ad_score: Number(row.ad_score || 0),
      characteristics: row.characteristics
        ? JSON.parse(row.characteristics as string)
        : {},
      ai_analysis: row.ai_analysis
        ? JSON.parse(row.ai_analysis as string)
        : undefined,
    };

    return NextResponse.json({ success: true, post }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
