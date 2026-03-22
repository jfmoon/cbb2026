import { useState } from "react";
import { useTournament } from "../context/TournamentContext";
import { fmt12h } from "../utils/formatters";

// ── Shared UI atoms (duplicated here to keep this file self-contained)
// These are small enough that extracting a shared file is overkill for now.

const ARCH_MAP = {}; // filled at module level below — see bottom of file

function SeedBubble({ seed, ff }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
      width:20, height:20, borderRadius:"50%", flexShrink:0, fontSize:10, fontWeight:600,
      background:ff?"#fef3c722":"var(--color-border-tertiary)",
      color:ff?"#b45309":"var(--color-text-secondary)",
      border:ff?"1px solid #f59e0b55":"none" }}>{seed}</span>
  );
}

function ArchetypePill({ id, small, archetypeMap }) {
  const a = archetypeMap[id]; if (!a) return null;
  return <span style={{ display:"inline-block", background:a.color+"1a", color:a.color,
    border:`1px solid ${a.color}40`, borderRadius:20,
    padding:small?"2px 7px":"3px 9px", fontSize:small?10:11, fontWeight:500,
    whiteSpace:"nowrap" }}>{a.name}</span>;
}

function Tag({ label, color }) {
  return <span style={{ display:"inline-block", fontSize:9, fontWeight:600,
    letterSpacing:"0.05em", textTransform:"uppercase",
    background:color+"18", color, border:`1px solid ${color}35`,
    borderRadius:4, padding:"1px 5px" }}>{label}</span>;
}

function PaceDot({ label }) {
  const PACE_COLORS = { Fast:"#dc2626", Moderate:"#d97706", Slow:"#2563eb" };
  const c = PACE_COLORS[label]||"#888";
  return <span style={{ fontSize:10, color:c, fontWeight:500, padding:"1px 5px",
    border:`1px solid ${c}44`, borderRadius:8 }}>{label}</span>;
}

function ResultBanner({ teamName, scores, gameDate }) {
  const all = scores?.[teamName];
  if (!all?.length) return null;
  const s = gameDate ? all.find(r => r.date === gameDate) ?? null : all[all.length - 1];
  if (!s || s.state === "pre") return null;
  const live  = s.state === "in";
  const color = live ? "#0891b2" : s.winner ? "#166534" : "#6b7280";
  const bg    = live ? "#0891b222" : s.winner ? "#dcfce7" : "#f3f4f6";
  const border= live ? "#0891b244" : s.winner ? "#86efac" : "#d1d5db";
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4,
      fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:6,
      background:bg, color, border:`1.5px solid ${border}`,
      marginLeft:5, whiteSpace:"nowrap" }}>
      {live && <span style={{ width:6, height:6, borderRadius:"50%", background:color,
        flexShrink:0, animation:"pulse 1.2s infinite" }}/>}
      {live ? `LIVE ${s.score}-${s.opp}` : s.winner ? `W ${s.score}-${s.opp}` : `L ${s.score}-${s.opp}`}
      {!live && <span style={{ fontSize:9, fontWeight:500, opacity:0.7, marginLeft:2 }}>Final</span>}
    </span>
  );
}

// Convert moneyline to implied probability string, e.g. "-150 (60%)"
function formatML(ml) {
  if (!ml || ml === "TBD" || ml === "") return null;
  const n = parseInt(ml);
  if (isNaN(n)) return null;
  const prob = n < 0
    ? Math.abs(n) / (Math.abs(n) + 100) * 100
    : 100 / (n + 100) * 100;
  return { raw: ml, prob: Math.round(prob) };
}

const f1 = v => v != null ? v.toFixed(1) : "—";

const KEY_ATTRS = [
  { key:"off_efficiency",   label:"AdjO" },
  { key:"def_efficiency",   label:"AdjD" },
  { key:"three_pt_prowess", label:"3PT"  },
  { key:"free_throw_gen",   label:"FTG"  },
  { key:"ball_security",    label:"TO"   },
  { key:"rim_protection",   label:"BLK"  },
  { key:"pressure_defense", label:"STL"  },
  { key:"experience",       label:"EXP"  },
];

