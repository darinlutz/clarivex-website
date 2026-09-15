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

let cachedYield: number | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 30000; // 30 seconds

export async function GET() {
  try {
    const now = Date.now();
    if (cachedYield && now - cacheTime < CACHE_DURATION) {
      return NextResponse.json({
        yield: cachedYield,
        symbol: '%',
        timestamp: now,
        cached: true,
      });
    }

    // ^TNX is the CBOE 10-Year Treasury Note Yield Index, quoted directly in
    // percent. No API key required.
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5ETNX',
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 30 },
      }
    );

    if (!response.ok) {
      throw new Error('Yahoo Finance API error');
    }

    const data: YahooFinanceChartResponse = await response.json();
    const yieldValue = data.chart.result?.[0]?.meta.regularMarketPrice;

    if (typeof yieldValue !== 'number') {
      throw new Error('No 10Y Treasury yield data available');
    }

    cachedYield = yieldValue;
    cacheTime = now;

    return NextResponse.json({
      yield: yieldValue,
      symbol: '%',
      timestamp: now,
      cached: false,
    });
  } catch (error) {
    console.error('Treasury API error:', error);

    if (cachedYield) {
      return NextResponse.json({
        yield: cachedYield,
        symbol: '%',
        timestamp: Date.now(),
        cached: true,
        error: 'Using cached yield',
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch 10Y Treasury yield' },
      { status: 500 }
    );
  }
}
