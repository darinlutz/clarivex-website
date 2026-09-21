import { execFile } from 'node:child_process';
import path from 'node:path';
import { NextResponse } from 'next/server';

const SCRIPT_PATH = path.join(process.cwd(), 'src', 'chatbot_logging.py');

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const history: ChatMessage[] = Array.isArray(body.history)
    ? body.history.filter(
        (entry: unknown): entry is ChatMessage =>
          typeof entry === 'object' &&
          entry !== null &&
          ((entry as ChatMessage).role === 'user' || (entry as ChatMessage).role === 'assistant') &&
          typeof (entry as ChatMessage).content === 'string'
      )
    : [];
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined;

  if (!message) {
    return NextResponse.json({ error: 'Missing message' }, { status: 400 });
  }

  const payload = JSON.stringify({ message, history, sessionId });

  return new Promise<NextResponse>((resolve) => {
    execFile(
      'python',
      [SCRIPT_PATH, payload],
      {
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        let parsed: { response?: string; sessionId?: string; error?: string } | undefined;
        try {
          parsed = JSON.parse(stdout.trim());
        } catch {
          parsed = undefined;
        }

        if (parsed?.error) {
          resolve(NextResponse.json({ error: parsed.error }, { status: 500 }));
          return;
        }

        if (error) {
          resolve(
            NextResponse.json(
              { error: stderr.trim() || error.message },
              { status: 500 }
            )
          );
          return;
        }

        if (!parsed?.response) {
          resolve(NextResponse.json({ error: 'Chatbot script returned no response' }, { status: 500 }));
          return;
        }

        resolve(NextResponse.json({ response: parsed.response, sessionId: parsed.sessionId }));
      }
    );
  });
}
