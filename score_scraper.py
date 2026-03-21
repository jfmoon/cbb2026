"""
NCAA Tournament Score Scraper — GCS Edition (with merge)
----------------------------------------------------------
Fetches live/final scores from ESPN and MERGES with existing GCS data
so completed game results are never lost when they drop off ESPN's feed.

Runs as a Cloud Run job triggered by Cloud Scheduler every 2 hours.

Environment variables:
    GCS_BUCKET   — bucket name (default: cbb-scores-490420)
    GCS_OBJECT   — object path (default: scores.json)
"""

import requests
import json
import os
import sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo          # fix #10 — replaces hardcoded UTC offset
from google.cloud import storage
from google.api_core.exceptions import NotFound  # fix #8 — distinguish 404 vs real errors

from team_names import resolve_with_warning

GCS_BUCKET = os.environ.get("GCS_BUCKET", "cbb-scores-490420")
GCS_OBJECT = os.environ.get("GCS_OBJECT", "scores.json")
ESPN_URL   = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

ET = ZoneInfo("America/New_York")  # fix #10


def fetch_from_espn():
    et_now = datetime.now(ET)
    # Fetch today and yesterday in ET to catch late games that cross midnight
    dates_to_fetch = [
        et_now.strftime("%Y%m%d"),
        (et_now.replace(hour=0, minute=0, second=0) - __import__("datetime").timedelta(days=1)).strftime("%Y%m%d"),
    ]

    all_events = {}
    for date_str in dates_to_fetch:
        url = f"{ESPN_URL}?dates={date_str}&groups=100&limit=50"
        try:
            r = requests.get(url, headers=HEADERS, timeout=15)
            r.raise_for_status()
            data = r.json()
            for event in data.get("events", []):
                all_events[event.get("id")] = event  # deduplicate by ID
        except Exception as e:
            print(f"[warn] ESPN fetch for {date_str} failed: {e}", file=sys.stderr)

    games = []
    for event in all_events.values():
        try:
            comp  = event["competitions"][0]
            teams = comp["competitors"]
            if len(teams) < 2:
                continue
            t1, t2 = teams[0], teams[1]
            name1  = resolve_with_warning(t1["team"].get("displayName", ""), "ESPN")
            name2  = resolve_with_warning(t2["team"].get("displayName", ""), "ESPN")
            score1 = t1.get("score", "")
            score2 = t2.get("score", "")
            st     = event.get("status", {}).get("type", {})
            games.append({
                "espn_id":   event.get("id", ""),
                "date":      utc_to_et_date(event.get("date", "")),
                "state":     st.get("state", "pre"),
                "detail":    st.get("shortDetail", ""),
                "completed": st.get("completed", False),
                "t1_name":   name1,
                "t1_score":  int(score1) if score1 else None,
                "t1_winner": t1.get("winner", False),
                "t2_name":   name2,
                "t2_score":  int(score2) if score2 else None,
                "t2_winner": t2.get("winner", False),
            })
        except Exception as e:
            print(f"[warn] skipping event: {e}", file=sys.stderr)
    return games


# ── fix #8: fail-closed load_existing ────────────────────────────────────────
def load_existing(client):
    """
    Load existing games from GCS.

    - NotFound (404): treat as first run, return empty list.
    - Any other exception: RAISE — do not silently discard accumulated data.
    - Malformed payload (no 'games' list): RAISE — don't merge into garbage.
    """
    try:
        blob = client.bucket(GCS_BUCKET).blob(GCS_OBJECT)
        text = blob.download_as_text()
    except NotFound:
        print("  [info] No existing GCS data found — starting fresh")
        return []
    except Exception as e:
        # Transient GCS error, auth issue, network blip — do NOT proceed
        raise RuntimeError(f"[FATAL] Failed to read existing GCS data: {e}") from e

    try:
        payload = json.loads(text)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"[FATAL] Existing GCS data is not valid JSON: {e}") from e

    games = payload.get("games")
    if not isinstance(games, list):
        raise RuntimeError(
            f"[FATAL] Existing GCS payload has no 'games' list (keys: {list(payload.keys())})"
        )

    return games
# ── end fix #8 ────────────────────────────────────────────────────────────────


def merge_games(existing: list, new: list) -> list:
    """Merge new ESPN results into existing accumulated data. Never lose a completed game."""
    by_id = {g["espn_id"]: g for g in existing if g.get("espn_id")}

    for g in new:
        eid = g.get("espn_id", "")
        if eid and eid in by_id:
            # Don't overwrite completed game with a pre/live snapshot
            if by_id[eid].get("completed") and not g.get("completed"):
                continue
            by_id[eid] = g
        else:
            key = eid or f"{g['t1_name']}_{g['t2_name']}_{g['date']}"
            by_id[key] = g

    result = list(by_id.values())
    # Sort: live first, then upcoming (by date asc), then completed (newest date first)
    result.sort(key=lambda g: (
        0 if g.get("state") == "in" else
        1 if not g.get("completed") else 2,
        g.get("date", "") if not g.get("completed") else "",
        "" if not g.get("completed") else g.get("date", ""),
    ))
    return result


def write_to_gcs(client, games):
    payload   = {"updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                 "game_count": len(games), "games": games}
    blob_data = json.dumps(payload, indent=2).encode("utf-8")
    blob      = client.bucket(GCS_BUCKET).blob(GCS_OBJECT)
    blob.upload_from_string(blob_data, content_type="application/json")
    blob.make_public()
    print(f"[ok] {len(games)} games → gs://{GCS_BUCKET}/{GCS_OBJECT}")


# ── fix #10: real timezone handling ──────────────────────────────────────────
def utc_to_et_date(utc_str):
    """Convert ESPN UTC timestamp to Eastern Time date string (DST-aware via zoneinfo)."""
    if not utc_str:
        return ""
    try:
        dt_utc = datetime.fromisoformat(utc_str.replace("Z", "+00:00"))
        dt_et  = dt_utc.astimezone(ET)
        return dt_et.strftime("%Y-%m-%d")
    except Exception:
        return utc_str[:10]
# ── end fix #10 ───────────────────────────────────────────────────────────────


def main():
    print(f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')} UTC] Score scraper (merge mode)")
    new_games = fetch_from_espn()
    finished  = sum(1 for g in new_games if g["completed"])
    live      = sum(1 for g in new_games if g["state"] == "in")
    print(f"  ESPN returned: {len(new_games)} games — {finished} final, {live} live")

    for g in [g for g in new_games if g["state"] == "in"]:
        print(f"  LIVE: {g['t1_name']} {g['t1_score']}-{g['t2_score']} {g['t2_name']} ({g['detail']})")
    for g in [g for g in new_games if g["completed"]]:
        w  = g['t1_name'] if g['t1_winner'] else g['t2_name']
        ws = g['t1_score'] if g['t1_winner'] else g['t2_score']
        ls = g['t2_score'] if g['t1_winner'] else g['t1_score']
        print(f"  FINAL: {w} {ws}-{ls} [{g['date']}]")

    client   = storage.Client()
    existing = load_existing(client)  # raises on real errors — intentional
    print(f"  Existing in GCS: {len(existing)} games")
    merged   = merge_games(existing, new_games)
    print(f"  After merge: {len(merged)} games ({sum(1 for g in merged if g['completed'])} completed)")
    write_to_gcs(client, merged)


if __name__ == "__main__":
    main()
