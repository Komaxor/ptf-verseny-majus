#!/usr/bin/env python3
"""
Fetch hard metrics (time, messages, tokens) from Supabase for all competition solvers.
Saves to data/metrics.json

Usage:
  export $(grep -v '^#' .env.local | grep -v '^$' | xargs)
  python3 scripts/1_fetch_metrics.py
"""

import json
import os
import ssl
import urllib.request
from collections import defaultdict
from pathlib import Path

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
SSL_CTX = ssl.create_default_context()
OUT = Path(__file__).parent.parent / "data" / "metrics.json"

# Competition start (UTC). Used to exclude pre-competition test logins.
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
    print("Fetching users...")
    users = supabase_get(
        "may_competition_users"
        "?is_solved=eq.true"
        f"&first_login_at=gte.{COMPETITION_START}"
        "&select=id,username,email,generated_password,first_login_at,solved_at,"
        "round1_time_ms,round2_time_ms,round3_time_ms,"
        "total_chat_messages,total_hint_clicks,total_passcode_attempts"
        "&order=solved_at.asc"
    )
    print(f"  {len(users)} solvers")

    ids = [u["id"] for u in users]
    id_str = ",".join(ids)

    print("Fetching token usage from chat messages...")
    msgs = supabase_get(
        f"may_chat_messages"
        f"?role=eq.assistant"
        f"&select=user_id,total_tokens"
        f"&user_id=in.({id_str})"
    )

    token_totals = defaultdict(int)
    for m in msgs:
        token_totals[m["user_id"]] += m["total_tokens"] or 0

    print("Fetching DNF users...")
    dnf_users = supabase_get(
        "may_competition_users"
        "?is_solved=eq.false"
        f"&first_login_at=gte.{COMPETITION_START}"
        "&select=id,generated_password"
    )
    dnf_ids = [u["id"] for u in dnf_users]
    dnf_id_str = ",".join(dnf_ids) if dnf_ids else ""

    dnf_states = []
    if dnf_id_str:
        dnf_states = supabase_get(
            f"may_game_state?user_id=in.({dnf_id_str})&select=user_id,current_phase"
        )

    phase_to_round = {
        "VIDEO_INTRO": 0, "ROUND_1": 1, "VIDEO_1_2": 1,
        "ROUND_2": 2, "VIDEO_2_3": 2, "ROUND_3": 3,
        "VIDEO_OUTRO": 3, "SUCCESS": 3,
    }
    state_map = {s["user_id"]: s["current_phase"] for s in dnf_states}

    # Build output
    solved = []
    for u in users:
        uid = u["id"]
        r1 = u["round1_time_ms"] or 0
        r2 = u["round2_time_ms"] or 0
        r3 = u["round3_time_ms"] or 0
        solved.append({
            "id": uid,
            "generated_password": u["generated_password"],
            "username": u["username"],
            "email": u["email"],
            "solve_time_s": round((r1 + r2 + r3) / 1000, 1),
            "round1_time_s": round(r1 / 1000, 1),
            "round2_time_s": round(r2 / 1000, 1),
            "round3_time_s": round(r3 / 1000, 1),
            "message_count": u["total_chat_messages"] or 0,
            "token_count": token_totals.get(uid, 0),
            "hint_clicks": u["total_hint_clicks"] or 0,
            "passcode_attempts": u["total_passcode_attempts"] or 0,
        })

    not_solved = []
    for u in dnf_users:
        phase = state_map.get(u["id"])
        rnd = phase_to_round.get(phase, 0) if phase else 0
        not_solved.append({
            "generated_password": u["generated_password"],
            "round": rnd,
        })
    not_solved.sort(key=lambda x: -x["round"])

    output = {"solved": solved, "not_solved": not_solved}
    OUT.parent.mkdir(exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nSaved {len(solved)} solvers + {len(not_solved)} DNF to {OUT}")
    if solved:
        print(f"  Time range: {min(s['solve_time_s'] for s in solved):.0f}s – {max(s['solve_time_s'] for s in solved):.0f}s")
        print(f"  Msg range:  {min(s['message_count'] for s in solved)} – {max(s['message_count'] for s in solved)}")
        print(f"  Token range: {min(s['token_count'] for s in solved):,} – {max(s['token_count'] for s in solved):,}")


if __name__ == "__main__":
    main()
