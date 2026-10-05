import { NextResponse } from 'next/server';
import { fetchVocabulary } from '@/lib/language';
import {
  getConnectedSheet,
  parseSheetLink,
  serializeSheet,
  sheetCsvUrl,
  sheetViewUrl,
  VOCAB_SHEET_COOKIE,
} from '@/lib/vocabSheet';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Which sheet the Language page is currently using
export async function GET() {
  const sheet = await getConnectedSheet();
  return NextResponse.json({ connected: !!sheet, link: sheet ? sheetViewUrl(sheet) : null });
}

// Connects a Google Sheet after checking it can be read and has vocabulary
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.link !== 'string' || !body.link.trim()) {
      return NextResponse.json({ error: 'Please paste a Google Sheet link' }, { status: 400 });
    }

    const sheet = parseSheetLink(body.link);
    if (!sheet) {
      return NextResponse.json(
        { error: 'That is not a Google Sheets link (it should start with https://docs.google.com/spreadsheets/)' },
        { status: 400 }
      );
    }

    let wordCount: number;
    try {
      wordCount = (await fetchVocabulary(sheetCsvUrl(sheet))).length;
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Could not read that Google Sheet' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true, link: sheetViewUrl(sheet), wordCount });
    response.cookies.set(VOCAB_SHEET_COOKIE, serializeSheet(sheet), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ONE_YEAR_SECONDS,
    });
    return response;
  } catch (error) {
    console.error('Connect sheet error:', error);
    return NextResponse.json({ error: 'Failed to connect the Google Sheet' }, { status: 500 });
  }
}

// Goes back to the built-in vocabulary sheet
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(VOCAB_SHEET_COOKIE);
  return response;
}
