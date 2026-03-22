import { useState, useMemo } from "react";
import { useTournament } from "../../context/TournamentContext";
import MatchupCard from "../MatchupCard";
import MATCHUP_DATA from "../../data/matchupData.json";
import TEAM_DATA    from "../../data/teamData.json";
import { fmt12h }   from "../../utils/formatters";

const REGIONS = ["East", "South", "West", "Midwest"];
const REGION_COLORS = { East:"#1d4ed8", South:"#b45309", West:"#7c3aed", Midwest:"#065f46" };
const ARCH_MAP = Object.fromEntries(TEAM_DATA.archetypes.map(a => [a.id, a]));

const ROUND_DATES = {
  "First Four":   ["2026-03-17","2026-03-18"],
  "First Round":  ["2026-03-19","2026-03-20"],
  "Round of 32":  ["2026-03-21","2026-03-22"],
  "Sweet 16":     ["2026-03-27","2026-03-28"],
  "Elite 8":      ["2026-03-29","2026-03-30"],
  "Final Four":   ["2026-04-03"],
  "Championship": ["2026-04-05"],
};

export default function MatchupsTab() {
  const { scores, lastUpdate } = useTournament();
  const [filterRegion, setFilterRegion] = useState("All");
  const [filterRound,  setFilterRound]  = useState("All");
  const [sortBy,       setSortBy]       = useState("time");
  const [hideFinished, setHideFinished] = useState(true);

  const matchups = useMemo(() => {
    let filtered = MATCHUP_DATA.filter(m => {
      if (filterRegion !== "All" && m.region !== filterRegion) return false;
      if (filterRound !== "All") {
        const dates = ROUND_DATES[filterRound] || [];
        if (!dates.includes(m.date)) return false;
      }
      return true;
    });

    if (hideFinished) {
      filtered = filtered.filter(m => {
        const s1 = scores?.[m.team1_name];
        const s2 = scores?.[m.team2_name];
        const done1 = s1?.some(r => r.state === "post" && r.date === m.date);
        const done2 = s2?.some(r => r.state === "post" && r.date === m.date);
        return !done1 && !done2;
      });
    }

    if (sortBy === "time") {
      return [...filtered].sort((a,b) => {
        const da = a.date + (a.time||"99:99");
        const db = b.date + (b.time||"99:99");
        return da.localeCompare(db);
      });
    }
    return filtered;
  }, [filterRegion, filterRound, sortBy, hideFinished, scores]);

  const grouped = useMemo(() => {
    if (sortBy === "time") return { "By Time": matchups };
    const g = {};
    for (const m of matchups) {
      const key = m.round === "First Four" ? "First Four" : m.region;
      if (!g[key]) g[key] = [];
      g[key].push(m);
    }
    return g;
  }, [matchups, sortBy]);

  const sectionOrder = sortBy === "time"
    ? ["By Time"]
    : ["First Four", ...REGIONS];

  const selectStyle = {
    fontSize:12, padding:"5px 7px", borderRadius:6,
    border:"0.5px solid var(--color-border-secondary)",
    background:"var(--color-background-primary)",
    color:"var(--color-text-primary)",
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:"0.875rem", alignItems:"center" }}>
        <select value={filterRegion} onChange={e=>setFilterRegion(e.target.value)} style={selectStyle}>
          <option value="All">All Regions</option>
          {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
        </select>

        <select value={filterRound} onChange={e=>setFilterRound(e.target.value)} style={selectStyle}>
          <option value="All">All Rounds</option>
          {Object.keys(ROUND_DATES).map(r=><option key={r} value={r}>{r}</option>)}
        </select>

        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={selectStyle}>
          <option value="region">Group by region</option>
          <option value="time">Sort by time</option>
        </select>

        <button onClick={()=>setHideFinished(h=>!h)} style={{
          fontSize:11, padding:"5px 9px", borderRadius:6,
          border:"0.5px solid var(--color-border-secondary)",
          background:hideFinished?"var(--color-background-info)":"var(--color-background-primary)",
          color:hideFinished?"var(--color-text-info)":"var(--color-text-secondary)",
          cursor:"pointer", fontWeight:hideFinished?500:400,
        }}>
          {hideFinished ? "✓ Hiding finished" : "Hide finished"}
        </button>

        <span style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>
          {matchups.length} matchup{matchups.length!==1?"s":""}
        </span>

        <span style={{ fontSize:10, color:"var(--color-text-tertiary)", marginLeft:"auto" }}>
          {lastUpdate
            ? `Scores updated ${new Date(lastUpdate).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`
            : Object.keys(scores).length > 0
              ? `${Object.keys(scores).length} scores loaded`
              : "scores pending"}
        </span>
      </div>

      {/* Matchup groups */}
      {sectionOrder.map(section => {
        const games = grouped[section];
        if (!games?.length) return null;
        return (
          <div key={section} style={{ marginBottom:"1.5rem" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:"0.75rem" }}>
              {section !== "First Four" && section !== "By Time" && (
                <span style={{ width:8, height:8, borderRadius:"50%",
                  background:REGION_COLORS[section]||"#888",
                  display:"inline-block", flexShrink:0 }}/>
              )}
              <span style={{ fontSize:13, fontWeight:600,
                color:section==="First Four"?"#b45309"
                  :section==="By Time"?"var(--color-text-secondary)"
                  :REGION_COLORS[section]||"var(--color-text-primary)" }}>
                {section === "First Four" ? "First Four — Dayton, OH"
                  : section === "By Time" ? `${matchups.length} games by tip-off time`
                  : `${section} Region`}
              </span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
              {games.map((m, i) => (
                <MatchupCard key={i} matchup={m} archetypeMap={ARCH_MAP}/>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
