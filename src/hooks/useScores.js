/**
 * hooks/useScores.js
 *
 * Polls GCS scores.json every 10 minutes.
 * Returns a team-keyed lookup map, not raw game data.
 *
 * Key behaviors:
 *  - AbortController cleans up on unmount
 *  - fetchingRef prevents overlapping requests
 *  - Validates payload shape before touching state
 *  - cache: "no-store" bypasses CDN/browser caching
 */

import { useState, useEffect, useRef } from "react";

const GCS_SCORES_URL = "https://storage.googleapis.com/cbb-scores-490420/scores.json";
const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Converts the flat games array from GCS into a team-keyed lookup.
 * A team can appear multiple times (First Four + First Round),
 * so each key maps to an array of result objects.
 */
function buildLookup(games) {
  const map = {};
  for (const g of games) {
    if (g.state === "pre") continue;
    const entry1 = {
      score:   g.t1_score,
      opp:     g.t2_score,
      winner:  g.t1_winner,
      detail:  g.detail,
      state:   g.state,
      date:    g.date,
    };
    const entry2 = {
      score:   g.t2_score,
      opp:     g.t1_score,
      winner:  g.t2_winner,
      detail:  g.detail,
      state:   g.state,
      date:    g.date,
    };
    if (!map[g.t1_name]) map[g.t1_name] = [];
    if (!map[g.t2_name]) map[g.t2_name] = [];
    map[g.t1_name].push(entry1);
    map[g.t2_name].push(entry2);
  }
  return map;
}

export function useScores() {
  const [scores,     setScores]     = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error,      setError]      = useState(null);
  const fetchingRef                 = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchScores() {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const res = await fetch(GCS_SCORES_URL, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        if (!data || !Array.isArray(data.games)) {
          throw new Error("scores.json missing games array");
        }

        setScores(buildLookup(data.games));
        setLastUpdate(data.updated || null);
        setError(null);
      } catch (e) {
        if (e.name === "AbortError") return;
        console.warn("[useScores] fetch failed:", e.message);
        setError(e.message);
      } finally {
        fetchingRef.current = false;
      }
    }

    fetchScores();
    const interval = setInterval(fetchScores, POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return { scores, lastUpdate, error };
}
