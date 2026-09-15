import { NextResponse } from 'next/server';

interface YahooFinanceChartResponse {
  chart: {
    result?: {
      meta: {
        regularMarketPrice: number;
      };
    }[];
    error?: unknown;
  };
}

let cachedRate: number | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 30000; // 30 seconds

export async function GET() {
  try {
    const now = Date.now();
    if (cachedRate && now - cacheTime < CACHE_DURATION) {
      return NextResponse.json({
        rate: cachedRate,
        symbol: 'JPY',
        timestamp: now,
        cached: true,
      });
    }

    // JPY=X is the Yahoo Finance ticker for the USD/JPY exchange rate
    // (JPY per 1 USD). No API key required.
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/JPY=X',
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 30 },
      }
    );

    if (!response.ok) {
      throw new Error('Yahoo Finance API error');
    }

    const data: YahooFinanceChartResponse = await response.json();
    const rate = data.chart.result?.[0]?.meta.regularMarketPrice;

    if (typeof rate !== 'number') {
      throw new Error('No USD/JPY rate data available');
    }

    cachedRate = rate;
    cacheTime = now;

    return NextResponse.json({
      rate,
      symbol: 'JPY',
      timestamp: now,
      cached: false,
    });
  } catch (error) {
    console.error('Yen API error:', error);

    if (cachedRate) {
      return NextResponse.json({
        rate: cachedRate,
        symbol: 'JPY',
        timestamp: Date.now(),
        cached: true,
        error: 'Using cached rate',
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch USD/JPY rate' },
      { status: 500 }
    );
  }
}
