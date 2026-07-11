"""Looks up the financial institution name for a hardcoded list of ABA
routing numbers using the APIVerve Routing Number Lookup API.

Reads the APIVerve API key from the APIVERVE_API_KEY environment variable.
"""

import os

import requests

ROUTING_NUMBERS = [
    "283079227",
    "111000025",
    "111900659"
]

API_URL = "https://api.apiverve.com/v1/routinglookup"


def lookup_bank(routing_number: str, api_key: str) -> str:
    response = requests.get(
        API_URL,
        params={"routing": routing_number},
        headers={"X-API-Key": api_key},
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()

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
