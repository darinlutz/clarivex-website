import { execFile } from 'node:child_process';
import path from 'node:path';
import { NextResponse } from 'next/server';

const SCRIPT_PATH = path.join(process.cwd(), 'src', 'OllamaSearch.py');

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const query = typeof body.query === 'string' ? body.query.trim() : '';

  if (!query) {
    return NextResponse.json({ error: 'Missing search query' }, { status: 400 });
  }

  return new Promise<NextResponse>((resolve) => {
    execFile(
      'python',
      [SCRIPT_PATH, query],
      {
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        // Local model inference plus web search/fetch tool calls can be
        // slow, especially on first run before the model is warmed up.
        timeout: 300000,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          resolve(
            NextResponse.json(
              { error: stderr.trim() || error.message },
              { status: 500 }
            )
          );
          return;
        }
        resolve(NextResponse.json({ result: stdout.trim() }));
      }
    );
  });
}
