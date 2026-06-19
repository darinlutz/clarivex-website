import argparse
import os
import sys
import requests
from datetime import datetime, timezone, timedelta, date

API_KEY = os.environ.get("CLOCKIFY_API_KEY")
WORKSPACE_ID = "5f5fb2a73ab33d735bc7ca3a"

DEFAULT_PROJECT_NAME = "AZ"
DEFAULT_DESCRIPTION = "AZ Incident Tracking, AZ Portal front-end updates"

DEFAULT_START_DATE = date(2026, 5, 26)
DEFAULT_END_DATE = date(2026, 7, 3)

# UTC offset for your local timezone (e.g. -7 for MST, -5 for EST)
UTC_OFFSET_HOURS = -6

BASE_URL = "https://api.clockify.me/api/v1"
HEADERS = {
    "X-Api-Key": API_KEY,
    "Content-Type": "application/json",
}

# US federal holidays (static list — update yearly as needed)
FEDERAL_HOLIDAYS = {
    date(2026, 1, 1),   # New Year's Day
    date(2026, 5, 25),  # Memorial Day
    date(2026, 7, 4),   # Independence Day
    date(2026, 9, 7),   # Labor Day
    date(2026, 11, 26), # Thanksgiving
    date(2026, 12, 25), # Christmas
}


def is_workday(d):
    if d.weekday() >= 5:  # 5=Saturday, 6=Sunday
        return False
    if d in FEDERAL_HOLIDAYS:
        return False
    return True


def workdays_in_range(start, end):
    current = start
    while current <= end:
        if is_workday(current):
            yield current
        current += timedelta(days=1)


def get_project_id(project_name):
    url = f"{BASE_URL}/workspaces/{WORKSPACE_ID}/projects"
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    projects = response.json()
    for project in projects:
        if project["name"].strip().upper() == project_name.strip().upper():
            return project["id"]
    raise ValueError(f"Project '{project_name}' not found. Available: {[p['name'] for p in projects]}")


def create_time_entry(project_id, log_date, description):
    offset = timezone(timedelta(hours=UTC_OFFSET_HOURS))
    start_local = datetime(log_date.year, log_date.month, log_date.day, 8, 0, 0, tzinfo=offset)
    end_local   = datetime(log_date.year, log_date.month, log_date.day, 16, 0, 0, tzinfo=offset)
    start_utc = start_local.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    end_utc   = end_local.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    payload = {
        "start": start_utc,
        "end": end_utc,
        "description": description,
        "projectId": project_id,
        "billable": False,
    }

    url = f"{BASE_URL}/workspaces/{WORKSPACE_ID}/time-entries"
    response = requests.post(url, headers=HEADERS, json=payload)
    response.raise_for_status()
    return response.json()


def parse_args():
    parser = argparse.ArgumentParser(description="Create Clockify time entries for a date range.")
    parser.add_argument("--start", dest="start", help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end", dest="end", help="End date (YYYY-MM-DD)")
    parser.add_argument("--project", dest="project", help="Clockify project name")
    parser.add_argument("--description", dest="description", help="Time entry description")
    args = parser.parse_args()

    start_date = date.fromisoformat(args.start) if args.start else DEFAULT_START_DATE
    end_date = date.fromisoformat(args.end) if args.end else DEFAULT_END_DATE
    project_name = args.project if args.project else DEFAULT_PROJECT_NAME
    description = args.description if args.description else DEFAULT_DESCRIPTION
    return start_date, end_date, project_name, description


if __name__ == "__main__":
    if not API_KEY:
        print("Error: CLOCKIFY_API_KEY environment variable is not set.", file=sys.stderr)
        sys.exit(1)

    start_date, end_date, project_name, description = parse_args()
    if start_date > end_date:
        print("Error: start date must not be after end date.", file=sys.stderr)
        sys.exit(1)

    days = list(workdays_in_range(start_date, end_date))
    print(f"Date range: {start_date} → {end_date}")
    print(f"Workdays to log: {len(days)}")
    print()

    print("Looking up project ID...")
    project_id = get_project_id(project_name)
    print(f"Found project '{project_name}' → {project_id}")
    print()

    for d in days:
        entry = create_time_entry(project_id, d, description)
        print(f"  Created: {d.strftime('%a %Y-%m-%d')}  ({entry['id']})")

    print()
    print(f"Done — {len(days)} entries created.")
