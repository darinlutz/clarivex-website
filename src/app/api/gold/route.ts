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

let cachedPrice: number | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 30000; // 30 seconds

export async function GET() {
  try {
    const now = Date.now();
    if (cachedPrice && now - cacheTime < CACHE_DURATION) {
      return NextResponse.json({
        price: cachedPrice,
        symbol: 'USD',
        timestamp: now,
        cached: true,
      });
    }

    // GC=F is the Yahoo Finance ticker for gold futures (COMEX). No API key
    // required.
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/GC=F',
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 30 },
      }
    );

    if (!response.ok) {
      throw new Error('Yahoo Finance API error');
    }

    const data: YahooFinanceChartResponse = await response.json();
    const price = data.chart.result?.[0]?.meta.regularMarketPrice;

    if (typeof price !== 'number') {
      throw new Error('No gold price data available');
    }

    cachedPrice = price;
    cacheTime = now;

    return NextResponse.json({
      price,
      symbol: 'USD',
      timestamp: now,
      cached: false,
    });
  } catch (error) {
    console.error('Gold API error:', error);

    if (cachedPrice) {
      return NextResponse.json({
        price: cachedPrice,
        symbol: 'USD',
        timestamp: Date.now(),
        cached: true,
        error: 'Using cached price',
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch gold price' },
      { status: 500 }
    );
  }
}
