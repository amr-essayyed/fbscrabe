import { NextResponse } from 'next/server';
import { getDb, generateTextHash } from '@/lib/db';
import { checkDuplicate, IngestPostPayload } from '@/lib/deduplication';
import { analyzePostWithAI } from '@/lib/aiService';

// Handle CORS Preflight for Extension
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export async function POST(request: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  try {
    const body = await request.json();
    const items: IngestPostPayload[] = Array.isArray(body) ? body : (body.posts || [body]);

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No posts provided in payload' },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = getDb();
    let createdCount = 0;
    let duplicateCount = 0;
    const createdPosts = [];

    const insertPost = db.prepare(`
      INSERT INTO posts (
        page_id, facebook_url, text, date, media_url, media_type,
        reactions, comments, shares, category, status, ad_score,
        characteristics, ai_analysis, manual_notes, text_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      if (!item.text || item.text.trim().length === 0) {
        continue;
      }

      // 1. Check Duplicate
      const dupResult = checkDuplicate(item);
      if (dupResult.isDuplicate) {
        duplicateCount++;
        continue;
      }

      // 2. Resolve Page
      let pageId = null;
      if (item.page_url || item.page_name) {
        const pageUrl = item.page_url || `https://www.facebook.com/${(item.page_name || 'page').toLowerCase().replace(/\s+/g, '')}`;
        const pageName = item.page_name || 'Facebook Page';

        db.prepare('INSERT OR IGNORE INTO pages (name, url) VALUES (?, ?)').run(pageName, pageUrl);
        const pg = db.prepare('SELECT id FROM pages WHERE url = ?').get(pageUrl) as { id: number } | undefined;
        pageId = pg ? pg.id : null;
      }

      // 3. AI Analysis
      const reactions = item.reactions || 0;
      const comments = item.comments || 0;
      const shares = item.shares || 0;

      const aiResult = await analyzePostWithAI(item.text, reactions, comments, shares);
      const textHash = generateTextHash(item.text);
      const fbUrl = item.facebook_url || `https://www.facebook.com/post/${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      const res = insertPost.run(
        pageId,
        fbUrl,
        item.text,
        item.date || new Date().toISOString(),
        item.media_url || null,
        item.media_type || (item.media_url ? 'image' : 'none'),
        reactions,
        comments,
        shares,
        aiResult.category,
        'Unreviewed',
        aiResult.overall_score,
        JSON.stringify(aiResult.characteristics),
        JSON.stringify(aiResult),
        '',
        textHash
      );

      createdCount++;
      createdPosts.push({ id: res.lastInsertRowid, text: item.text.substring(0, 50) });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Ingested ${items.length} posts: ${createdCount} created, ${duplicateCount} duplicates skipped`,
        total_received: items.length,
        created_count: createdCount,
        duplicate_count: duplicateCount,
        created_posts: createdPosts
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Error ingesting posts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
