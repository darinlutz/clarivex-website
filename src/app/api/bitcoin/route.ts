import { NextResponse } from 'next/server';

interface CoinGeckoResponse {
  bitcoin: {
    usd: number;
  };
}

let cachedPrice: number | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 30000; // 30 seconds

export async function GET() {
  try {
    // Check cache
    const now = Date.now();
    if (cachedPrice && now - cacheTime < CACHE_DURATION) {
      return NextResponse.json({
        price: cachedPrice,
        symbol: 'USD',
        timestamp: now,
        cached: true,
      });
    }

    // Fetch from CoinGecko API
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      { next: { revalidate: 30 } }
    );

    if (!response.ok) {
      throw new Error('CoinGecko API error');
    }

    const data: CoinGeckoResponse = await response.json();
    const price = data.bitcoin.usd;

    // Update cache
    cachedPrice = price;
    cacheTime = now;

    return NextResponse.json({
      price,
      symbol: 'USD',
      timestamp: now,
      cached: false,
    });
  } catch (error) {
    console.error('Bitcoin API error:', error);

    // Return cached price even if fetch fails
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
      { error: 'Failed to fetch Bitcoin price' },
      { status: 500 }
    );
  }
}
