/**
 * TournamentContext.jsx
 *
 * Provides three things globally so tabs don't need prop drilling:
 *   1. scores / lastUpdate / scoresError  — from useScores()
 *   2. liveOdds                           — from useOdds()
 *   3. selectedTeam / setSelectedTeam     — TeamModal trigger
 *
 * Usage:
 *   // In App.jsx root:
 *   <TournamentProvider>
 *     <ClassifierTab />
 *     <MatchupsTab />
 *     ...
 *   </TournamentProvider>
 *
 *   // In any child component:
 *   const { scores, liveOdds, setSelectedTeam } = useTournament();
 */

import { createContext, useContext, useState } from "react";
import { useScores } from "../hooks/useScores";
import { useOdds }   from "../hooks/useOdds";

const TournamentContext = createContext(null);

export function TournamentProvider({ children }) {
  const { scores, lastUpdate, error: scoresError } = useScores();
  const liveOdds = useOdds();
  const [selectedTeam, setSelectedTeam] = useState(null);

  return (
    <TournamentContext.Provider value={{
      scores,
      lastUpdate,
      scoresError,
      liveOdds,
      selectedTeam,
      setSelectedTeam,
    }}>
      {children}
    </TournamentContext.Provider>
  );
}

/** Drop-in replacement for the old { scores, lastUpdate } = useScores() call pattern */
export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournament must be used inside <TournamentProvider>");
  return ctx;
}
