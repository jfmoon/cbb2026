"""
NCAA Tournament Odds Scraper — Action Network API Edition
----------------------------------------------------------
Uses Action Network's direct REST API — no Playwright, no buildId, no HTML scraping.

API: api.actionnetwork.com/web/v2/scoreboard/ncaab
     ?bookIds=68&date=YYYYMMDD&division=D1&periods=event&tournament=0

Writes odds.json to GCS in the format the React app expects.

Local test:
    pip3 install requests google-cloud-storage
    python3 odds_scraper.py
"""

import json
import os
import sys
import requests
from datetime import datetime, timezone
from google.cloud import storage
from team_names import resolve_with_warning

# ── Config ────────────────────────────────────────────────────────────────────
GCS_BUCKET      = os.environ.get("GCS_BUCKET",      "cbb-scores-490420")
GCS_ODDS_OBJECT = os.environ.get("GCS_ODDS_OBJECT", "odds.json")

# DraftKings book ID on Action Network
DK_BOOK_ID = "68"

# Tournament dates (First Four through Championship)
TOURNAMENT_DATES = [
    "20260317", "20260318",  # First Four
    "20260319", "20260320",  # First Round
    "20260321", "20260322",  # Round of 32
    "20260327", "20260328",  # Sweet 16
    "20260329", "20260330",  # Elite 8
    "20260403",              # Final Four
    "20260405",              # Championship
]

API_URL = (
    "https://api.actionnetwork.com/web/v2/scoreboard/ncaab"
    "?bookIds={book}&date={date}&division=D1&periods=event&tournament=0"
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept":          "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer":         "https://www.actionnetwork.com/",
}

# ── fix #12: publish guard thresholds ────────────────────────────────────────
# Require at least this many parsed games total across all tournament dates.
# The full field has 67 games; we lower the bar to account for early rounds
# or days when most games are not yet posted.
MIN_GAMES_TO_PUBLISH = 4
# Of those parsed, at least this fraction must have real lines (ok=True).
MIN_OK_FRACTION      = 0.5
# ── end thresholds ────────────────────────────────────────────────────────────


def fmt_ml(v):
    """Format moneyline: 125 → '+125', -110 → '-110'"""
    if v is None: return ""
    return f"+{v}" if v > 0 else str(v)

def fmt_spread(v):
    """Format spread: 2.5 → '+2.5', -1.5 → '-1.5'"""
    if v is None: return "TBD"
    return f"+{v}" if v > 0 else str(v)

# ── Fetch ─────────────────────────────────────────────────────────────────────
def fetch_games_for_date(date):
    url = API_URL.format(book=DK_BOOK_ID, date=date)
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        return r.json().get("games", [])
    except Exception as e:
        print(f"  [warn] {date}: {e}", file=sys.stderr)
        return []

# ── Parse ─────────────────────────────────────────────────────────────────────
def parse_game(game):
    teams = game.get("teams", [])
    if len(teams) < 2:
        return None

    # Use IDs to find teams — teams[] order is NOT guaranteed
    away_id   = game.get("away_team_id")
    home_id   = game.get("home_team_id")
    away_team = next((t for t in teams if t.get("id") == away_id), teams[0])
    home_team = next((t for t in teams if t.get("id") == home_id), teams[1])
    away_name = resolve_with_warning(away_team.get("full_name", ""), "AN")
    home_name = resolve_with_warning(home_team.get("full_name", ""), "AN")
    date      = (game.get("start_time") or "")[:10]

    # Get DK markets (already filtered to bookId=68 in API call)
    markets = game.get("markets", {})
    dk_mkt  = None
    for v in markets.values():
        cand = v.get("event", {})
        # fix #13: explicitly validate that spread and moneyline arrays exist and are non-empty
        if (isinstance(cand.get("spread"), list) and len(cand["spread"]) >= 2
                and isinstance(cand.get("moneyline"), list) and len(cand["moneyline"]) >= 2):
            dk_mkt = cand
            break

    if not dk_mkt:
        return {
            "away": away_name, "home": home_name,
            "away_spread": "TBD", "home_spread": "TBD",
            "away_ml": "", "home_ml": "",
            "ou": "TBD", "ok": False, "date": date,
        }

    spread_map = {s["team_id"]: s for s in dk_mkt.get("spread", [])}
    ml_map     = {m["team_id"]: m for m in dk_mkt.get("moneyline", [])}
    ou_val     = next((t["value"] for t in dk_mkt.get("total", [])
                       if t.get("side") == "over"), None)

    return {
        "away":       away_name,
        "home":       home_name,
        "away_spread": fmt_spread(spread_map.get(away_id, {}).get("value")),
        "home_spread": fmt_spread(spread_map.get(home_id, {}).get("value")),
        "away_ml":    fmt_ml(ml_map.get(away_id, {}).get("odds")),
        "home_ml":    fmt_ml(ml_map.get(home_id, {}).get("odds")),
        "ou":         str(ou_val) if ou_val is not None else "TBD",
        "ok":         True,
        "date":       date,
    }

