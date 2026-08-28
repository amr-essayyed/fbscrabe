import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const apiKeyRow = db.prepare("SELECT value FROM settings WHERE key = 'openrouter_api_key'").get() as { value: string } | undefined;
    const modelRow = db.prepare("SELECT value FROM settings WHERE key = 'openrouter_model'").get() as { value: string } | undefined;

    return NextResponse.json({
      success: true,
      settings: {
        openrouter_api_key: apiKeyRow?.value || '',
        openrouter_model: modelRow?.value || 'google/gemini-2.0-flash-001'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { openrouter_api_key, openrouter_model } = body;

    const db = getDb();
    const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');

    if (openrouter_api_key !== undefined) {
      upsert.run('openrouter_api_key', openrouter_api_key.trim());
    }

    if (openrouter_model !== undefined) {
      upsert.run('openrouter_model', openrouter_model.trim());
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
