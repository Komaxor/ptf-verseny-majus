#!/usr/bin/env python3
"""
Assemble leaderboard CSV from metrics + evaluations.
Reads:
  data/metrics.json      (from 1_fetch_metrics.py)
  data/evaluations.json  (from 2_evaluate_prompts.py)
Writes:
  data/leaderboard_YYYYMMDD_HHMMSS.csv

Computes 7 scoring methods, averages them, sorts by average.
Weights are configurable via command line args.

Usage:
  python3 scripts/3_build_leaderboard.py                    # equal weights (0.25 each)
  python3 scripts/3_build_leaderboard.py 0.3 0.3 0.3 0.1   # custom weights
"""

import json
import math
import sys
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).parent.parent / "data"
METRICS_FILE = BASE / "metrics.json"
EVALS_FILE = BASE / "evaluations.json"


def load(path):
    with open(path) as f:
        return json.load(f)


# --- 7 scoring methods (all return list of 0-100, higher=better) ---

def min_max(vals, lower_better=True):
    mn, mx = min(vals), max(vals)
    if mx == mn:
        return [100.0] * len(vals)
    if lower_better:
        return [100.0 * (1.0 - (v - mn) / (mx - mn)) for v in vals]
    return [100.0 * (v - mn) / (mx - mn) for v in vals]


def rank_based(vals, lower_better=True):
    n = len(vals)
    order = sorted(range(n), key=lambda i: vals[i], reverse=not lower_better)
    scores = [0.0] * n
    for pos, idx in enumerate(order):
        scores[idx] = 100.0 * (1.0 - pos / (n - 1)) if n > 1 else 100.0
    return scores


def z_score(vals, lower_better=True):
    mean = sum(vals) / len(vals)
    std = (sum((v - mean) ** 2 for v in vals) / len(vals)) ** 0.5
    if std == 0:
        return [50.0] * len(vals)
    zs = [-(v - mean) / std if lower_better else (v - mean) / std for v in vals]
    mn, mx = min(zs), max(zs)
    if mx == mn:
        return [50.0] * len(vals)
    return [100.0 * (z - mn) / (mx - mn) for z in zs]


def percentile(vals, lower_better=True):
    n = len(vals)
    result = []
    for v in vals:
        if lower_better:
            worse = sum(1 for x in vals if x > v)
        else:
            worse = sum(1 for x in vals if x < v)
        result.append(100.0 * worse / (n - 1) if n > 1 else 100.0)
    return result


def log_norm(vals, lower_better=True):
    safe = [max(v, 1) for v in vals]
    logs = [math.log(v) for v in safe]
    mn, mx = min(logs), max(logs)
    if mx == mn:
        return [100.0] * len(vals)
    if lower_better:
        return [100.0 * (1.0 - (lg - mn) / (mx - mn)) for lg in logs]
    return [100.0 * (lg - mn) / (mx - mn) for lg in logs]


def inverse_prop(vals, lower_better=True):
    if lower_better:
        mn = min(max(v, 1) for v in vals)
        return [100.0 * mn / max(v, 1) for v in vals]
    mx = max(max(v, 1) for v in vals)
    return [100.0 * v / mx for v in vals]


def tiered(vals, brackets, lower_better=True):
    """Generic tiered scoring. brackets = [(threshold, score), ...] ordered."""
    result = []
    for v in vals:
        score = brackets[-1][1] if brackets else 10.0
        for threshold, s in brackets:
            if lower_better and v < threshold:
                score = s
                break
            elif not lower_better and v >= threshold:
                score = s
                break
        result.append(float(score))
    return result


TIME_TIERS = [(300000, 100), (600000, 85), (900000, 70), (1200000, 55), (1800000, 40), (2700000, 25), (999999999, 10)]
MSG_TIERS = [(6, 100), (9, 85), (13, 70), (18, 55), (26, 40), (36, 25), (999999, 10)]
TOK_TIERS = [(15000, 100), (25000, 85), (40000, 70), (60000, 55), (90000, 40), (120000, 25), (999999999, 10)]
QUAL_TIERS = [(50, 100), (45, 85), (40, 70), (35, 55), (30, 40), (25, 25), (0, 10)]


