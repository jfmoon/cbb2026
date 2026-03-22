import { createContext, useContext, useState } from "react";
import { useScores } from "../hooks/useScores";
import { useOdds }   from "../hooks/useOdds";
import TEAM_DATA     from "../data/teamData.json";

// ── Coaching pedigree — single source of truth ────────────────────────────────
export const CP = {
  "Duke":           { score: 9.5, coach: "Jon Scheyer" },
  "Michigan":       { score: 8.0, coach: "Dusty May" },
  "Arizona":        { score: 7.5, coach: "Tommy Lloyd" },
  "Florida":        { score: 8.5, coach: "Todd Golden" },
  "Houston":        { score: 9.0, coach: "Kelvin Sampson" },
  "Purdue":         { score: 8.5, coach: "Matt Painter" },
  "Iowa State":     { score: 8.5, coach: "T.J. Otzelberger" },
  "UConn":          { score: 9.5, coach: "Dan Hurley" },
  "Illinois":       { score: 7.5, coach: "Brad Underwood" },
  "Gonzaga":        { score: 9.5, coach: "Mark Few" },
  "St. John's":     { score: 7.0, coach: "Rick Pitino" },
  "Michigan State": { score: 9.0, coach: "Tom Izzo" },
  "Virginia":       { score: 8.0, coach: "Tony Bennett" },
  "Vanderbilt":     { score: 6.5, coach: "Mark Byington", note: "*" },
  "Arkansas":       { score: 7.0, coach: "John Calipari" },
  "Tennessee":      { score: 8.0, coach: "Rick Barnes" },
  "Alabama":        { score: 7.5, coach: "Nate Oats" },
  "Nebraska":       { score: 7.0, coach: "Fred Hoiberg" },
  "Kansas":         { score: 8.5, coach: "Bill Self" },
  "Louisville":     { score: 6.0, coach: "Pat Kelsey", note: "*" },
  "Wisconsin":      { score: 7.5, coach: "Greg Gard" },
  "Ohio State":     { score: 7.0, coach: "Jake Diebler", note: "*" },
  "Saint Mary's":   { score: 8.0, coach: "Randy Bennett" },
  "UCLA":           { score: 7.0, coach: "Mick Cronin" },
  "Kentucky":       { score: 8.5, coach: "John Calipari" },
  "Iowa":           { score: 6.5, coach: "Fran McCaffery" },
  "Miami (FL)":     { score: 6.0, coach: "Jim Larrañaga" },
  "Texas Tech":     { score: 7.5, coach: "Grant McCasland" },
  "Georgia":        { score: 6.0, coach: "Mike White" },
  "Saint Louis":    { score: 6.5, coach: "Josh Schertz", note: "*" },
  "Utah State":     { score: 6.0, coach: "Jerrod Crase", note: "*" },
  "Texas":          { score: 7.0, coach: "Rodney Terry" },
  "SMU":            { score: 6.0, coach: "Rob Lanier", note: "*" },
  "Clemson":        { score: 6.5, coach: "Brad Brownell" },
  "BYU":            { score: 6.5, coach: "Kevin Young", note: "*" },
  "NC State":       { score: 7.5, coach: "Kevin Keatts" },
  "Texas A&M":      { score: 6.5, coach: "Buzz Williams" },
  "VCU":            { score: 7.5, coach: "Mike Rhoades" },
  "TCU":            { score: 6.0, coach: "Jamie Dixon" },
  "South Florida":  { score: 5.5, coach: "Amir Abdur-Rahim", note: "*" },
  "North Carolina": { score: 7.5, coach: "Hubert Davis" },
  "Missouri":       { score: 6.0, coach: "Dennis Gates" },
  "UCF":            { score: 5.5, coach: "Johnny Dawkins" },
  "Akron":          { score: 5.5, coach: "John Groce", note: "*" },
  "Santa Clara":    { score: 5.0, coach: "Herb Sendek", note: "*" },
  "McNeese":        { score: 5.5, coach: "Will Wade" },
  "Northern Iowa":  { score: 6.0, coach: "Ben Jacobson" },
  "Miami (Ohio)":   { score: 5.5, coach: "Travis Steele", note: "*" },
  "High Point":     { score: 5.5, coach: "Tubby Smith" },
};

// Merge CP into team objects once at module load
export const ALL_TEAMS = TEAM_DATA.teams.map(t => ({
  ...t,
  coaching_pedigree: CP[t.name]?.score ?? null,
  coaching_note:     CP[t.name]?.note  ?? null,
  coach_name:        CP[t.name]?.coach ?? null,
}));

export const TEAMS_MAP     = Object.fromEntries(ALL_TEAMS.map(t => [t.id,   t]));
export const TEAMS_BY_NAME = Object.fromEntries(ALL_TEAMS.map(t => [t.name, t]));

// ── Context ───────────────────────────────────────────────────────────────────
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
      allTeams:    ALL_TEAMS,
      teamsMap:    TEAMS_MAP,
      teamsByName: TEAMS_BY_NAME,
    }}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournament must be used inside <TournamentProvider>");
  return ctx;
}
