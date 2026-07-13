"""Looks up the financial institution name for a hardcoded list of ABA
routing numbers using the APIVerve Routing Number Lookup API.

Reads the APIVerve API key from the APIVERVE_API_KEY environment variable.
"""

import json
import os
import urllib.error
import urllib.parse
import urllib.request

ROUTING_NUMBERS = [
    "488124167",
    "111000641"
]

API_URL = "https://api.apiverve.com/v1/routinglookup"


def lookup_bank(routing_number: str, api_key: str) -> str:
    query = urllib.parse.urlencode({"routing": routing_number})
    request = urllib.request.Request(
        f"{API_URL}?{query}",
        headers={"X-API-Key": api_key},
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")

    payload = json.loads(body)

    if payload.get("status") != "ok":
        raise RuntimeError(payload.get("error") or "Unknown API error")

    return payload["data"]["bank"]


def main() -> None:
    api_key = os.environ.get("APIVERVE_API_KEY")
    if not api_key:
        print("Error: APIVERVE_API_KEY environment variable is not set.")
        return

    for routing_number in ROUTING_NUMBERS:
        try:
            bank_name = lookup_bank(routing_number, api_key)
            print(f"{routing_number}: {bank_name}")
        except Exception as exc:
            print(f"{routing_number}: Error - {exc}")


if __name__ == "__main__":
    main()
