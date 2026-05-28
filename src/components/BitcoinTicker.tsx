'use client';

import { useEffect, useState } from 'react';

interface BitcoinPrice {
  price: number;
  symbol: string;
  timestamp: number;
}

export default function BitcoinTicker() {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchBitcoinPrice = async () => {
    try {
      const response = await fetch('/api/bitcoin');
      if (!response.ok) throw new Error('Failed to fetch Bitcoin price');

      const data: BitcoinPrice = await response.json();
      setPrice(data.price);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price');
      console.error('Bitcoin price fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBitcoinPrice();

    // Poll every 30 seconds
    const interval = setInterval(fetchBitcoinPrice, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-r from-secondary-dark to-tertiary-dark border border-powder-500 rounded-lg p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm uppercase tracking-wide mb-2">Bitcoin Price</p>
          {loading && !price ? (
            <div className="animate-pulse h-8 bg-powder-500/20 w-32 rounded"></div>
          ) : error ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : price !== null ? (
            <div>
              <p className="text-3xl font-bold bg-gradient-to-r from-powder-400 to-powder-300 bg-clip-text text-transparent">
                ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {lastUpdate && (
                <p className="text-xs text-slate-500 mt-1">
                  Updated: {lastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>
          ) : null}
        </div>

        {/* Bitcoin Icon */}
        <div className="w-16 h-16 bg-gradient-to-br from-powder-400 to-powder-600 rounded-full flex items-center justify-center shadow-lg">
          <svg
            className="w-10 h-10 text-primary-dark"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8m3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5m-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11m3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
          </svg>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="mt-4 pt-4 border-t border-powder-500/30">
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live updates every 30 seconds</span>
        </div>
      </div>
    </div>
  );
}