export default function MatchupCard({ matchup, archetypeMap }) {
  const { scores, liveOdds, setSelectedTeam, teamsMap } = useTournament();
  const [expanded, setExpanded] = useState(false);
  const { team1, team2, site, date, time } = matchup;

  const a1 = team1 ? archetypeMap[team1.archetype] : null;
  const a2 = team2 ? archetypeMap[team2.archetype] : null;
  const fullTeam1 = team1 ? teamsMap[team1.id] : null;
  const fullTeam2 = team2 ? teamsMap[team2.id] : null;
  const odds = liveOdds || {};
  const o1 = team1 ? odds[team1.name] : null;
  const o2 = team2 ? odds[team2.name] : null;

  const fmtSpread = s => {
    if (!s || s === "TBD") return null;
    const n = parseFloat(s);
    return isNaN(n) ? null : (n > 0 ? `+${n}` : String(n));
  };
  const sprd1 = o1?.ok && o1.s ? fmtSpread(o1.s) : null;
  const sprd2 = o2?.ok && o2.s ? fmtSpread(o2.s) : null;
  const ml1 = o1?.ok ? formatML(o1.ml) : null;
  const ml2 = o2?.ok ? formatML(o2.ml) : null;
  const hasOdds = o1?.ok || o2?.ok;

  const TeamHeader = ({ team, arch, align }) => {
    if (!team) return <div style={{ padding:"10px 12px", color:"var(--color-text-tertiary)", fontSize:12 }}>TBD</div>;
    const isRight = align === "right";
    return (
      <div style={{ padding:"10px 12px", cursor:"pointer", textAlign:isRight?"right":"left" }}
        onClick={() => { const ft = isRight ? fullTeam2 : fullTeam1; if (ft) setSelectedTeam(ft); }}>
        <div style={{ display:"flex", alignItems:"center", gap:5,
          justifyContent:isRight?"flex-end":"flex-start", marginBottom:3 }}>
          <SeedBubble seed={team.seed} ff={team.is_ff||false}/>
          <span style={{ fontSize:14, fontWeight:600, color:"var(--color-text-primary)", lineHeight:1.2 }}>{team.name}</span>
          <ResultBanner teamName={team.name} scores={scores} gameDate={date}/>
        </div>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap",
          justifyContent:isRight?"flex-end":"flex-start", marginBottom:4 }}>
          <ArchetypePill id={team.archetype} small archetypeMap={archetypeMap}/>
          {team.is_veteran && <Tag label="Vet" color="#9f1239"/>}
          {team.is_length  && <Tag label="Len" color="#0369a1"/>}
          <PaceDot label={team.pace_label}/>
        </div>
        {team.barthag != null && (
          <div style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>
            Barthag <b style={{ color:"var(--color-text-secondary)" }}>{team.barthag.toFixed(3)}</b>
            {team.rr != null && <span> · RR <b style={{ color:"var(--color-text-secondary)" }}>{team.rr.toFixed(1)}</b></span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, overflow:"hidden" }}>

      {/* Header bar */}
      <div style={{ background:"var(--color-background-secondary)", padding:"6px 12px",
        display:"flex", alignItems:"center", gap:8,
        borderBottom:"0.5px solid var(--color-border-tertiary)", flexWrap:"wrap" }}>
        {matchup.is_ff && <Tag label="First Four" color="#b45309"/>}
        <span style={{ fontSize:11, color:"var(--color-text-secondary)", fontWeight:500 }}>{site}</span>
        <span style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>
          {date}{time ? " · " + fmt12h(time) + " ET" : ""}
        </span>
      </div>

      {/* Teams side by side */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 32px 1fr",
        borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
        <TeamHeader team={team1} arch={a1} align="left"/>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:10, color:"var(--color-text-tertiary)",
          borderLeft:"0.5px solid var(--color-border-tertiary)",
          borderRight:"0.5px solid var(--color-border-tertiary)" }}>vs</div>
        <TeamHeader team={team2} arch={a2} align="right"/>
      </div>

      {/* TBD placeholder */}
      {team1 && !team2 && (
        <div style={{ padding:"12px 14px", textAlign:"center", color:"var(--color-text-tertiary)",
          fontSize:12, borderTop:"0.5px solid var(--color-border-tertiary)",
          background:"var(--color-background-secondary)" }}>
          Opponent TBD — stat comparison available after First Four
        </div>
      )}

      {/* Odds strip with implied probability */}
      {hasOdds && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 64px 1fr",
          borderBottom:"0.5px solid var(--color-border-tertiary)",
          background:"var(--color-background-secondary)" }}>
          <div style={{ padding:"5px 12px" }}>
            {sprd1 && (
              <span style={{ fontSize:12, fontWeight:600,
                color:parseFloat(o1.s)<0?"#1a6b3a":"var(--color-text-secondary)" }}>
                {sprd1}
              </span>
            )}
            {ml1 && (
              <span style={{ fontSize:11, color:"var(--color-text-tertiary)", marginLeft:6 }}
                title={`Implied win probability: ${ml1.prob}%`}>
                {ml1.raw}
                <span style={{ fontSize:10, color:"var(--color-text-tertiary)", marginLeft:3 }}>
                  ({ml1.prob}%)
                </span>
              </span>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:10, color:"var(--color-text-tertiary)",
            borderLeft:"0.5px solid var(--color-border-tertiary)",
            borderRight:"0.5px solid var(--color-border-tertiary)",
            textAlign:"center", lineHeight:1.3 }}>
            {o1?.ou ? <>{`O/U`}<br/>{o1.ou}</> : "—"}
          </div>
          <div style={{ padding:"5px 12px", textAlign:"right" }}>
            {ml2 && (
              <span style={{ fontSize:11, color:"var(--color-text-tertiary)", marginRight:6 }}
                title={`Implied win probability: ${ml2.prob}%`}>
                <span style={{ fontSize:10, color:"var(--color-text-tertiary)", marginRight:3 }}>
                  ({ml2.prob}%)
                </span>
                {ml2.raw}
              </span>
            )}
            {sprd2 && (
              <span style={{ fontSize:12, fontWeight:600,
                color:parseFloat(o2.s)<0?"#1a6b3a":"var(--color-text-secondary)" }}>
                {sprd2}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Expand/collapse toggle */}
      {team1 && team2 && (
        <div onClick={() => setExpanded(e => !e)}
          style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5,
            padding:"5px 12px", cursor:"pointer",
            borderTop:"0.5px solid var(--color-border-tertiary)",
            background:"var(--color-background-secondary)",
            color:"var(--color-text-tertiary)", fontSize:11, fontWeight:500,
            userSelect:"none" }}>
          <span>{expanded ? "Hide attributes" : "Show attributes"}</span>
          <span style={{ fontSize:16, lineHeight:1, display:"inline-block",
            transform:expanded?"rotate(-90deg)":"rotate(90deg)",
            transition:"transform 0.15s" }}>›</span>
        </div>
      )}

      {/* Butterfly attribute bars */}
      {team1 && team2 && expanded && (
        <div>
          {KEY_ATTRS.map(a => {
            const v1 = team1?.[a.key] ?? null;
            const v2 = team2?.[a.key] ?? null;
            const pct1 = v1 != null ? ((v1-1)/9)*100 : 0;
            const pct2 = v2 != null ? ((v2-1)/9)*100 : 0;
            const w1 = v1 != null && v2 != null && v1 > v2;
            const w2 = v2 != null && v1 != null && v2 > v1;
            const c1 = a1?.color || "#888";
            const c2 = a2?.color || "#888";
            return (
              <div key={a.key} style={{ display:"grid", gridTemplateColumns:"1fr 36px 1fr",
                alignItems:"center", borderBottom:"0.5px solid var(--color-border-tertiary)",
                padding:"4px 12px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ fontSize:10, fontWeight:w1?600:400,
                    color:w1?"var(--color-text-primary)":"var(--color-text-tertiary)",
                    width:24, textAlign:"right", flexShrink:0 }}>{f1(v1)}</span>
                  <div style={{ flex:1, height:5, background:"var(--color-border-tertiary)",
                    borderRadius:3, overflow:"hidden", position:"relative" }}>
                    <div style={{ position:"absolute", right:0, top:0, height:"100%",
                      width:`${pct1}%`, background:w1?c1:c1+"55", borderRadius:3 }}/>
                  </div>
                </div>
                <div style={{ textAlign:"center", fontSize:10, color:"var(--color-text-tertiary)", padding:"0 2px" }}>{a.label}</div>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ flex:1, height:5, background:"var(--color-border-tertiary)",
                    borderRadius:3, overflow:"hidden", position:"relative" }}>
                    <div style={{ position:"absolute", left:0, top:0, height:"100%",
                      width:`${pct2}%`, background:w2?c2:c2+"55", borderRadius:3 }}/>
                  </div>
                  <span style={{ fontSize:10, fontWeight:w2?600:400,
                    color:w2?"var(--color-text-primary)":"var(--color-text-tertiary)",
                    width:24, textAlign:"left", flexShrink:0 }}>{f1(v2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
