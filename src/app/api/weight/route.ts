import { NextResponse } from 'next/server';
import { readLatestWeight, writeLatestWeight } from '@/lib/weightStore';

export async function GET() {
  const latest = await readLatestWeight();
  if (!latest) {
    return NextResponse.json({ error: 'No weight recorded yet' }, { status: 404 });
  }
  return NextResponse.json(latest);
}

export async function POST(request: Request) {
  const secret = process.env.WEIGHT_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'WEIGHT_WEBHOOK_SECRET is not configured' }, { status: 500 });
  }

  if (request.headers.get('x-weight-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const weightLb = Number(body.weightLb);
  if (!Number.isFinite(weightLb)) {
    return NextResponse.json({ error: 'weightLb must be a number' }, { status: 400 });
  }

  const recordedAt = typeof body.recordedAt === 'string' ? body.recordedAt : new Date().toISOString();
  await writeLatestWeight({ weightLb, recordedAt });

  return NextResponse.json({ success: true });
}
