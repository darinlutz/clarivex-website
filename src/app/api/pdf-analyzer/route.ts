import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NextResponse } from 'next/server';
import {
  isEmbeddingType,
  isLlmType,
  ollamaAvailabilityResponse,
  runPythonJson,
} from '@/lib/ragRoute';

const SCRIPT_FILE = 'rag_pdf_simple.py';
const MAX_PDF_BYTES = 25 * 1024 * 1024;

interface EmbeddingInfo {
  name: string;
  dimensions: number;
  model: string;
}

interface ProcessResult {
  filename?: string;
  chunkCount?: number;
  embedding?: EmbeddingInfo;
  error?: string;
}

interface QueryResult {
  answer?: string;
  passages?: string[];
  embedding?: EmbeddingInfo;
  error?: string;
}

export async function GET() {
  return ollamaAvailabilityResponse();
}

// Multipart form data = upload a PDF to be processed; JSON = ask a question.
export async function POST(request: Request) {
  const isUpload = (request.headers.get('content-type') ?? '').includes('multipart/form-data');

  try {
    if (isUpload) {
      const form = await request.formData();
      const file = form.get('file');
      const sessionId = form.get('sessionId');
      const embeddingType = form.get('embeddingType');

      if (!(file instanceof File) || typeof sessionId !== 'string' || !sessionId) {
        return NextResponse.json({ error: 'Missing PDF or session id' }, { status: 400 });
      }
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
      }
      if (file.size > MAX_PDF_BYTES) {
        return NextResponse.json({ error: 'PDF is too large (25 MB max)' }, { status: 413 });
      }

      const workDir = await mkdtemp(path.join(tmpdir(), 'pdf-analyzer-'));
      try {
        const pdfPath = path.join(workDir, 'upload.pdf');
        await writeFile(pdfPath, Buffer.from(await file.arrayBuffer()));

        const result = await runPythonJson<ProcessResult>(
          SCRIPT_FILE,
          {
            action: 'process',
            pdfPath,
            filename: file.name,
            sessionId,
            embeddingType: isEmbeddingType(embeddingType) ? embeddingType : 'openai',
          },
          180000
        );

        return NextResponse.json({
          filename: result.filename,
          chunkCount: result.chunkCount,
          embedding: result.embedding,
        });
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    }

    const body = await request.json().catch(() => ({}));
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (!query || typeof body.sessionId !== 'string' || !body.sessionId) {
      return NextResponse.json({ error: 'Missing question or session id' }, { status: 400 });
    }

    const result = await runPythonJson<QueryResult>(
      SCRIPT_FILE,
      {
        action: 'query',
        query,
        sessionId: body.sessionId,
        llmType: isLlmType(body.llmType) ? body.llmType : 'openai',
        embeddingType: isEmbeddingType(body.embeddingType) ? body.embeddingType : 'openai',
      },
      120000
    );

    return NextResponse.json({
      answer: result.answer,
      passages: result.passages ?? [],
      embedding: result.embedding,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PDF analyzer failed' },
      { status: 500 }
    );
  }
}
