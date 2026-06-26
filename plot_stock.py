"""Generates a closing-price chart for a stock ticker using live Alpha Vantage data.

Usage:
    python plot_stock.py --ticker AAPL --days 365 [--title "AAPL Stock Price"]

Reads the Alpha Vantage API key from the ALPHA_VANTAGE_API_KEY environment
variable. Prints a single line of JSON to stdout: either
{"image": "<base64-encoded PNG>"} on success or {"error": "<message>"} on
failure (with a non-zero exit code).
"""

import argparse
import base64
import io
import json
import os
import sys

import matplotlib

matplotlib.use('Agg')

import matplotlib.pyplot as plt
import pandas as pd
import requests


def fetch_daily_closes(ticker: str, api_key: str) -> pd.DataFrame:
    response = requests.get(
        'https://www.alphavantage.co/query',
        params={
            'function': 'TIME_SERIES_DAILY',
            'symbol': ticker,
            'apikey': api_key,
            'outputsize': 'compact',
        },
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()

    for key in ('Error Message', 'Note', 'Information'):
        if key in data:
            raise RuntimeError(data[key])

    series = data.get('Time Series (Daily)')
    if not series:
        raise RuntimeError(f'No time series data found for ticker "{ticker}".')

    rows = [
        {'Date': pd.to_datetime(date), 'Close': float(values['4. close'])}
        for date, values in series.items()
    ]
    return pd.DataFrame(rows).sort_values('Date')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--ticker', required=True)
    parser.add_argument('--days', type=int, default=365)
    parser.add_argument('--title', default=None)
    args = parser.parse_args()

    api_key = os.environ.get('ALPHA_VANTAGE_API_KEY')
    if not api_key:
        print(json.dumps({'error': 'ALPHA_VANTAGE_API_KEY is not configured'}))
        sys.exit(1)

    try:
        df = fetch_daily_closes(args.ticker, api_key)
    except Exception as exc:
        print(json.dumps({'error': str(exc)}))
        sys.exit(1)

    cutoff = df['Date'].max() - pd.Timedelta(days=args.days)
    df = df[df['Date'] >= cutoff]

    ticker_label = args.ticker.upper()
    title = args.title or f'{ticker_label} Closing Stock Price'

    plt.figure(figsize=(12, 6))
    plt.plot(df['Date'], df['Close'], label=f'{ticker_label} Closing Price', color='blue')
    plt.title(title)
    plt.xlabel('Date')
    plt.ylabel('Closing Price (USD)')
    plt.grid(True)
    plt.legend()
    plt.xticks(rotation=45)
    plt.tight_layout()

    buffer = io.BytesIO()
    plt.savefig(buffer, format='png')
    plt.close()
    buffer.seek(0)
    encoded = base64.b64encode(buffer.read()).decode('ascii')

    print(json.dumps({'image': encoded}))


if __name__ == '__main__':
    main()