# ── Build lookup ──────────────────────────────────────────────────────────────
def build_lookup(parsed):
    """
    Team-keyed dict matching App.jsx ODDS format:
    { "Duke": { s:"-29.5", ml:"-20000", ou:"136.5", ok:true, date:"2026-03-19" } }
    """
    lookup = {}
    for g in parsed:
        if not g:
            continue
        lookup[g["away"]] = {
            "s": g["away_spread"], "ml": g["away_ml"],
            "ou": g["ou"], "ok": g["ok"], "date": g["date"],
        }
        lookup[g["home"]] = {
            "s": g["home_spread"], "ml": g["home_ml"],
            "ou": g["ou"], "ok": g["ok"], "date": g["date"],
        }
    return lookup


# ── fix #12: publish guard ────────────────────────────────────────────────────
def validate_before_publish(parsed: list) -> None:
    """
    Raise RuntimeError if the scraped dataset looks suspiciously thin or broken.
    This prevents a bad Action Network response from overwriting good odds.json.
    """
    if len(parsed) < MIN_GAMES_TO_PUBLISH:
        raise RuntimeError(
            f"[FATAL] Publish guard: only {len(parsed)} games parsed "
            f"(minimum required: {MIN_GAMES_TO_PUBLISH}). "
            "Refusing to overwrite odds.json with likely-empty data."
        )

    ok_count = sum(1 for p in parsed if p.get("ok"))
    ok_frac  = ok_count / len(parsed)
    if ok_frac < MIN_OK_FRACTION:
        raise RuntimeError(
            f"[FATAL] Publish guard: only {ok_count}/{len(parsed)} games have real lines "
            f"({ok_frac:.0%} < required {MIN_OK_FRACTION:.0%}). "
            "Refusing to overwrite odds.json — Action Network may have returned partial data."
        )

    print(f"  [ok] Publish guard passed: {len(parsed)} games, {ok_count} with lines ({ok_frac:.0%})")
# ── end fix #12 ───────────────────────────────────────────────────────────────


# ── GCS write ─────────────────────────────────────────────────────────────────
def write_to_gcs(lookup):
    payload = {
        "updated":    datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source":     "api.actionnetwork.com / DraftKings",
        "team_count": len(lookup),
        "odds":       lookup,
    }
    client = storage.Client()
    bucket = client.bucket(GCS_BUCKET)
    blob   = bucket.blob(GCS_ODDS_OBJECT)
    blob.upload_from_string(
        json.dumps(payload, indent=2).encode(),
        content_type="application/json",
    )
    blob.make_public()
    print(f"[ok] {len(lookup)} teams → gs://{GCS_BUCKET}/{GCS_ODDS_OBJECT}")
    print(f"[ok] {blob.public_url}")

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print(f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')} UTC] "
          f"Action Network odds (api.actionnetwork.com)")

    all_games = []
    seen      = set()
    for date in TOURNAMENT_DATES:
        games = fetch_games_for_date(date)
        new   = [g for g in games if g.get("id") not in seen]
        for g in new:
            seen.add(g["id"])
        all_games.extend(new)
        if new:
            print(f"  {date}: {len(new)} games")

    print(f"  Total unique games: {len(all_games)}")

    parsed  = [p for p in (parse_game(g) for g in all_games) if p]
    posted  = sum(1 for p in parsed if p["ok"])
    pending = sum(1 for p in parsed if not p["ok"])
    print(f"  {posted} games with lines, {pending} pending")

    for p in sorted(parsed, key=lambda x: x["date"]):
        if p["ok"]:
            print(f"    {p['date']} | {p['away']} {p['away_spread']}({p['away_ml']}) "
                  f"@ {p['home']} {p['home_spread']}({p['home_ml']})  O/U {p['ou']}")
        else:
            print(f"    {p['date']} | {p['away']} @ {p['home']}  [lines pending]")

    # fix #12: validate before touching GCS
    validate_before_publish(parsed)

    write_to_gcs(build_lookup(parsed))

if __name__ == "__main__":
    main()
