import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

interface TimesheetFormData {
  startDate: string;
  endDate: string;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function runClockifyScript(startDate: string, endDate: string) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'clockify_entry.py');
    const proc = spawn('python', [scriptPath, '--start', startDate, '--end', endDate]);

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => (stdout += chunk.toString()));
    proc.stderr.on('data', (chunk) => (stderr += chunk.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

export async function POST(request: Request) {
  try {
    const body: TimesheetFormData = await request.json();

    if (!body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!DATE_REGEX.test(body.startDate) || !DATE_REGEX.test(body.endDate)) {
      return NextResponse.json(
        { error: 'Dates must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    if (new Date(body.startDate) > new Date(body.endDate)) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    const result = await runClockifyScript(body.startDate, body.endDate);

    if (result.code !== 0) {
      console.error('clockify_entry.py failed:', result.stderr);
      return NextResponse.json(
        { error: 'Failed to submit time entries' },
        { status: 500 }
      );
    }

    console.log(result.stdout);

    return NextResponse.json(
      {
        success: true,
        message: 'Timesheet submitted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Timesheet form error:', error);

    return NextResponse.json(
      { error: 'Failed to process your request' },
      { status: 500 }
    );
  }
}
