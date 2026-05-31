# Result analysis pipeline (May competition)

Ported from the April edition and repointed at the `may_*` Supabase tables and the
May Chernobyl challenge contexts. Produces a ranked leaderboard from competition data.

## Prerequisites

- Python 3 (stdlib only — no pip installs needed) and `curl`
- Supabase service role key + URL (from `.env.local`)
- `COACH_API_KEY` for the prompt-evaluation API (`prompttheflag.com/api/v1/evaluate`)

```bash
# Load Supabase creds from .env.local
export $(grep -v '^#' .env.local | grep -v '^$' | xargs)
export COACH_API_KEY=...   # only needed for step 2
```

## Pipeline

Run in order. All output lands in `../data/`.

```bash
python3 scripts/1_fetch_metrics.py      # → data/metrics.json
python3 scripts/2_evaluate_prompts.py   # → data/evaluations.json + evaluations_raw.json
python3 scripts/3_build_leaderboard.py  # → data/leaderboard_<weights>_<ts>.csv
```

1. **`1_fetch_metrics.py`** — pulls hard metrics (solve time per round, message count,
   token usage, hint clicks, passcode attempts) for every solver, plus how far each
   DNF participant got. Filters out pre-competition test logins via `COMPETITION_START`.

2. **`2_evaluate_prompts.py`** — scores each solver's user-messages through the v2
   evaluation API (9 req/s, concurrent, auto-retry). **Resumable** — rerun to pick up
   where it left off and retry any failures.

3. **`3_build_leaderboard.py`** — combines metrics + evaluations, computes 7 scoring
   methods (rank, z-score, percentile, log-norm, inverse-prop, tiered, geomean),
   averages them, and writes a ranked CSV.

   ```bash
   python3 scripts/3_build_leaderboard.py            # equal weights (0.25 each)
   python3 scripts/3_build_leaderboard.py 0.3 0.3 0.3 0.1   # time msgs tokens quality
   python3 scripts/3_build_leaderboard.py --no-gated  # exclude gated prompts from quality avg
   ```

## Helper

- **`retry_failed.py`** — standalone retry pass over API-failed evaluations in
  `data/evaluations.json`. Usually unnecessary since step 2 retries on each run.

## Adapting for the next month's fork

- Update `COMPETITION_START` in `1_fetch_metrics.py` and `2_evaluate_prompts.py`
  (match `lib/config.ts`).
- Swap the `may_` table prefixes to the new month.
- Rewrite the `CONTEXTS` dict in `2_evaluate_prompts.py` (and `retry_failed.py`) to
  describe the new rounds' goals.
