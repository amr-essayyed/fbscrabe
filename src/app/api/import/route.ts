import { NextResponse } from 'next/server';
import { getDb, generateTextHash } from '@/lib/db';
import { checkDuplicate } from '@/lib/deduplication';
import { analyzePostWithAI } from '@/lib/aiService';

export async function POST(request: Request) {
  try {
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

    const insertPost = db.prepare(`
      INSERT INTO posts (
        page_id, facebook_url, text, date, media_url, media_type,
        reactions, comments, shares, category, status, ad_score,
        characteristics, ai_analysis, manual_notes, text_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const record of records) {
      const postText = record['Post Text'] || record['text'] || record['Text'] || '';
      if (!postText.trim()) {
        errorCount++;
        continue;
      }

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

      // Check duplicates
      const dupCheck = checkDuplicate({ facebook_url: fbUrl, text: postText });
      if (dupCheck.isDuplicate) {
        duplicateCount++;
        continue;
      }

      // Handle Page reference
      let pageId = null;
      if (pageName) {
        const targetUrl = `https://facebook.com/${pageName.toLowerCase().replace(/\s+/g, '')}`;
        db.prepare('INSERT OR IGNORE INTO pages (name, url) VALUES (?, ?)').run(pageName, targetUrl);
        const pg = db.prepare('SELECT id FROM pages WHERE url = ?').get(targetUrl) as { id: number } | undefined;
        pageId = pg ? pg.id : null;
      }

      // Run AI Analysis or use imported values
      let aiResult;
      if (categoryHint) {
        aiResult = await analyzePostWithAI(postText, reactions, comments, shares);
        aiResult.category = categoryHint as any;
      } else {
        aiResult = await analyzePostWithAI(postText, reactions, comments, shares);
      }

      const textHash = generateTextHash(postText);
      const finalFbUrl = fbUrl || `https://facebook.com/post/${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      insertPost.run(
        pageId,
        finalFbUrl,
        postText,
        date,
        mediaUrl || null,
        mediaType,
        reactions,
        comments,
        shares,
        aiResult.category,
        ['Unreviewed', 'Selected', 'Rejected', 'Review Later'].includes(statusHint) ? statusHint : 'Unreviewed',
        aiResult.overall_score,
        JSON.stringify(aiResult.characteristics),
        JSON.stringify(aiResult),
        manualNotes,
        textHash
      );

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${importedCount} imported, ${duplicateCount} duplicates skipped, ${errorCount} invalid rows.`,
      imported_count: importedCount,
      duplicate_count: duplicateCount,
      error_count: errorCount
    });
  } catch (error: any) {
    console.error('Error importing CSV:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Robust CSV Line & Cell Parser handling quotes, commas, and newlines inside quotes.
 */
function parseCsv(csvText: string): Record<string, string>[] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip double quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length < 2) return [];

  const headers = lines[0].map((h) => h.replace(/^"|"$/g, '').trim());
  const result: Record<string, string>[] = [];

  for (let r = 1; r < lines.length; r++) {
    const row = lines[r];
    const rowObj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      rowObj[headers[c]] = row[c] ? row[c].replace(/^"|"$/g, '').trim() : '';
    }
    result.push(rowObj);
  }

  return result;
}
