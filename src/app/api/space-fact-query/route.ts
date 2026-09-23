import { execFile } from 'node:child_process';
import path from 'node:path';
import { NextResponse } from 'next/server';

const SCRIPT_PATH = path.join(process.cwd(), 'src', 'simple_rag.py');
const LLM_TYPES = ['openai', 'ollama'];
const EMBEDDING_TYPES = ['openai', 'chroma', 'nomic'];

// The Ollama LLM and Nomic embedding options talk to a local Ollama server,
// which doesn't exist on hosted deployments, so the UI asks whether one is
// reachable before offering them.
export async function GET() {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(1500),
    });
    return NextResponse.json({ ollamaAvailable: response.ok });
  } catch {
    return NextResponse.json({ ollamaAvailable: false });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const query = typeof body.query === 'string' ? body.query.trim() : '';

  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  const llmType = LLM_TYPES.includes(body.llmType) ? body.llmType : 'openai';
  const embeddingType = EMBEDDING_TYPES.includes(body.embeddingType) ? body.embeddingType : 'openai';

  const payload = JSON.stringify({ query, llmType, embeddingType });

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
        let parsed: { response?: string; references?: string[]; error?: string } | undefined;
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
          resolve(NextResponse.json({ error: 'RAG script returned no response' }, { status: 500 }));
          return;
        }

        resolve(NextResponse.json({ response: parsed.response, references: parsed.references ?? [] }));
      }
    );
  });
}
