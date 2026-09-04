import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export async function GET() {
  try {
    await initDb();
    const db = getDb();

    const apiKeyRow = await db.execute({ sql: "SELECT value FROM settings WHERE key = 'openrouter_api_key'", args: [] });
    const modelRow = await db.execute({ sql: "SELECT value FROM settings WHERE key = 'openrouter_model'", args: [] });

    return NextResponse.json({
      success: true,
      settings: {
        openrouter_api_key: (apiKeyRow.rows[0]?.value as string) || '',
        openrouter_model: (modelRow.rows[0]?.value as string) || 'google/gemini-2.0-flash-001',
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initDb();
    const body = await request.json();
    const { openrouter_api_key, openrouter_model } = body;

    const db = getDb();

    if (openrouter_api_key !== undefined) {
      await db.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        args: ['openrouter_api_key', openrouter_api_key.trim()]
      });
    }
    if (openrouter_model !== undefined) {
      await db.execute({
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        args: ['openrouter_model', openrouter_model.trim()]
      });
    }

    return NextResponse.json({ success: true, message: 'Settings updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
