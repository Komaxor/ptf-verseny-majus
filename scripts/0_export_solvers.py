#!/usr/bin/env python3
"""
Export all solvers to a CSV: email,name (name → UNKNOWN if missing).
Saves to data/solvers.csv

Usage:
  export $(grep -v '^#' .env.local | grep -v '^$' | xargs)
  python3 scripts/0_export_solvers.py
"""

import csv
import json
import os
import ssl
import urllib.request
from pathlib import Path

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
SSL_CTX = ssl.create_default_context()
OUT = Path(__file__).parent.parent / "data" / "solvers.csv"

# Competition start (UTC). Excludes pre-competition test logins.
# Matches COMPETITION_START in lib/config.ts (May 31, 2026, 15:00 CEST = 13:00 UTC).
COMPETITION_START = "2026-05-31T13:00:00Z"


def supabase_get(path):
    all_rows = []
    offset = 0
    while True:
        sep = "&" if "?" in path else "?"
        url = f"{SUPABASE_URL}/rest/v1/{path}{sep}limit=1000&offset={offset}"
        req = urllib.request.Request(url, headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        })
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=30) as resp:
            rows = json.loads(resp.read())
        all_rows.extend(rows)
        if len(rows) < 1000:
            break
        offset += 1000
    return all_rows


def main():
    print("Fetching solvers...")
    users = supabase_get(
        "may_competition_users"
        "?is_solved=eq.true"
        f"&first_login_at=gte.{COMPETITION_START}"
        "&select=email,username,solved_at"
        "&order=solved_at.asc"
    )
    print(f"  {len(users)} solvers")

    OUT.parent.mkdir(exist_ok=True)
    with open(OUT, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["email", "name"])
        for u in users:
            email = (u.get("email") or "").strip()
            name = (u.get("username") or "").strip() or "UNKNOWN"
            w.writerow([email, name])

    print(f"\nSaved {len(users)} solvers to {OUT}")


if __name__ == "__main__":
    main()
