import { NextResponse } from 'next/server';

interface AlphaVantageWtiResponse {
  data?: { date: string; value: string }[];
}

let cachedPrice: number | null = null;
let cacheTime: number = 0;
// WTI is only priced once per trading day, and Alpha Vantage's free tier has
// a very small daily request quota, so cache aggressively.
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours

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

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      throw new Error('ALPHA_VANTAGE_API_KEY is not configured');
    }

    const response = await fetch(
      `https://www.alphavantage.co/query?function=WTI&interval=daily&apikey=${encodeURIComponent(apiKey)}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      throw new Error('Alpha Vantage API error');
    }

    const data: AlphaVantageWtiResponse = await response.json();
    // Alpha Vantage marks non-trading days with a "." placeholder value, so
    // take the first entry that actually has a number.
    const latest = data.data?.find((entry) => entry.value !== '.' && !Number.isNaN(parseFloat(entry.value)));

    if (!latest) {
      throw new Error('No WTI price data available');
    }

    const price = parseFloat(latest.value);

    cachedPrice = price;
    cacheTime = now;

    return NextResponse.json({
      price,
      symbol: 'USD',
      timestamp: now,
      cached: false,
    });
  } catch (error) {
    console.error('Oil API error:', error);

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
      { error: 'Failed to fetch WTI oil price' },
      { status: 500 }
    );
  }
}
