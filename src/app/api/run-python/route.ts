import { execFile } from 'node:child_process';
import path from 'node:path';
import { NextResponse } from 'next/server';

const SRC_DIR = path.join(process.cwd(), 'src');

// run_llm_demo() pauses between examples with input(), so it needs a real
// stdin to write to; import the module and call the function directly
// rather than running the file's interactive __main__ menu.
const RUNNER_CODE =
  'import sys; sys.path.insert(0, sys.argv[1]); from intro_transformer import run_llm_demo; run_llm_demo()';

export async function POST() {
  return new Promise<NextResponse>((resolve) => {
    const child = execFile(
      'python',
      ['-c', RUNNER_CODE, SRC_DIR],
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

    // Feed enough newlines to satisfy each "Press Enter to see next
    // example..." prompt so the demo can run to completion unattended.
    child.stdin?.end('\n'.repeat(10));
  });
}
