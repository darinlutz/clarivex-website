import requests
from datetime import datetime, timezone, timedelta, date

API_KEY = "ODkyYzI3YmYtZDAxMC00MTA1LWIxZGQtOGNhM2E4ZDhlOWJh"
WORKSPACE_ID = "5f5fb2a73ab33d735bc7ca3a"

PROJECT_NAME = "AZ"
DESCRIPTION = "test project"

START_DATE = date(2026, 6, 1)
END_DATE   = date(2026, 6, 30)

# UTC offset for your local timezone (e.g. -7 for MST, -5 for EST)
UTC_OFFSET_HOURS = -5

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


def get_project_id():
    url = f"{BASE_URL}/workspaces/{WORKSPACE_ID}/projects"
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    projects = response.json()
    for project in projects:
        if project["name"].strip().upper() == PROJECT_NAME.strip().upper():
            return project["id"]
    raise ValueError(f"Project '{PROJECT_NAME}' not found. Available: {[p['name'] for p in projects]}")


def create_time_entry(project_id, log_date):
    offset = timezone(timedelta(hours=UTC_OFFSET_HOURS))
    start_local = datetime(log_date.year, log_date.month, log_date.day, 8, 0, 0, tzinfo=offset)
    end_local   = datetime(log_date.year, log_date.month, log_date.day, 16, 0, 0, tzinfo=offset)
    start_utc = start_local.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    end_utc   = end_local.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    payload = {
        "start": start_utc,
        "end": end_utc,
        "description": DESCRIPTION,
        "projectId": project_id,
        "billable": False,
    }

    url = f"{BASE_URL}/workspaces/{WORKSPACE_ID}/time-entries"
    response = requests.post(url, headers=HEADERS, json=payload)
    response.raise_for_status()
    return response.json()


if __name__ == "__main__":
    days = list(workdays_in_range(START_DATE, END_DATE))
    print(f"Date range: {START_DATE} → {END_DATE}")
    print(f"Workdays to log: {len(days)}")
    print()

    print("Looking up project ID...")
    project_id = get_project_id()
    print(f"Found project '{PROJECT_NAME}' → {project_id}")
    print()

    for d in days:
        entry = create_time_entry(project_id, d)
        print(f"  Created: {d.strftime('%a %Y-%m-%d')}  ({entry['id']})")

    print()
    print(f"Done — {len(days)} entries created.")