def _quality_score(eval_data, no_gated):
    if not no_gated:
        return eval_data.get("avg_score", 0.0)
    details = eval_data.get("details", [])
    scores = [d["score"] for d in details if d.get("gate") != "non-prompt" and d.get("score") is not None]
    return sum(scores) / len(scores) if scores else 0.0


def main():
    # Check for --no-gated flag
    args = [a for a in sys.argv[1:] if a != "--no-gated"]
    no_gated = "--no-gated" in sys.argv

    # Parse weights
    if len(args) == 4:
        Wt, Wm, Wk, Wq = [float(x) for x in args]
    else:
        Wt, Wm, Wk, Wq = 0.25, 0.25, 0.25, 0.25

    assert abs(Wt + Wm + Wk + Wq - 1.0) < 0.001, f"Weights must sum to 1.0, got {Wt+Wm+Wk+Wq}"

    print(f"Weights: time={Wt} msgs={Wm} tokens={Wk} quality={Wq}")

    metrics = load(METRICS_FILE)
    evals = load(EVALS_FILE)

    # Build user list
    users = []
    for u in metrics["solved"]:
        uid = u["id"]
        eval_data = evals.get(uid, {})
        users.append({
            "id": uid,
            "generated_password": u["generated_password"],
            "name": u["username"] or "(anonymous)",
            "email": u["email"] or "",
            "solve_time_s": u["solve_time_s"],
            "solve_time_ms": round(u["solve_time_s"] * 1000),
            "message_count": u["message_count"],
            "token_count": u["token_count"],
            "quality": _quality_score(eval_data, no_gated),
            "gated": eval_data.get("gated_count", 0),
            "failed": sum(1 for d in eval_data.get("details", []) if d.get("score") is None and d.get("gate") != "non-prompt"),
        })

    n = len(users)
    print(f"{n} solvers loaded")

    # Extract raw metric arrays (same order as users list)
    times = [u["solve_time_ms"] for u in users]
    msgs = [u["message_count"] for u in users]
    toks = [u["token_count"] for u in users]
    quals = [u["quality"] for u in users]

    # Compute all 7 methods
    methods = {}

    # 1. Rank-based
    st = rank_based(times, True); sm = rank_based(msgs, True)
    sk = rank_based(toks, True); sq = rank_based(quals, False)
    methods["w1_rank"] = [Wt*st[i] + Wm*sm[i] + Wk*sk[i] + Wq*sq[i] for i in range(n)]

    # 2. Z-score
    st = z_score(times, True); sm = z_score(msgs, True)
    sk = z_score(toks, True); sq = z_score(quals, False)
    methods["w2_zscore"] = [Wt*st[i] + Wm*sm[i] + Wk*sk[i] + Wq*sq[i] for i in range(n)]

    # 3. Percentile
    st = percentile(times, True); sm = percentile(msgs, True)
    sk = percentile(toks, True); sq = percentile(quals, False)
    methods["w3_pctile"] = [Wt*st[i] + Wm*sm[i] + Wk*sk[i] + Wq*sq[i] for i in range(n)]

    # 4. Log-normalized
    st = log_norm(times, True); sm = log_norm(msgs, True)
    sk = log_norm(toks, True); sq = log_norm(quals, False)
    methods["w4_log"] = [Wt*st[i] + Wm*sm[i] + Wk*sk[i] + Wq*sq[i] for i in range(n)]

    # 5. Inverse proportional
    st = inverse_prop(times, True); sm = inverse_prop(msgs, True)
    sk = inverse_prop(toks, True); sq = inverse_prop(quals, False)
    methods["w5_inverse"] = [Wt*st[i] + Wm*sm[i] + Wk*sk[i] + Wq*sq[i] for i in range(n)]

    # 6. Tiered
    st = tiered(times, TIME_TIERS, True); sm = tiered(msgs, MSG_TIERS, True)
    sk = tiered(toks, TOK_TIERS, True); sq = tiered(quals, QUAL_TIERS, False)
    methods["w6_tiered"] = [Wt*st[i] + Wm*sm[i] + Wk*sk[i] + Wq*sq[i] for i in range(n)]

    # 7. Geometric mean (using min-max normalized scores)
    st = min_max(times, True); sm = min_max(msgs, True)
    sk = min_max(toks, True); sq = min_max(quals, False)
    eps = 0.1
    methods["w7_geomean"] = [
        max(st[i], eps)**Wt * max(sm[i], eps)**Wm * max(sk[i], eps)**Wk * max(sq[i], eps)**Wq
        for i in range(n)
    ]

    # Average of all 7
    method_keys = list(methods.keys())
    for i, u in enumerate(users):
        for k in method_keys:
            u[k] = methods[k][i]
        u["avg_score"] = sum(u[k] for k in method_keys) / 7

    # Sort by average
    users.sort(key=lambda x: -x["avg_score"])

    # Write CSV
    weight_tag = f"{int(Wt*100)}_{int(Wm*100)}_{int(Wk*100)}_{int(Wq*100)}"
    gated_tag = "_nogated" if no_gated else ""
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = BASE / f"leaderboard_{weight_tag}{gated_tag}_{ts}.csv"

    cols = [
        "rank", "generated_password", "name", "email",
        "solve_time_s", "message_count", "token_count",
        "quality", "gated", "failed",
    ] + method_keys + ["avg_score"]

    lines = [",".join(cols)]
    for i, u in enumerate(users):
        row = [
            str(i + 1),
            u["generated_password"],
            u["name"],
            u["email"],
            f"{u['solve_time_s']:.1f}",
            str(u["message_count"]),
            str(u["token_count"]),
            f"{u['quality']:.1f}",
            str(u["gated"]),
            str(u["failed"]),
        ]
        row += [f"{u[k]:.2f}" for k in method_keys]
        row += [f"{u['avg_score']:.2f}"]
        lines.append(",".join(row))

    with open(out_path, "w") as f:
        f.write("\n".join(lines) + "\n")

    print(f"\nSaved to {out_path}")

    # Print top 20
    print(f"\n{'#':<3} {'Name':<28} {'Time':>6} {'Msg':>4} {'Tok':>6} {'Q':>5} {'G':>2} {'F':>2} {'AVG':>6}")
    print("=" * 68)
    for i, u in enumerate(users[:20]):
        print(
            f"{i+1:<3} {u['name']:<28} {u['solve_time_s']:>5.0f}s {u['message_count']:>4} "
            f"{u['token_count']:>6,} {u['quality']:>5.1f} {u['gated']:>2} {u['failed']:>2} {u['avg_score']:>6.1f}"
        )

    # Winner per method
    print(f"\n  Winner by method:")
    for k in method_keys:
        best = max(users, key=lambda x: x[k])
        print(f"    {k:<12}: {best['name']}")
    best_avg = users[0]
    print(f"    {'avg_score':<12}: {best_avg['name']}")

    # Sanity check: verify no user with strictly better hard metrics AND
    # only slightly worse quality is ranked lower (at these weights)
    print(f"\n  Sanity checks:")
    violations = 0
    for i, a in enumerate(users):
        for j, b in enumerate(users):
            if j <= i:
                continue
            # b is ranked lower than a. Check if b dominates a on hard metrics.
            b_faster = b["solve_time_s"] <= a["solve_time_s"]
            b_fewer_msgs = b["message_count"] <= a["message_count"]
            b_fewer_toks = b["token_count"] <= a["token_count"]
            hard_wins = sum([b_faster, b_fewer_msgs, b_fewer_toks])
            if hard_wins >= 2 and b["quality"] * (1 - Wq) < a["quality"] * (1 - Wq):
                # b is better on 2+ hard metrics — check if quality gap alone can explain rank
                quality_gap = a["quality"] - b["quality"]
                if quality_gap < 30 and hard_wins == 3:
                    violations += 1
                    if violations <= 5:
                        print(f"    WARNING: #{j+1} {b['name']} dominates #{i+1} {a['name']} "
                              f"on {hard_wins}/3 hard metrics but ranks lower "
                              f"(Q gap: {quality_gap:.1f})")
    if violations == 0:
        print(f"    All rankings consistent with weights")


if __name__ == "__main__":
    main()
