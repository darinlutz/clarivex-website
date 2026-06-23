import { NextResponse } from 'next/server';
import { planTrip } from '@/lib/tripPlanner';

interface TripPlannerRequest {
  destination: string;
  preferences: string;
}

export async function POST(request: Request) {
  try {
    const body: TripPlannerRequest = await request.json();

    if (!body.destination || !body.preferences) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const result = await planTrip(body.destination, body.preferences);

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error) {
    console.error('Trip planner error:', error);

    return NextResponse.json(
      { error: 'Failed to plan trip' },
      { status: 500 }
    );
  }
}
