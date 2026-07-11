import { execFile } from 'node:child_process';
import path from 'node:path';
import { NextResponse } from 'next/server';

const APP_SCRIPT_PATH = path.join(process.cwd(), 'GetBankFromRoutingNumber.py');

export async function POST() {
  return new Promise<NextResponse>((resolve) => {
    execFile(
      'python',
      [APP_SCRIPT_PATH],
      { env: process.env, timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
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
