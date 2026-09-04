import { NextResponse } from 'next/server';
import { getDb, initDb, generateTextHash } from '@/lib/db';
import { checkDuplicate } from '@/lib/deduplication';
import { analyzePostWithAI } from '@/lib/aiService';

export async function POST(request: Request) {
  try {
    await initDb();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No CSV file provided' }, { status: 400 });
    }

    const textContent = await file.text();
    const records = parseCsv(textContent);

    if (records.length === 0) {
      return NextResponse.json({ success: false, error: 'CSV file is empty or invalid format' }, { status: 400 });
    }

    const db = getDb();
    let importedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const record of records) {
      const postText = record['Post Text'] || record['text'] || record['Text'] || '';
      if (!postText.trim()) { errorCount++; continue; }

      const fbUrl = record['FB URL'] || record['facebook_url'] || record['Facebook URL'] || '';
      const reactions = parseInt(record['Reactions'] || record['reactions'] || '0', 10) || 0;
      const comments = parseInt(record['Comments'] || record['comments'] || '0', 10) || 0;
      const shares = parseInt(record['Shares'] || record['shares'] || '0', 10) || 0;
      const date = record['Date'] || record['date'] || new Date().toISOString();
      const mediaUrl = record['Media URL'] || record['media_url'] || '';
      const mediaType = (record['Media Type'] || record['media_type'] || (mediaUrl ? 'image' : 'none')).toLowerCase() as 'image' | 'video' | 'none';
      const manualNotes = record['Manual Notes'] || record['manual_notes'] || '';
      const categoryHint = record['Category'] || record['category'] || '';
      const statusHint = record['Status'] || record['status'] || 'Unreviewed';
      const pageName = record['Page Name'] || record['page_name'] || '';

      const dupCheck = await checkDuplicate({ facebook_url: fbUrl, text: postText });
      if (dupCheck.isDuplicate) { duplicateCount++; continue; }

      let pageId: number | null = null;
      if (pageName) {
        const targetUrl = `https://facebook.com/${pageName.toLowerCase().replace(/\s+/g, '')}`;
        await db.execute({ sql: 'INSERT OR IGNORE INTO pages (name, url) VALUES (?, ?)', args: [pageName, targetUrl] });
        const pg = await db.execute({ sql: 'SELECT id FROM pages WHERE url = ?', args: [targetUrl] });
        pageId = pg.rows.length > 0 ? Number(pg.rows[0].id) : null;
      }

      const aiResult = await analyzePostWithAI(postText, reactions, comments, shares);
      if (categoryHint) aiResult.category = categoryHint as any;

      const textHash = generateTextHash(postText);
      const finalFbUrl = fbUrl || `https://facebook.com/post/${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const validStatuses = ['Unreviewed', 'Selected', 'Rejected', 'Review Later'];

      await db.execute({
        sql: `INSERT INTO posts (
          page_id, facebook_url, text, date, media_url, media_type,
          reactions, comments, shares, category, status, ad_score,
          characteristics, ai_analysis, manual_notes, text_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          pageId, finalFbUrl, postText, date,
          mediaUrl || null, mediaType,
          reactions, comments, shares,
          aiResult.category,
          validStatuses.includes(statusHint) ? statusHint : 'Unreviewed',
          aiResult.overall_score,
          JSON.stringify(aiResult.characteristics),
          JSON.stringify(aiResult),
          manualNotes, textHash
        ]
      });

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${importedCount} imported, ${duplicateCount} duplicates skipped, ${errorCount} invalid rows.`,
      imported_count: importedCount,
      duplicate_count: duplicateCount,
      error_count: errorCount,
    });
  } catch (error: any) {
    console.error('Error importing CSV:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function parseCsv(csvText: string): Record<string, string>[] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') { currentCell += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) lines.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) lines.push(currentRow);
  }

  if (lines.length < 2) return [];

  const headers = lines[0].map((h) => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = row[i] ? row[i].replace(/^"|"$/g, '').trim() : ''; });
    return obj;
  });
}
