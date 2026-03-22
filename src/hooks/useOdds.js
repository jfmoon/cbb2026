/**
 * hooks/useOdds.js
 *
 * Fetches GCS odds.json once on mount.
 * Odds don't change mid-game so no polling needed.
 *
 * Returns the odds lookup object (team name → { s, ml, ou, ok, date })
 * or an empty object while loading / on error.
 */

import { useState, useEffect } from "react";

const GCS_ODDS_URL = "https://storage.googleapis.com/cbb-scores-490420/odds.json";

export function useOdds() {
  const [odds, setOdds] = useState({});

  useEffect(() => {
    fetch(GCS_ODDS_URL, { cache: "no-store" })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => {
        if (
          data?.odds &&
          typeof data.odds === "object" &&
          !Array.isArray(data.odds) &&
          Object.keys(data.odds).length > 0
        ) {
          setOdds(data.odds);
        } else {
          console.warn("[useOdds] unexpected payload shape:", data);
        }
      })
      .catch(e => console.warn("[useOdds] fetch failed:", e.message));
  }, []);

  return odds;
}
