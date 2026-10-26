import { execFile } from 'node:child_process';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/ownerAccess';

const APP_SCRIPT_PATH = path.join(process.cwd(), 'src', 'prompts.py');

export async function POST() {
  const denied = await requireOwner();
  if (denied) return denied;

  return new Promise<NextResponse>((resolve) => {
    execFile(
      'python',
      [APP_SCRIPT_PATH],
      {
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        timeout: 180000,
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
