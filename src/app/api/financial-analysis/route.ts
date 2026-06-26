import { NextResponse } from 'next/server';
import { runFinancialAnalysis } from '@/lib/financialAnalysis';

interface FinancialAnalysisRequest {
  query: string;
}

export async function POST(request: Request) {
  try {
    const body: FinancialAnalysisRequest = await request.json();

    if (!body.query || !body.query.trim()) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    if (!process.env.TAVILY_API_KEY) {
      console.error('TAVILY_API_KEY is not configured');
      return NextResponse.json({ error: 'Tavily API key not configured' }, { status: 500 });
    }
    if (!process.env.ALPHA_VANTAGE_API_KEY) {
      console.error('ALPHA_VANTAGE_API_KEY is not configured');
      return NextResponse.json({ error: 'Alpha Vantage API key not configured' }, { status: 500 });
    }

    const result = await runFinancialAnalysis(body.query);

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error) {
    console.error('Financial analysis error:', error);

    return NextResponse.json({ error: 'Failed to run financial analysis' }, { status: 500 });
  }
}
