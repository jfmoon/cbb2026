// build: 2026-03-18 11:19 UTC
// ─────────────────────────────────────────────────────────────────────────────
// 2026 NCAA Tournament — Style Classifier + Matchup Explorer
//
// Two tabs:
//   1. Classifier  — All 68 teams, filterable by archetype/region/tempo/tag
//   2. Matchups    — First Round matchups side-by-side with style comparison
//
// Scoring: 10 attributes (1–10), normalized to 2026 tournament field.
// Archetypes (8): Two-Way Machine, Offensive Juggernaut, Defensive Fortress,
//                 Gunslinger, Sniper System, Offensive Engine, Foul-Line Bully,
//                 System Operator
// Tags: Veteran (experience ≥ 7.5), Length (avg height ≥ 78.7")
// Sources: KenPom (subscription), EvanMiya (subscription)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect, useRef, createContext, useContext } from "react";
import { useScores } from "./hooks/useScores";
import { useOdds }   from "./hooks/useOdds";
import { gapColor, gapLabel, GAP_LEGEND } from "./utils/gapUtils";
import { fmt12h }    from "./utils/formatters";
import JB_DATA      from "./data/jbData.json";
import UPSET_DATA   from "./data/upsetData.json";
import TEAM_DATA    from "./data/teamData.json";
import MATCHUP_DATA from "./data/matchupData.json";

const _css = `
:root {
  --color-text-primary:        #111827;
  --color-text-secondary:      #374151;
  --color-text-tertiary:       #6b7280;
  --color-text-info:           #1d4ed8;
  --color-border-secondary:    rgba(0,0,0,0.18);
  --color-border-tertiary:     rgba(0,0,0,0.10);
  --color-background-primary:  #fff8f3;
  --color-background-secondary:#fef0e6;
  --color-background-info:     #eff6ff;
  --border-radius-md:          8px;
  --border-radius-lg:          12px;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    --color-text-primary:        #f3f4f6;
    --color-text-secondary:      #d1d5db;
    --color-text-tertiary:       #9ca3af;
    --color-text-info:           #93c5fd;
    --color-border-secondary:    rgba(255,255,255,0.18);
    --color-border-tertiary:     rgba(255,255,255,0.10);
    --color-background-primary:  #1a1008;
    --color-background-secondary:#261608;
    --color-background-info:     #1e3a5f;
  }
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-sans); background: var(--color-background-primary); color: var(--color-text-primary); }
`;
if (!document.getElementById('app-css')) {
  const s = document.createElement('style');
  s.id = 'app-css';
  s.textContent = _css;
  document.head.appendChild(s);
}



// ── Coaching pedigree (manual, last 7 years) ──────────────────────────────────
const CP = {
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


// ── Odds — loaded from GCS (actionnetwork.com / DraftKings) ─────────────────
const ODDS = {}; // empty fallback — real data served from GCS odds.json

// ── jbScore + Upset Model data ────────────────────────────────────────────



// ── Team data (pre-scored from KenPom + EvanMiya) ─────────────────────────────

// ── Matchup data (bracket structure + team profiles) ──────────────────────────


// ── Live odds hook — see src/hooks/useOdds.js ─────────────────────────────────

// ── Result Banner ─────────────────────────────────────────────────────────────
function ResultBanner({ teamName, scores, gameDate }) {
  // Find the result for this specific game date (prevents carrying results forward)
  const all = scores?.[teamName];
  if (!all || !all.length) return null;
  const s = gameDate
    ? all.find(r => r.date === gameDate) ?? null
    : all[all.length - 1]; // no date = show latest
  if (!s || s.state === "pre") return null;
  const live  = s.state === "in";
  const color = live ? "#0891b2" : s.winner ? "#166534" : "#6b7280";
  const bg    = live ? "#0891b222" : s.winner ? "#dcfce7" : "#f3f4f6";
  const border= live ? "#0891b244" : s.winner ? "#86efac" : "#d1d5db";
  const score = `${s.score}-${s.opp}`;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4,
      fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:6,
      background:bg, color, border:`1.5px solid ${border}`,
      marginLeft:5, whiteSpace:"nowrap", letterSpacing:"0.01em" }}>
      {live && <span style={{ width:6, height:6, borderRadius:"50%", background:color, flexShrink:0,
        animation:"pulse 1.2s infinite" }}/>}
      {live ? `LIVE ${score}` : s.winner ? `W ${score}` : `L ${score}`}
      {!live && <span style={{ fontSize:9, fontWeight:500, opacity:0.7, marginLeft:2 }}>Final</span>}
    </span>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────
const REGIONS = ["East", "South", "West", "Midwest"];
const ARCH_MAP = Object.fromEntries(TEAM_DATA.archetypes.map(a => [a.id, a]));
const REGION_COLORS = { East: "#1d4ed8", South: "#b45309", West: "#7c3aed", Midwest: "#065f46" };
const PACE_COLORS   = { Fast: "#dc2626", Moderate: "#d97706", Slow: "#2563eb" };
const ATTRS = [
  { key: "three_pt_prowess", short: "3PT",  label: "3-Point Prowess" },
  { key: "free_throw_gen",   short: "FTG",  label: "Free Throw Gen." },
  { key: "off_efficiency",   short: "AdjO", label: "Off. Efficiency" },
  { key: "ball_security",    short: "TO",   label: "Ball Security" },
  { key: "off_rebounding",   short: "ORB",  label: "Off. Rebounding" },
  { key: "def_efficiency",   short: "AdjD", label: "Def. Efficiency" },
  { key: "opp_3pt_allowed",  short: "3PD",  label: "Opp 3P% Allowed" },
  { key: "rim_protection",   short: "BLK",  label: "Rim Protection" },
  { key: "pressure_defense", short: "STL",  label: "Pressure Defense" },
  { key: "experience",       short: "EXP",  label: "Experience" },
];

const TEAMS_WITH_CP = TEAM_DATA.teams.map(t => ({
  ...t,
  coaching_pedigree: CP[t.name]?.score ?? null,
  coaching_note:     CP[t.name]?.note  ?? null,
  coach_name:        CP[t.name]?.coach ?? null,
}));
const TEAMS_MAP = Object.fromEntries(TEAMS_WITH_CP.map(t => [t.id, t]));

// ── Helpers ─────
// fmt12h imported from ./utils/formatters
const f1 = v => v != null ? v.toFixed(1) : "—";

function ArchetypePill({ id, small }) {
  const a = ARCH_MAP[id]; if (!a) return null;
  return <span style={{ display:"inline-block", background:a.color+"1a", color:a.color, border:`1px solid ${a.color}40`, borderRadius:20, padding:small?"2px 7px":"3px 9px", fontSize:small?10:11, fontWeight:500, whiteSpace:"nowrap" }}>{a.name}</span>;
}

function Tag({ label, color }) {
  return <span style={{ display:"inline-block", fontSize:9, fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase", background:color+"18", color, border:`1px solid ${color}35`, borderRadius:4, padding:"1px 5px" }}>{label}</span>;
}

function SeedBubble({ seed, ff }) {
  return <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:20, height:20, borderRadius:"50%", flexShrink:0, fontSize:10, fontWeight:600, background:ff?"#fef3c722":"var(--color-border-tertiary)", color:ff?"#b45309":"var(--color-text-secondary)", border:ff?"1px solid #f59e0b55":"none" }}>{seed}</span>;
}

function PaceDot({ label }) {
  const c = PACE_COLORS[label]||"#888";
  return <span style={{ fontSize:10, color:c, fontWeight:500, padding:"1px 5px", border:`1px solid ${c}44`, borderRadius:8 }}>{label}</span>;
}

function AttrBar({ value, color, label, inverted }) {
  const pct = value != null ? ((value-1)/9)*100 : 0;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
      <span style={{ fontSize:10, color:"var(--color-text-tertiary)", width:32, flexShrink:0, textAlign:"right" }}>{label}</span>
      <div style={{ flex:1, height:4, background:"var(--color-border-tertiary)", borderRadius:2, overflow:"hidden" }}>
        {value != null && <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:2 }}/>}
      </div>
      <span style={{ fontSize:10, fontWeight:500, color:"var(--color-text-secondary)", width:22, textAlign:"right" }}>{f1(value)}</span>
    </div>
  );
}

// ── Team Detail Modal ─────────────────────────────────────────────────────────
function TeamModal({ team, onClose }) {
  const arch = ARCH_MAP[team.archetype];
  const cp = CP[team.name];
  const allAttrs = [...ATTRS];
  if (cp) allAttrs.push({ key:"coaching_pedigree", short:"CPG", label:"Coaching Pedigree" });
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:"1rem" }} onClick={onClose}>
      <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-secondary)", borderRadius:14, padding:"1.25rem", width:"100%", maxWidth:480, maxHeight:"88vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
              <SeedBubble seed={team.seed} ff={team.is_ff}/>
              <span style={{ fontSize:17, fontWeight:600, color:"var(--color-text-primary)" }}>{team.name}</span>
              {team.is_ff && <Tag label="FF" color="#b45309"/>}
            </div>
            <div style={{ display:"flex", gap:7, alignItems:"center", flexWrap:"wrap" }}>
              <span style={{ fontSize:11, color:"var(--color-text-secondary)" }}>{team.record}</span>
              <span style={{ fontSize:11, fontWeight:500, color:REGION_COLORS[team.region] }}>{team.region}</span>
              <PaceDot label={team.pace_label}/>
              {team.avg_height && <span style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>{team.avg_height}"</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--color-text-tertiary)", fontSize:18, lineHeight:1, padding:2 }}>✕</button>
        </div>
        <div style={{ display:"flex", gap:5, marginBottom:"0.75rem", flexWrap:"wrap" }}>
          <ArchetypePill id={team.archetype}/>
          {team.is_veteran && <Tag label="Veteran" color="#9f1239"/>}
          {team.is_length  && <Tag label="Length"  color="#0369a1"/>}
        </div>
        <div style={{ background:arch.color+"0f", border:`1px solid ${arch.color}2a`, borderRadius:8, padding:"8px 12px", marginBottom:"1rem" }}>
          <p style={{ margin:0, fontSize:12, color:"var(--color-text-secondary)", lineHeight:1.5 }}>{arch.description}</p>
        </div>
        {(team.barthag!=null||team.rr!=null) && (
          <div style={{ display:"flex", gap:8, marginBottom:"1rem" }}>
            {team.barthag!=null && <div style={{ flex:1, background:"var(--color-background-secondary)", borderRadius:8, padding:"7px 10px" }}>
              <div style={{ fontSize:9, color:"var(--color-text-tertiary)", marginBottom:1, textTransform:"uppercase", letterSpacing:"0.05em" }}>Barthag</div>
              <div style={{ fontSize:16, fontWeight:600, color:"var(--color-text-primary)" }}>{team.barthag.toFixed(3)}</div>
            </div>}
            {team.rr!=null && <div style={{ flex:1, background:"var(--color-background-secondary)", borderRadius:8, padding:"7px 10px" }}>
              <div style={{ fontSize:9, color:"var(--color-text-tertiary)", marginBottom:1, textTransform:"uppercase", letterSpacing:"0.05em" }}>EM RR</div>
              <div style={{ fontSize:16, fontWeight:600, color:"var(--color-text-primary)" }}>{team.rr.toFixed(1)}</div>
            </div>}
            {team.em_rank && <div style={{ flex:1, background:"var(--color-background-secondary)", borderRadius:8, padding:"7px 10px" }}>
              <div style={{ fontSize:9, color:"var(--color-text-tertiary)", marginBottom:1, textTransform:"uppercase", letterSpacing:"0.05em" }}>Rank</div>
              <div style={{ fontSize:16, fontWeight:600, color:"var(--color-text-primary)" }}>#{team.em_rank}</div>
            </div>}
          </div>
        )}
        {team.is_ff && team.off_efficiency == null ? (
          <div style={{ padding:"10px 12px", textAlign:"center", color:"var(--color-text-tertiary)", fontSize:12, background:"var(--color-background-secondary)", borderRadius:"var(--border-radius-md)", border:"0.5px solid var(--color-border-tertiary)", marginBottom:"0.5rem" }}>
            Stats pending — available after First Four play-in
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {allAttrs.map(a => <div key={a.key}><div style={{ fontSize:10, color:"var(--color-text-tertiary)", marginBottom:2 }}>{a.label}</div><AttrBar value={team[a.key]} color={arch.color} label={a.short}/></div>)}
          </div>
        )}
        {team.coach_name && <div style={{ marginTop:"0.75rem", paddingTop:"0.75rem", borderTop:"0.5px solid var(--color-border-tertiary)", fontSize:11, color:"var(--color-text-tertiary)" }}>Coach: <span style={{ color:"var(--color-text-secondary)" }}>{team.coach_name}{cp?.note?" ("+cp.note+" small sample)":""}</span></div>}
      </div>
    </div>
  );
}

// ── Team Row (classifier) ─────────────────────────────────────────────────────
function TeamRow({ team, onClick, eliminated }) {
  const out = eliminated;
  return (
    <div onClick={onClick} style={{ display:"grid", gridTemplateColumns:"24px 1fr auto auto", alignItems:"center", gap:8, padding:"7px 10px", cursor:"pointer", borderBottom:"0.5px solid var(--color-border-tertiary)", borderRadius:6, transition:"background 0.1s", opacity: out ? 0.45 : 1 }}
      onMouseEnter={e=>e.currentTarget.style.background="var(--color-background-secondary)"}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <SeedBubble seed={team.seed} ff={team.is_ff}/>
      <div>
        <div style={{ fontSize:13, fontWeight:500, color: out ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
          textDecoration: out ? "line-through" : "none" }}>
          {team.name}{team.is_ff&&<span style={{ marginLeft:4,fontSize:9,color:"#b45309" }}>FF</span>}
          {out && <span style={{ marginLeft:6, fontSize:9, color:"var(--color-text-tertiary)", textDecoration:"none" }}>eliminated</span>}
        </div>
        <div style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>{team.record}</div>
      </div>
      <div style={{ display:"flex", gap:4, alignItems:"center" }}>
        {team.is_veteran&&<Tag label="Vet" color="#9f1239"/>}
        {team.is_length &&<Tag label="Len" color="#0369a1"/>}
      </div>
      <ArchetypePill id={team.archetype} small/>
    </div>
  );
}

// ── Matchup Card ──────────────────────────────────────────────────────────────

// ── Odds helpers ──────────────────────────────────────────────────────────────
function formatML(ml){
  if(!ml||ml==="TBD"||ml==="")return null;
  const n=parseInt(ml);
  if(isNaN(n))return null;
  const prob=n<0?Math.abs(n)/(Math.abs(n)+100)*100:100/(n+100)*100;
  return{display:ml,prob:prob.toFixed(0)};
}

function MatchupCard({ matchup, onTeamClick, scores, odds }) {
  const [expanded, setExpanded] = useState(false);
  const { team1, team2, site, date, time } = matchup;
  const a1 = team1 ? ARCH_MAP[team1.archetype] : null;
  const a2 = team2 ? ARCH_MAP[team2.archetype] : null;
  const fullTeam1 = team1 ? TEAMS_MAP[team1.id] : null;
  const fullTeam2 = team2 ? TEAMS_MAP[team2.id] : null;
  const o1 = team1 ? (odds||ODDS)[team1.name] : null;
  const o2 = team2 ? (odds||ODDS)[team2.name] : null;

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

  const TeamHeader = ({ team, arch, align }) => {
    if (!team) return <div style={{ padding:"10px 12px", color:"var(--color-text-tertiary)", fontSize:12 }}>TBD</div>;
    const isRight = align === "right";
    return (
      <div style={{ padding:"10px 12px", cursor:"pointer", textAlign:isRight?"right":"left" }}
        onClick={() => { const ft = isRight ? fullTeam2 : fullTeam1; if (ft) onTeamClick(ft); }}>
        <div style={{ display:"flex", alignItems:"center", gap:5, justifyContent:isRight?"flex-end":"flex-start", marginBottom:3 }}>
          <SeedBubble seed={team.seed} ff={team.is_ff||false}/>
          <span style={{ fontSize:14, fontWeight:600, color:"var(--color-text-primary)", lineHeight:1.2 }}>{team.name}</span>
          <ResultBanner teamName={team.name} scores={scores} gameDate={matchup.date}/>
        </div>
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", justifyContent:isRight?"flex-end":"flex-start", marginBottom:4 }}>
          <ArchetypePill id={team.archetype} small/>
          {team.is_veteran && <Tag label="Vet" color="#9f1239"/>}
          {team.is_length  && <Tag label="Len" color="#0369a1"/>}
          <PaceDot label={team.pace_label}/>
        </div>
        {team.barthag!=null && (
          <div style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>
            Barthag <b style={{ color:"var(--color-text-secondary)" }}>{team.barthag.toFixed(3)}</b>
            {team.rr!=null && <span> · RR <b style={{ color:"var(--color-text-secondary)" }}>{team.rr.toFixed(1)}</b></span>}
          </div>
        )}
      </div>
    );
  };

  // Odds strip between the two team headers
  const hasOdds = o1?.ok || o2?.ok;
  const fmtSpread = s => { if(!s||s==="TBD") return null; const n=parseFloat(s); return isNaN(n)?null:(n>0?`+${n}`:String(n)); };
  const sprd1 = o1?.ok && o1.s ? fmtSpread(o1.s) : null;
  const sprd2 = o2?.ok && o2.s ? fmtSpread(o2.s) : null;

  return (
    <div style={{ border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, overflow:"hidden" }}>

      {/* Header bar */}
      <div style={{ background:"var(--color-background-secondary)", padding:"6px 12px", display:"flex", alignItems:"center", gap:8, borderBottom:"0.5px solid var(--color-border-tertiary)", flexWrap:"wrap" }}>
        {matchup.is_ff && <Tag label="First Four" color="#b45309"/>}
        <span style={{ fontSize:11, color:"var(--color-text-secondary)", fontWeight:500 }}>{site}</span>
        <span style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>{date}{time?" · "+fmt12h(time)+" ET":""}</span>
      </div>

      {/* Team name headers side by side */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 32px 1fr", borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
        <TeamHeader team={team1} arch={a1} align="left"/>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"var(--color-text-tertiary)", borderLeft:"0.5px solid var(--color-border-tertiary)", borderRight:"0.5px solid var(--color-border-tertiary)" }}>vs</div>
        <TeamHeader team={team2} arch={a2} align="right"/>
      </div>

      {/* TBD placeholder when opponent pending First Four */}
      {team1 && !team2 && (
        <div style={{ padding:"12px 14px", textAlign:"center", color:"var(--color-text-tertiary)", fontSize:12, borderTop:"0.5px solid var(--color-border-tertiary)", background:"var(--color-background-secondary)" }}>
          Opponent TBD — stat comparison available after First Four
        </div>
      )}

      {/* Odds strip */}
      {hasOdds && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 64px 1fr", borderBottom:"0.5px solid var(--color-border-tertiary)", background:"var(--color-background-secondary)" }}>
          <div style={{ padding:"5px 12px" }}>
            {sprd1 && <span style={{ fontSize:12, fontWeight:600, color:parseFloat(o1.s)<0?"#1a6b3a":"var(--color-text-secondary)" }}>{sprd1}</span>}
            {o1?.ml && <span style={{ fontSize:11, color:"var(--color-text-tertiary)", marginLeft:6 }}>{o1.ml}</span>}
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"var(--color-text-tertiary)", borderLeft:"0.5px solid var(--color-border-tertiary)", borderRight:"0.5px solid var(--color-border-tertiary)", textAlign:"center", lineHeight:1.3 }}>
            {o1?.ou ? <>O/U<br/>{o1.ou}</> : "—"}
          </div>
          <div style={{ padding:"5px 12px", textAlign:"right" }}>
            {o2?.ml && <span style={{ fontSize:11, color:"var(--color-text-tertiary)", marginRight:6 }}>{o2.ml}</span>}
            {sprd2 && <span style={{ fontSize:12, fontWeight:600, color:parseFloat(o2.s)<0?"#1a6b3a":"var(--color-text-secondary)" }}>{sprd2}</span>}
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
            transform: expanded ? "rotate(-90deg)" : "rotate(90deg)",
            transition:"transform 0.15s" }}>›</span>
        </div>
      )}

      {/* Butterfly bars */}
      {(team1 && team2) && expanded && (
        <div>
          {KEY_ATTRS.map(a => {
            const v1 = team1?.[a.key] ?? null;
            const v2 = team2?.[a.key] ?? null;
            const pct1 = v1!=null ? ((v1-1)/9)*100 : 0;
            const pct2 = v2!=null ? ((v2-1)/9)*100 : 0;
            const w1 = v1!=null && v2!=null && v1 > v2;
            const w2 = v2!=null && v1!=null && v2 > v1;
            const c1 = a1?.color || "#888";
            const c2 = a2?.color || "#888";
            return (
              <div key={a.key} style={{ display:"grid", gridTemplateColumns:"1fr 36px 1fr", alignItems:"center", borderBottom:"0.5px solid var(--color-border-tertiary)", padding:"4px 12px", gap:0 }}>

                {/* Left bar — extends right-to-left */}
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ fontSize:10, fontWeight:w1?600:400, color:w1?"var(--color-text-primary)":"var(--color-text-tertiary)", width:24, textAlign:"right", flexShrink:0 }}>{f1(v1)}</span>
                  <div style={{ flex:1, height:5, background:"var(--color-border-tertiary)", borderRadius:3, overflow:"hidden", position:"relative" }}>
                    <div style={{ position:"absolute", right:0, top:0, height:"100%", width:`${pct1}%`, background:w1?c1:c1+"55", borderRadius:3 }}/>
                  </div>
                </div>

                {/* Label */}
                <div style={{ textAlign:"center", fontSize:10, color:"var(--color-text-tertiary)", padding:"0 2px" }}>{a.label}</div>

                {/* Right bar — extends left-to-right */}
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ flex:1, height:5, background:"var(--color-border-tertiary)", borderRadius:3, overflow:"hidden", position:"relative" }}>
                    <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${pct2}%`, background:w2?c2:c2+"55", borderRadius:3 }}/>
                  </div>
                  <span style={{ fontSize:10, fontWeight:w2?600:400, color:w2?"var(--color-text-primary)":"var(--color-text-tertiary)", width:24, textAlign:"left", flexShrink:0 }}>{f1(v2)}</span>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

// ── Matchups Tab ──────────────────────────────────────────────────────────────
function MatchupsTab({ onTeamClick, scores, lastUpdate, odds }) {
  const [filterRegion,  setFilterRegion]  = useState("All");
  const [filterRound,   setFilterRound]   = useState("All");
  const [sortBy,        setSortBy]        = useState("time");
  const [hideFinished,  setHideFinished]  = useState(true);

  const matchups = useMemo(() => {
    let filtered = MATCHUP_DATA.filter(m => {
      if (filterRegion !== "All" && m.region !== filterRegion) return false;
      if (filterRound  !== "All" && m.round  !== filterRound)  return false;
      return true;
    });
    // Hide games that have a completed result in scores
    if (hideFinished) {
      filtered = filtered.filter(m => {
        const s1 = scores?.[m.team1_name];
        return !s1?.some(r => r.state === "post" && r.date === m.date);
      });
    }
    if (sortBy === "time") {
      return [...filtered].sort((a,b) => {
        const da = a.date + (a.time||"99:99"), db = b.date + (b.time||"99:99");
        return da.localeCompare(db);
      });
    }
    return filtered;
  }, [filterRegion, filterRound, sortBy, hideFinished, scores]);

  // Group by region (or flat list for time sort)
  const grouped = useMemo(() => {
    if (sortBy === "time") {
      return { "By Time": matchups };
    }
    const g = {};
    for (const m of matchups) {
      const key = m.round === "First Four" ? "First Four" : m.region;
      if (!g[key]) g[key] = [];
      g[key].push(m);
    }
    return g;
  }, [matchups, sortBy]);

  const sectionOrder = sortBy === "time" ? ["By Time"] : ["First Four", ...REGIONS];

  return (
    <div>
      {/* Filters */}
      <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:"0.875rem", alignItems:"center" }}>
        <select value={filterRegion} onChange={e=>setFilterRegion(e.target.value)}
          style={{ fontSize:12, padding:"5px 7px", borderRadius:6, border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)" }}>
          <option value="All">All Regions</option>
          {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filterRound} onChange={e=>setFilterRound(e.target.value)}
          style={{ fontSize:12, padding:"5px 7px", borderRadius:6, border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)" }}>
          <option value="All">All Rounds</option>
          <option value="First Four">First Four</option>
          <option value="First Round">First Round</option>
          <option value="Round of 32">Round of 32</option>
        </select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{ fontSize:12, padding:"5px 7px", borderRadius:6, border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)" }}>
          <option value="region">Group by region</option>
          <option value="time">Sort by time</option>
        </select>
        <button onClick={()=>setHideFinished(h=>!h)}
          style={{ fontSize:11, padding:"5px 9px", borderRadius:6, border:"0.5px solid var(--color-border-secondary)",
            background: hideFinished ? "var(--color-background-info)" : "var(--color-background-primary)",
            color: hideFinished ? "var(--color-text-info)" : "var(--color-text-secondary)",
            cursor:"pointer", fontWeight: hideFinished ? 500 : 400 }}>
          {hideFinished ? "✓ Hiding finished" : "Hide finished"}
        </button>
        <span style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>{matchups.length} matchup{matchups.length!==1?"s":""}</span>
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
              {section !== "First Four" && section !== "By Time" && <span style={{ width:8, height:8, borderRadius:"50%", background:REGION_COLORS[section]||"#888", display:"inline-block", flexShrink:0 }}/>}
              <span style={{ fontSize:13, fontWeight:600, color:section==="First Four"?"#b45309":section==="By Time"?"var(--color-text-secondary)":REGION_COLORS[section]||"var(--color-text-primary)" }}>
                {section === "First Four" ? "First Four — Dayton, OH" : section === "By Time" ? `${matchups.length} games by tip-off time` : `${section} Region`}
              </span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
              {games.map((m, i) => <MatchupCard key={i} matchup={m} onTeamClick={onTeamClick} scores={scores} odds={odds}/>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Classifier Tab ────────────────────────────────────────────────────────────
function ClassifierTab({ onTeamClick, scores }) {
  const [filterRegion, setFilterRegion] = useState("All");
  const [filterArch,   setFilterArch]   = useState("All");
  const [filterPace,   setFilterPace]   = useState("All");
  const [filterTag,    setFilterTag]    = useState("All");
  const [search,       setSearch]       = useState("");
  const [view,         setView]         = useState("list");
  const [sortBy,       setSortBy]       = useState("kenpom");

  const visible = useMemo(() => {
    let t = TEAMS_WITH_CP.filter(t => {
      if (filterRegion!=="All" && t.region!==filterRegion) return false;
      if (filterArch!=="All"   && t.archetype!==filterArch) return false;
      if (filterPace!=="All"   && t.pace_label!==filterPace) return false;
      if (filterTag==="Veteran"   && !t.is_veteran) return false;
      if (filterTag==="Length"    && !t.is_length)  return false;
      if (filterTag==="First Four"&& !t.is_ff)      return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    const avgRank = t => {
      const kp = t.kenpom_rank < 999 ? t.kenpom_rank : null;
      const em = t.em_rank ? parseInt(t.em_rank) : null;
      if (kp && em) return (kp + em) / 2;
      return kp ?? em ?? 999;
    };
    return [...t].sort((a,b)=>{
      if (sortBy==="kenpom")  return avgRank(a) - avgRank(b);
      if (sortBy==="seed")    return a.seed!==b.seed?a.seed-b.seed:a.region.localeCompare(b.region);
      if (sortBy==="rr")      return (b.rr??-999)-(a.rr??-999);
      if (sortBy==="barthag") return (b.barthag??-999)-(a.barthag??-999);
      if (sortBy==="name")    return a.name.localeCompare(b.name);
      return 0;
    });
  }, [filterRegion, filterArch, filterPace, filterTag, search, sortBy]);

  const byArchetype = useMemo(()=>{
    const g = Object.fromEntries(TEAM_DATA.archetypes.map(a=>[a.id,[]]));
    visible.forEach(t=>{if(g[t.archetype])g[t.archetype].push(t);});
    return g;
  },[visible]);

  return (
    <div>
      {/* Archetype pills */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:"0.75rem" }}>
        {TEAM_DATA.archetypes.map(a=>(
          <button key={a.id} onClick={()=>setFilterArch(filterArch===a.id?"All":a.id)} style={{
            padding:"4px 10px", fontSize:11, borderRadius:20, cursor:"pointer",
            border:`1px solid ${filterArch===a.id?a.color:a.color+"44"}`,
            background:filterArch===a.id?a.color+"22":"transparent",
            color:filterArch===a.id?a.color:"var(--color-text-secondary)",
            fontWeight:filterArch===a.id?600:400, transition:"all 0.15s",
          }}>{a.name}</button>
        ))}
        {filterArch!=="All"&&<button onClick={()=>setFilterArch("All")} style={{ padding:"4px 8px", fontSize:10, borderRadius:20, cursor:"pointer", border:"0.5px solid var(--color-border-secondary)", background:"transparent", color:"var(--color-text-tertiary)" }}>✕</button>}
      </div>

      {/* Filter row */}
      <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:"0.75rem", alignItems:"center" }}>
        <input type="text" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ padding:"5px 9px", fontSize:12, borderRadius:6, border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)", width:120 }}/>
        <select value={filterRegion} onChange={e=>setFilterRegion(e.target.value)} style={{ fontSize:12,padding:"5px 7px",borderRadius:6,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)" }}>
          <option value="All">All Regions</option>
          {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filterPace} onChange={e=>setFilterPace(e.target.value)} style={{ fontSize:12,padding:"5px 7px",borderRadius:6,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)" }}>
          <option value="All">All Tempos</option>
          <option value="Fast">Fast</option>
          <option value="Moderate">Moderate</option>
          <option value="Slow">Slow</option>
        </select>
        <select value={filterTag} onChange={e=>setFilterTag(e.target.value)} style={{ fontSize:12,padding:"5px 7px",borderRadius:6,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)" }}>
          <option value="All">All Tags</option>
          <option value="Veteran">Veteran</option>
          <option value="Length">Length</option>
          <option value="First Four">First Four</option>
        </select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ fontSize:12,padding:"5px 7px",borderRadius:6,border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)" }}>
          <option value="kenpom">KenPom / EM Rank</option>
          <option value="seed">Seed</option>
          <option value="rr">EvanMiya RR</option>
          <option value="barthag">Barthag</option>
          <option value="name">Name</option>
        </select>
        <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
          {["list","archetype"].map(m=>(
            <button key={m} onClick={()=>setView(m)} style={{ padding:"5px 9px",fontSize:11,borderRadius:6,cursor:"pointer",border:"0.5px solid var(--color-border-secondary)",background:view===m?"var(--color-background-info)":"var(--color-background-primary)",color:view===m?"var(--color-text-info)":"var(--color-text-secondary)",fontWeight:view===m?500:400 }}>
              {m==="list"?"By Seed":"By Archetype"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize:11, color:"var(--color-text-tertiary)", marginBottom:6 }}>{visible.length} team{visible.length!==1?"s":""}</div>

      {view==="list" && (
        <div style={{ border:"0.5px solid var(--color-border-tertiary)", borderRadius:10, overflow:"hidden" }}>
          {visible.length===0
            ? <div style={{ padding:"2rem", textAlign:"center", fontSize:13, color:"var(--color-text-tertiary)" }}>No teams match filters.</div>
            : visible.map(t=><TeamRow key={t.id} team={t} onClick={()=>onTeamClick(t)} eliminated={scores?.[t.name]?.some(r=>r.winner===false&&r.state==="post")}/>)
          }
        </div>
      )}

      {view==="archetype" && (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.875rem" }}>
          {TEAM_DATA.archetypes.map(arch=>{
            const teams=byArchetype[arch.id];
            if(!teams?.length) return null;
            return (
              <div key={arch.id} style={{ border:"0.5px solid var(--color-border-tertiary)", borderRadius:10, overflow:"hidden" }}>
                <div style={{ background:arch.color+"12", borderBottom:`0.5px solid ${arch.color}30`, padding:"8px 12px", display:"flex", alignItems:"center", gap:9 }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",background:arch.color,flexShrink:0 }}/>
                  <span style={{ fontSize:13,fontWeight:600,color:arch.color }}>{arch.name}</span>
                  <span style={{ fontSize:11,color:"var(--color-text-tertiary)" }}>— {arch.description}</span>
                  <span style={{ marginLeft:"auto",fontSize:11,color:"var(--color-text-tertiary)" }}>{teams.length}</span>
                </div>
                {teams.map(t=><TeamRow key={t.id} team={t} onClick={()=>onTeamClick(t)} eliminated={scores?.[t.name]?.some(r=>r.winner===false&&r.state==="post")}/>)}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop:"1.25rem", padding:"0.875rem 1rem", background:"var(--color-background-secondary)", borderRadius:10, border:"0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ fontSize:10, fontWeight:500, color:"var(--color-text-secondary)", marginBottom:5 }}>Tags</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"3px 16px", marginBottom:5 }}>
          <span style={{ fontSize:10, color:"var(--color-text-tertiary)" }}><b style={{ color:"#9f1239" }}>Veteran</b> — experience ≥ 7.5 (top ~30%)</span>
          <span style={{ fontSize:10, color:"var(--color-text-tertiary)" }}><b style={{ color:"#0369a1" }}>Length</b> — avg height ≥ 78.7" (top ~22%)</span>
        </div>
        <div style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>Attributes 1–10, normalized to 2026 field. Pace is a modifier. Barthag + RR from EvanMiya.</div>
      </div>
    </div>
  );
}


// ── Glossary Tab ──────────────────────────────────────────────────────────────
function GlossaryTab() {
  const ARCHETYPES_FULL = [
    {id:"two_way_machine",    color:"#1a6b3a",name:"Two-Way Machine",     thresh:"AdjO ≥ 7.0 AND AdjD ≥ 7.0", desc:"Elite on both ends with no exploitable weakness. Wins with margin — scores efficiently and makes every possession a grind on defense. Blue-blood tournament profile. Historically the most reliable Final Four archetype.",examples:"Duke, Michigan, Arizona, Florida, Houston, Iowa State, Michigan State"},
    {id:"offensive_juggernaut",color:"#c2410c",name:"Offensive Juggernaut",thresh:"AdjO ≥ 8.0, AdjD < 7.0",   desc:"Among the most historically elite offenses in the field. Scores from everywhere. Defense is secondary but good enough not to give games away. Can torch any team on a given night but vulnerable when shots don't fall.",examples:"Illinois, Purdue, Arkansas, Alabama, Vanderbilt"},
    {id:"defensive_fortress",  color:"#0d3b6e",name:"Defensive Fortress",  thresh:"AdjD ≥ 6.5, AdjO < 7.0",  desc:"Suffocating defense built on rim protection, arc lockdown, or pressure. Every game becomes a low-scoring grind. Wins by limiting opponents' best weapons and forcing bad shots. Mid-major Fortresses that slow the game down are dangerous upset picks.",examples:"UConn, Michigan State, Kansas, Virginia, Nebraska, Gonzaga, Tennessee"},
    {id:"gunslinger",          color:"#7c3aed",name:"Gunslinger",           thresh:"3PT ≥ 6.0 AND FTG ≥ 7.0",  desc:"Attacks from the arc AND draws fouls relentlessly, forcing the defense to make an impossible choice. The combination of both weapons makes them uniquely hard to game-plan against. Rare and dangerous.",examples:"VCU, Miami (Ohio)"},
    {id:"sniper_system",       color:"#0891b2",name:"Sniper System",        thresh:"3PT ≥ 6.5, FTG < 7.0",    desc:"Team identity is the three-pointer — high volume AND high efficiency. Lives and dies by the arc. In a hot shooting game can beat anyone. Cold shooting nights are existential.",examples:"Louisville, Texas Tech, Wisconsin, Saint Louis, NC State, Akron"},
    {id:"offensive_engine",    color:"#b45309",name:"Offensive Engine",     thresh:"AdjO ≥ 7.0, AdjD < 7.0",  desc:"Offensively capable but without a dominant statistical identity or strong defense. Scores well in multiple ways and can put up points in bunches, but is vulnerable to teams that can control pace and limit possessions.",examples:"UCLA, Ohio State, BYU, Georgia, Santa Clara, SMU"},
    {id:"foul_line_bully",     color:"#9f1239",name:"Foul-Line Bully",      thresh:"FTG ≥ 7.5, 3PT < 6.5",    desc:"Gets to the line relentlessly and makes opponents pay in foul trouble. Physical, paint-dominant, aggressive. Can bully smaller teams and wreak havoc on foul-prone opponents.",examples:"South Florida, Missouri, High Point, Kennesaw State, Hawai'i, Texas"},
    {id:"system_operator",     color:"#475569",name:"System Operator",      thresh:"Catch-all",                desc:"Wins through execution, discipline, and coaching. Low turnovers, efficient half-court offense, hard to put away. Many mid-major upsets come from System Operators that slow the game and don't beat themselves.",examples:"UCF, North Carolina, Villanova, McNeese, Miami (FL)"},
  ];

  const ATTRS_FULL = [
    {short:"3PT", label:"3-Point Prowess",    source:"KenPom",          formula:"Average of normalized 3P% and 3PAr",           range:"3P%: 30.4–40.5% · 3PAr: 26.8–53.7%",         direction:"Higher = better",              why:"Combines shooting efficiency (3P%) with shot selection volume (3PAr — share of shots that are threes). A team scoring 8.0+ shoots well from deep and hunts the three consistently."},
    {short:"FTG", label:"Free Throw Gen.",    source:"KenPom",          formula:"Normalized FTR (FTA/FGA)",                     range:"25.7–45.1",                                   direction:"Higher = more FTs drawn",       why:"Measures how aggressively a team attacks the rim and draws contact. High FTG teams are physical, get into the bonus early, and take pressure off the half-court offense."},
    {short:"AdjO",label:"Off. Efficiency",   source:"KenPom",          formula:"Normalized Adjusted Offensive Efficiency",     range:"105.6–131.6 pts per 100 poss",                direction:"Higher = more efficient",       why:"The single most predictive offensive metric. Adjusts for opponent strength and pace. Underpins the Offensive Juggernaut and Two-Way Machine classifications."},
    {short:"TO",  label:"Ball Security",      source:"KenPom",          formula:"Normalized TO% (inverted)",                    range:"12.3–19.0% turnover rate",                    direction:"Higher = fewer turnovers",      why:"Turnovers are free possessions for the opponent. In tournament basketball where every possession matters, this is a quiet but crucial differentiator."},
    {short:"ORB", label:"Off. Rebounding",    source:"KenPom",          formula:"Normalized ORB%",                              range:"22.0–45.1%",                                  direction:"Higher = more off. rebounds",   why:"Second-chance points and extended possessions. Elite offensive rebounders like Tennessee (10.0) and Florida (9.2) effectively give themselves extra shots per game."},
    {short:"AdjD",label:"Def. Efficiency",   source:"KenPom",          formula:"Normalized Adjusted Defensive Efficiency (inv)",range:"89.0–117.2 pts per 100 poss",                direction:"Higher = fewer pts allowed",    why:"Primary driver of the Defensive Fortress archetype. Adjusts for opponent strength. Duke and Michigan both score 10.0 — the best defenses in the field."},
    {short:"3PD", label:"Opp 3P% Allowed",   source:"KenPom",          formula:"Normalized Opp 3P% (inverted)",                range:"28.9–36.5%",                                  direction:"Higher = better arc defense",   why:"As the tournament field increasingly relies on threes, arc defense becomes a major factor in upsets. Northern Iowa leads the field (10.0)."},
    {short:"BLK", label:"Rim Protection",     source:"KenPom",          formula:"Normalized Block%",                            range:"6.0–17.5%",                                   direction:"Higher = more shots blocked",   why:"Interior shot-blocking deters drives and forces lower-percentage shots. Virginia leads the field (10.0)."},
    {short:"STL", label:"Pressure Defense",   source:"KenPom",          formula:"Normalized Steal%",                            range:"5.6–15.3%",                                   direction:"Higher = more disruptive",      why:"High-steal teams turn defense into offense frequently and signal press-heavy or trap-heavy schemes."},
    {short:"EXP", label:"Experience",         source:"KenPom",          formula:"Normalized D-1 Experience (years)",            range:"0.74–2.72 years",                             direction:"Higher = more experienced",     why:"Experienced teams handle pressure, late-game situations, and hostile environments better. The Veteran tag identifies the top ~30% of the field on this dimension."},
    {short:"CPG", label:"Coaching Pedigree",  source:"Manual (7 yrs)",  formula:"Appearance rate, win rate, system consistency",range:"1–10",                                        direction:"Higher = stronger track record",why:"The only manually-scored attribute. Coaching matters most in close games and late-game adjustments. * = fewer than 3 tournament appearances in the window — valid direction but small sample."},
  ];

  const PACE_DEF = {
    Fast:     "70.0+ possessions per 40 min. Up-tempo, push-pace style. More total possessions per game, scores run up quickly, outlier performances are more likely in either direction. Teams that want to slow them down have to foul or force resets.",
    Moderate: "67.0–69.9 possessions per 40 min. Balanced game flow — neither side is forcing tempo. Most tournament teams fall here. Game outcomes are less skewed by pace and more determined by execution.",
    Slow:     "Under 67.0 possessions per 40 min. Methodical, half-court heavy. Fewer possessions and lower scoring totals. Every basket is earned. Late-game situations matter more because there are fewer of them. Teams like Virginia and Houston use slow pace as a deliberate strategic weapon.",
  };

  const TAGS = [
    {label:"Veteran",color:"#9f1239",threshold:"Experience score ≥ 7.5",coverage:"~top 30% of field (21 teams)",desc:"Identifies rosters with significantly above-average D-1 experience. Veteran teams are statistically better in close games, late-game situations, and hostile environments. Notable: Gonzaga (10.0), SMU (10.0), Iowa State (9.3), Texas A&M (9.5)."},
    {label:"Length", color:"#0369a1",threshold:'Avg height ≥ 78.7"',   coverage:"~top 22% of field (14 teams)",desc:'Identifies teams with elite average height — a proxy for rim protection and rebounding matchup advantages. Illinois leads the field at 80.0". Also: Duke 79.3", Arizona 79.0", North Carolina 79.2".'},
  ];

  const SUPP = [
    {short:"Barthag",source:"EvanMiya",desc:"Tournament win probability — the likelihood of beating an average tournament team on a neutral floor (0–1). The most direct single-number read on tournament caliber. Duke 0.981, Michigan 0.980."},
    {short:"RR",     source:"EvanMiya",desc:"Relative Rating — EvanMiya's composite team strength score. Higher is better. Comparable across all D-1 teams. Duke leads the 2026 tournament field at 34.8."},
    {short:"EM Rank",source:"EvanMiya",desc:"EvanMiya national ranking. Shows where a team sits in the full D-1 landscape, not just the tournament field."},
    {short:"KP Rank",source:"KenPom", desc:"KenPom national ranking. Used as the default sort on the Team Classifier tab. An independent cross-reference on team quality separate from EvanMiya."},
  ];

  const Section = ({title,children}) => (
    <div style={{marginBottom:"2rem"}}>
      <h2 style={{fontSize:15,fontWeight:600,color:"var(--color-text-primary)",marginBottom:"0.875rem",paddingBottom:"0.5rem",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>{title}</h2>
      {children}
    </div>
  );
  const Card = ({children,accent}) => (
    <div style={{background:"var(--color-background-secondary)",border:`0.5px solid ${accent?accent+"33":"var(--color-border-tertiary)"}`,borderLeft:accent?`3px solid ${accent}`:undefined,borderRadius:"var(--border-radius-lg)",padding:"0.875rem",marginBottom:"0.75rem"}}>
      {children}
    </div>
  );

  return (
    <div style={{maxWidth:720}}>
      <div style={{marginBottom:"1.5rem",padding:"1rem",background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-lg)",border:"0.5px solid var(--color-border-tertiary)"}}>
        <p style={{margin:0,fontSize:13,color:"var(--color-text-secondary)",lineHeight:1.7}}>All team scores are computed from <strong>KenPom</strong> and <strong>EvanMiya</strong> subscription data scraped for the 2026 tournament field. Each scored attribute is normalized to the actual range of the 64-team field — a 5.0 is exactly median, 1.0 is worst in field, 10.0 is best. Coaching Pedigree is the only manually-scored attribute.</p>
      </div>

      <Section title="Archetypes">
        <p style={{fontSize:12,color:"var(--color-text-tertiary)",marginBottom:"1rem",lineHeight:1.6}}>Each team gets exactly one archetype via a weighted scoring engine. Checked in priority order — Two-Way Machine first, System Operator last. Thresholds are hard requirements; anti-thresholds prevent overlap between adjacent archetypes.</p>
        {ARCHETYPES_FULL.map(a=>(
          <Card key={a.id} accent={a.color}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:a.color,flexShrink:0}}/>
              <span style={{fontSize:14,fontWeight:600,color:a.color}}>{a.name}</span>
              <span style={{fontSize:10,color:"var(--color-text-tertiary)",marginLeft:"auto",background:"var(--color-background-primary)",padding:"2px 7px",borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",whiteSpace:"nowrap"}}>{a.thresh}</span>
            </div>
            <p style={{margin:"0 0 6px",fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.65}}>{a.desc}</p>
            <p style={{margin:0,fontSize:11,color:"var(--color-text-tertiary)"}}><span style={{fontWeight:500,color:"var(--color-text-secondary)"}}>2026 examples: </span>{a.examples}</p>
          </Card>
        ))}
      </Section>

      <Section title="Scored attributes (1–10)">
        <p style={{fontSize:12,color:"var(--color-text-tertiary)",marginBottom:"1rem",lineHeight:1.6}}>Normalized to the 2026 tournament field. 5.0 = field median. 1.0 = worst in field. 10.0 = best. Inverted attributes are flipped so higher always means better.</p>
        {ATTRS_FULL.map(a=>(
          <Card key={a.short}>
            <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:6,flexWrap:"wrap"}}>
              <span style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)",fontFamily:"monospace"}}>{a.short}</span>
              <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{a.label}</span>
              <span style={{marginLeft:"auto",fontSize:10,color:"var(--color-text-tertiary)"}}>{a.source}</span>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:"3px 16px",marginBottom:7}}>
              <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}><b style={{color:"var(--color-text-secondary)"}}>Formula:</b> {a.formula}</span>
              <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}><b style={{color:"var(--color-text-secondary)"}}>Range:</b> {a.range}</span>
              <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}><b style={{color:"var(--color-text-secondary)"}}>Direction:</b> {a.direction}</span>
            </div>
            <p style={{margin:0,fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.65}}>{a.why}</p>
          </Card>
        ))}
      </Section>

      <Section title="Pace">
        <p style={{fontSize:12,color:"var(--color-text-tertiary)",marginBottom:"1rem",lineHeight:1.6}}>KenPom Adjusted Tempo — possessions per 40 minutes, adjusted for opponent pace. Pace is a modifier in archetype scoring, not a scored attribute, because tempo alone doesn't define quality.</p>
        {Object.entries(PACE_DEF).map(([label, desc]) => (
          <Card key={label} accent={PACE_COLORS[label]}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <PaceDot label={label}/>
              <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>
                {label==="Fast"?"70.0+ poss/40 min":label==="Moderate"?"67.0–69.9 poss/40 min":"< 67.0 poss/40 min"}
              </span>
            </div>
            <p style={{margin:0,fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.65}}>{desc}</p>
          </Card>
        ))}
      </Section>

      <Section title="Tags">
        {TAGS.map(t=>(
          <Card key={t.label} accent={t.color}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
              <span style={{fontSize:13,fontWeight:600,color:t.color}}>{t.label}</span>
              <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{t.threshold}</span>
              <span style={{marginLeft:"auto",fontSize:10,color:"var(--color-text-tertiary)"}}>{t.coverage}</span>
            </div>
            <p style={{margin:0,fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.65}}>{t.desc}</p>
          </Card>
        ))}
      </Section>

      <Section title="Supplemental metrics">
        <p style={{fontSize:12,color:"var(--color-text-tertiary)",marginBottom:"1rem",lineHeight:1.6}}>These appear on team cards but don't feed into archetype scoring. They provide independent validation and additional context.</p>
        {SUPP.map(s=>(
          <Card key={s.short}>
            <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:5,flexWrap:"wrap"}}>
              <span style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)",fontFamily:"monospace"}}>{s.short}</span>
              <span style={{marginLeft:"auto",fontSize:10,color:"var(--color-text-tertiary)"}}>{s.source}</span>
            </div>
            <p style={{margin:0,fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.65}}>{s.desc}</p>
          </Card>
        ))}
      </Section>

      <Section title="Picks & Analysis models">
        <Card accent="#1d4ed8">
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
            <span style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)",fontFamily:"monospace"}}>jbScore</span>
            <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>Team Quality Baseline</span>
            <span style={{marginLeft:"auto",fontSize:10,color:"var(--color-text-tertiary)"}}>0–100 · KenPom + EvanMiya</span>
          </div>
          <p style={{margin:"0 0 8px",fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.65}}>
            Composite team quality score, normalized to the 2026 tournament field (not all of D-1). Every input stat is min-max scaled across the 68-team field before weighting, so 50.0 is exactly field median.
          </p>
          <div style={{fontSize:11,color:"var(--color-text-tertiary)",lineHeight:1.8}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:"2px 20px"}}>
              {[["AdjO","15%","Adjusted offensive efficiency"],["AdjD","10%","Adjusted defensive efficiency (inv)"],["NetRTG","10%","AdjO − AdjD"],["3P%","10%","Three-point percentage"],["3PAr","7%","Three-point attempt rate"],["FTR","7%","Free throw rate"],["TO%","7%","Turnover rate (inverted)"],["Steal%","5%","Steal percentage"],["Barthag","8%","EvanMiya power rating"],["RR","7%","EvanMiya resume rating"],["EM Rank","8%","EvanMiya rank (inv)"],["KP Rank","6%","KenPom rank (inv)"]].map(([stat,wt,desc])=>(
                <span key={stat} style={{whiteSpace:"nowrap"}}><b style={{color:"var(--color-text-secondary)"}}>{stat}</b> {wt} — {desc}</span>
              ))}
            </div>
          </div>
          <p style={{margin:"8px 0 0",fontSize:11,color:"var(--color-text-tertiary)"}}>2026 range: 11.3 (Lehigh) → 82.3 (Duke). Teams without KenPom data use a Barthag-only fallback: Barthag × 45.</p>
        </Card>

        <Card accent="#0f766e">
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
            <span style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)",fontFamily:"monospace"}}>jbGap</span>
            <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>Matchup Quality Differential</span>
            <span style={{marginLeft:"auto",fontSize:10,color:"var(--color-text-tertiary)"}}>jbScore(fav) − jbScore(dog)</span>
          </div>
          <p style={{margin:"0 0 8px",fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.65}}>
            The gap between the favorite's and underdog's jbScore. Smaller gap = closer game on paper = more upset-dangerous. Used as the heatmap color on every card in the Picks tab. Calibrated to the 2026 field (mean 24.1, stdev 19.8).
          </p>
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
            {[[-2,"#b91c1c","#fecaca","Pick the dog"],[2,"#c2410c","#fed7aa","Coin flip"],[6,"#854d0e","#fef08a","Danger zone"],[10,"#b45309","#fde68a","Live underdog"],[15,"#3f6212","#d9f99d","Moderate gap"],[20,"#166534","#bbf7d0","Lean favorite"],[28,"#0f766e","#99f6e4","Chalk"],[40,"#1d4ed8","#bfdbfe","Blowout city"]].map(([,bg,text,label])=>(
              <span key={label} style={{fontSize:10,padding:"2px 7px",borderRadius:4,background:bg,color:text,fontWeight:500}}>{label}</span>
            ))}
          </div>
        </Card>

        <Card accent="#dc2626">
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
            <span style={{fontSize:13,fontWeight:600,color:"var(--color-text-primary)",fontFamily:"monospace"}}>Upset Score</span>
            <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>Possession-Volatility Edge</span>
            <span style={{marginLeft:"auto",fontSize:10,color:"var(--color-text-tertiary)"}}>−25 to +25 · positive = dog edge</span>
          </div>
          <p style={{margin:"0 0 8px",fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.65}}>
            Measures the statistical edges that generate upset probability — specifically the volatile, possession-level mismatches that can swing a single-game elimination. Positive score means the underdog has meaningful advantages. Each component is scaled to roughly −1/+1 before weighting.
          </p>
          <div style={{fontSize:11,color:"var(--color-text-tertiary)",lineHeight:1.8}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:"2px 20px"}}>
              {[["Turnover Differential","25%","(dog.steal − dog.TO%) vs (fav.steal − fav.TO%) ÷ 15"],["3P Volatility","20%","(dog.3PAr×dog.3P% − fav.3PAr×fav.3P%) ÷ 0.14"],["Offensive Rebounding","20%","(dog.ORB − fav.ORB) ÷ 23"],["FTR Edge","15%","(dog.FTR − fav.FTR) ÷ 25"],["Arc Defense Edge","10%","(fav.Opp3P% − dog.Opp3P%) ÷ 8"],["Tempo Edge","10%","(dog.AdjT − fav.AdjT) ÷ 11"]].map(([comp,wt,calc])=>(
                <span key={comp} style={{whiteSpace:"nowrap"}}><b style={{color:"var(--color-text-secondary)"}}>{comp}</b> {wt} — {calc}</span>
              ))}
            </div>
          </div>
          <p style={{margin:"8px 0 0",fontSize:11,color:"var(--color-text-tertiary)"}}>2026 range: −24.3 to +16.1. Strong candidate threshold: above +10. R64 hit rate on strong candidates (above +11): 3 of 3 (100%).</p>
        </Card>
      </Section>

      <Section title="Methodology">
        <Card>
          <p style={{margin:"0 0 8px",fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.7}}><strong>Normalization</strong> is calibrated to the 2026 tournament field, not all of college basketball. A 5.0 on AdjO = median for a tournament team, which is still elite in absolute terms.</p>
          <p style={{margin:"0 0 8px",fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.7}}><strong>Archetype assignment</strong> uses a weighted scoring engine with hard thresholds and anti-thresholds. A team must clear every threshold to be eligible. Anti-thresholds prevent adjacent archetypes from firing when a team is elite on multiple dimensions simultaneously.</p>
          <p style={{margin:0,fontSize:12,color:"var(--color-text-secondary)",lineHeight:1.7}}><strong>Coaching Pedigree</strong> is scored manually from the last 7 tournament seasons (2019–2025, excluding 2020). A * flag means fewer than 3 appearances — directionally valid but treat with caution.</p>
        </Card>
        <Card>
          <p style={{margin:"0 0 6px",fontSize:12,fontWeight:500,color:"var(--color-text-primary)"}}>Data sources</p>
          {[
            ["KenPom","AdjO, AdjD, AdjT, 3P%, 3PAr, FTR, TO%, ORB%, Block%, Steal%, Opp 3P%, Experience, Avg Height"],
            ["EvanMiya","Barthag, Relative Rating, Off/Def BPR, national rank"],
            ["Coaching Pedigree","Manually scored — last 7 seasons (2019–2025, excl. 2020). * = <3 appearances"],
            ["Odds","DraftKings lines via ESPN scrape + manual moneyline entry"],
          ].map(([src,detail])=>(
            <div key={src} style={{fontSize:11,color:"var(--color-text-tertiary)",marginBottom:4}}>
              <span style={{fontWeight:500,color:"var(--color-text-secondary)"}}>{src}: </span>{detail}
            </div>
          ))}
        </Card>
      </Section>
    </div>
  );
}

// ── Picks & Analysis Tab ─────────────────────────────────────────────────────
// jbScore = team quality baseline (0-100, normalized to tournament field)
// Upset Score = possession-volatility overlay per matchup (dog vs fav)
//   Inputs: TO differential, 3P volatility, ORB edge, FTR edge, arc D, tempo
//   Source: KenPom scraped stats (kenpom_scraper.py)


function TeamPicker({ label, selected, search, setSearch, focused, setFocused, onSelect, onClear, filteredTeams, jbScore }) {
  return (
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontSize:10, fontWeight:600, color:"var(--color-text-tertiary)",
        textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{label}</div>
      {selected ? (
        <div style={{ border:`2px solid ${ARCH_MAP[selected.archetype]?.color||"#888"}`,
          borderRadius:10, overflow:"hidden" }}>
          {/* Selected team card */}
          <div style={{ padding:"10px 12px", background:"var(--color-background-secondary)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                  <SeedBubble seed={selected.seed} ff={selected.is_ff||false}/>
                  <span style={{ fontSize:16, fontWeight:700, color:"var(--color-text-primary)" }}>{selected.name}</span>
                </div>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  <ArchetypePill id={selected.archetype}/>
                  {selected.is_veteran && <Tag label="Veteran" color="#9f1239"/>}
                  {selected.is_length  && <Tag label="Length"  color="#0369a1"/>}
                  <PaceDot label={selected.pace_label}/>
                </div>
              </div>
              <button onClick={onClear} style={{ background:"none", border:"none", cursor:"pointer",
                color:"var(--color-text-tertiary)", fontSize:16, lineHeight:1, padding:2 }}>✕</button>
            </div>
            {selected.barthag != null && (
              <div style={{ display:"flex", gap:12, marginTop:8, fontSize:11, color:"var(--color-text-secondary)" }}>
                <span>Barthag <b>{selected.barthag?.toFixed(3)}</b></span>
                {selected.rr != null && <span>RR <b>{selected.rr?.toFixed(1)}</b></span>}
                {jbScore != null && <span>jbScore <b style={{ color:ARCH_MAP[selected.archetype]?.color }}>{jbScore.toFixed(1)}</b></span>}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ position:"relative" }}>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setFocused(true); }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder={`Search ${label}...`}
            style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:8,
              border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-primary)",
              color:"var(--color-text-primary)", fontSize:13, outline:"none" }}
          />
          {focused && search.length > 0 && (
            <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:100,
              background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-secondary)",
              borderRadius:8, marginTop:4, boxShadow:"0 4px 20px rgba(0,0,0,0.15)", overflow:"hidden" }}>
              {filteredTeams.map(t => (
                <div key={t.id} onMouseDown={() => { onSelect(t); setSearch(""); setFocused(false); }}
                  style={{ padding:"8px 12px", cursor:"pointer", display:"flex", alignItems:"center",
                    gap:8, borderBottom:"0.5px solid var(--color-border-tertiary)" }}
                  onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <SeedBubble seed={t.seed} ff={t.is_ff||false}/>
                  <span style={{ fontSize:13, color:"var(--color-text-primary)", fontWeight:500 }}>{t.name}</span>
                  <span style={{ marginLeft:"auto", fontSize:10, color:"var(--color-text-tertiary)" }}>{t.region}</span>
                  <ArchetypePill id={t.archetype} small/>
                </div>
              ))}
              {filteredTeams.length === 0 && (
                <div style={{ padding:"12px", fontSize:12, color:"var(--color-text-tertiary)", textAlign:"center" }}>No teams found</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  
  );
}
function CompareTab({ onTeamClick }) {
  const [teamA, setTeamA] = useState(null);
  const [teamB, setTeamB] = useState(null);
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [focusA, setFocusA] = useState(false);
  const [focusB, setFocusB] = useState(false);

  const ALL_ATTRS = [
    { key:"off_efficiency",   label:"Off Efficiency",  short:"AdjO" },
    { key:"def_efficiency",   label:"Def Efficiency",  short:"AdjD" },
    { key:"three_pt_prowess", label:"3PT Shooting",    short:"3PT"  },
    { key:"free_throw_gen",   label:"FT Generation",   short:"FTG"  },
    { key:"ball_security",    label:"Ball Security",   short:"TO"   },
    { key:"off_rebounding",   label:"Off Rebounding",  short:"ORB"  },
    { key:"rim_protection",   label:"Rim Protection",  short:"BLK"  },
    { key:"pressure_defense", label:"Press Defense",   short:"STL"  },
    { key:"opp_3pt_allowed",  label:"Arc Defense",     short:"3PD"  },
    { key:"experience",       label:"Experience",      short:"EXP"  },
  ];

  const filteredA = useMemo(() =>
    TEAMS_WITH_CP.filter(t => t.name.toLowerCase().includes(searchA.toLowerCase())).slice(0,8),
  [searchA]);
  const filteredB = useMemo(() =>
    TEAMS_WITH_CP.filter(t => t.name.toLowerCase().includes(searchB.toLowerCase())).slice(0,8),
  [searchB]);

  const archA = teamA ? ARCH_MAP[teamA.archetype] : null;
  const archB = teamB ? ARCH_MAP[teamB.archetype] : null;
  const jbA   = teamA ? JB_DATA[teamA.name]?.jb : null;
  const jbB   = teamB ? JB_DATA[teamB.name]?.jb : null;


  return (
    <div>
      {/* Team pickers */}
      <div style={{ display:"flex", gap:12, marginBottom:"1.5rem", alignItems:"flex-start" }}>
        <TeamPicker label="Team A" selected={teamA} search={searchA} setSearch={setSearchA}
          focused={focusA} setFocused={setFocusA} onSelect={setTeamA} onClear={() => setTeamA(null)}
          filteredTeams={filteredA} jbScore={jbA}/>
        <div style={{ display:"flex", alignItems:"center", paddingTop: teamA || teamB ? 44 : 30,
          fontSize:13, fontWeight:600, color:"var(--color-text-tertiary)", flexShrink:0 }}>vs</div>
        <TeamPicker label="Team B" selected={teamB} search={searchB} setSearch={setSearchB}
          focused={focusB} setFocused={setFocusB} onSelect={setTeamB} onClear={() => setTeamB(null)}
          filteredTeams={filteredB} jbScore={jbB}/>
      </div>

      {/* Empty state */}
      {!teamA && !teamB && (
        <div style={{ textAlign:"center", padding:"3rem 1rem", color:"var(--color-text-tertiary)", fontSize:13 }}>
          Search for two teams above to compare their profiles head-to-head
        </div>
      )}

      {/* Comparison */}
      {teamA && teamB && (() => {
        const colorA = archA?.color || "#888";
        const colorB = archB?.color || "#888";

        return (
          <div>
            {/* jbScore summary bar */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr",
              gap:8, alignItems:"center", marginBottom:"1.25rem",
              padding:"12px 16px", background:"var(--color-background-secondary)",
              borderRadius:10, border:"0.5px solid var(--color-border-tertiary)" }}>
              <div>
                <div style={{ fontSize:10, color:"var(--color-text-tertiary)", marginBottom:3 }}>jbScore</div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ flex:1, height:8, background:"var(--color-border-tertiary)", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ width:`${Math.min(100,jbA||0)}%`, height:"100%", background:colorA, borderRadius:4 }}/>
                  </div>
                  <span style={{ fontSize:18, fontWeight:700, color:colorA, width:40, textAlign:"right" }}>{jbA?.toFixed(1)}</span>
                </div>
              </div>
              <div style={{ fontSize:11, color:"var(--color-text-tertiary)", textAlign:"center", padding:"0 8px" }}>
                {jbA != null && jbB != null && (
                  <span style={{ fontWeight:600, color: Math.abs(jbA-jbB) < 5 ? "#c2410c" : "var(--color-text-secondary)" }}>
                    Δ {Math.abs(jbA-jbB).toFixed(1)}
                  </span>
                )}
              </div>
              <div>
                <div style={{ fontSize:10, color:"var(--color-text-tertiary)", marginBottom:3, textAlign:"right" }}>jbScore</div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:18, fontWeight:700, color:colorB, width:40 }}>{jbB?.toFixed(1)}</span>
                  <div style={{ flex:1, height:8, background:"var(--color-border-tertiary)", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ width:`${Math.min(100,jbB||0)}%`, height:"100%", background:colorB, borderRadius:4 }}/>
                  </div>
                </div>
              </div>
            </div>

            {/* Attribute butterfly bars */}
            <div style={{ border:"0.5px solid var(--color-border-tertiary)", borderRadius:10, overflow:"hidden" }}>
              {/* Header */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 52px 1fr",
                background:"var(--color-background-secondary)",
                borderBottom:"0.5px solid var(--color-border-tertiary)", padding:"8px 12px", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:colorA, flexShrink:0 }}/>
                  <span style={{ fontSize:12, fontWeight:600, color:colorA }}>{teamA.name}</span>
                  <span style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>({teamA.region} {teamA.seed})</span>
                </div>
                <div style={{ textAlign:"center", fontSize:10, color:"var(--color-text-tertiary)" }}>Attr</div>
                <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"flex-end" }}>
                  <span style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>({teamB.region} {teamB.seed})</span>
                  <span style={{ fontSize:12, fontWeight:600, color:colorB }}>{teamB.name}</span>
                  <div style={{ width:10, height:10, borderRadius:2, background:colorB, flexShrink:0 }}/>
                </div>
              </div>

              {/* Bars */}
              {ALL_ATTRS.map(a => {
                const vA = teamA[a.key] ?? null;
                const vB = teamB[a.key] ?? null;
                const pA = vA != null ? ((vA-1)/9)*100 : 0;
                const pB = vB != null ? ((vB-1)/9)*100 : 0;
                const wA = vA != null && vB != null && vA > vB;
                const wB = vB != null && vA != null && vB > vA;
                return (
                  <div key={a.key} style={{ display:"grid", gridTemplateColumns:"1fr 52px 1fr",
                    alignItems:"center", padding:"5px 12px",
                    borderBottom:"0.5px solid var(--color-border-tertiary)" }}>

                    {/* Left bar — fills right to left */}
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:11, fontWeight:wA?700:400,
                        color:wA?colorA:"var(--color-text-tertiary)", width:28, textAlign:"right", flexShrink:0 }}>
                        {vA?.toFixed(1) ?? "—"}
                      </span>
                      <div style={{ flex:1, height:6, background:"var(--color-border-tertiary)", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ position:"relative", height:"100%", width:"100%" }}>
                          <div style={{ position:"absolute", right:0, top:0, height:"100%",
                            width:`${pA}%`, background:wA?colorA:colorA+"55", borderRadius:3 }}/>
                        </div>
                      </div>
                    </div>

                    {/* Label */}
                    <div style={{ textAlign:"center", fontSize:10, fontWeight:500,
                      color:"var(--color-text-tertiary)", padding:"0 4px" }}>{a.short}</div>

                    {/* Right bar — fills left to right */}
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ flex:1, height:6, background:"var(--color-border-tertiary)", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ width:`${pB}%`, height:"100%", background:wB?colorB:colorB+"55", borderRadius:3 }}/>
                      </div>
                      <span style={{ fontSize:11, fontWeight:wB?700:400,
                        color:wB?colorB:"var(--color-text-tertiary)", width:28, textAlign:"left", flexShrink:0 }}>
                        {vB?.toFixed(1) ?? "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Coaching pedigree + key stats footer */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:"1rem" }}>
              {[{team:teamA, color:colorA, jb:jbA}, {team:teamB, color:colorB, jb:jbB}].map(({team, color, jb}, i) => {
                const cp = CP[team.name];
                const jbd = JB_DATA[team.name];
                return (
                  <div key={i} style={{ padding:"10px 12px", background:"var(--color-background-secondary)",
                    borderRadius:8, border:`0.5px solid ${color}44` }}>
                    <div style={{ fontSize:11, fontWeight:600, color, marginBottom:6 }}>{team.name}</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                      {[
                        ["KP Rank",  `#${team.kenpom_rank}`],
                        ["EM Rank",  team.em_rank ? `#${team.em_rank}` : "—"],
                        ["Barthag",  team.barthag?.toFixed(3)],
                        ["RR",       team.rr?.toFixed(1)],
                        ["jbScore",  jb?.toFixed(1)],
                        ["AdjO",     jbd?.adjo],
                        ["AdjD",     jbd?.adjd],
                        ["Pace",     team.pace_label],
                        ["Coach",    cp ? `${cp.coach}${cp.note?" ("+cp.note+")":""}` : "—"],
                      ].map(([k,v]) => v != null && v !== "—" && (
                        <div key={k} style={{ display:"flex", justifyContent:"space-between",
                          fontSize:11, color:"var(--color-text-secondary)" }}>
                          <span style={{ color:"var(--color-text-tertiary)" }}>{k}</span>
                          <b>{v}</b>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick picks button */}
            <button onClick={() => { setTeamA(null); setTeamB(null); setSearchA(""); setSearchB(""); }}
              style={{ marginTop:"1rem", width:"100%", padding:"9px", borderRadius:8, border:"none",
                background:"var(--color-background-secondary)", color:"var(--color-text-tertiary)",
                fontSize:12, cursor:"pointer" }}>
              ↺ Clear & compare another matchup
            </button>
          </div>
        );
      })()}

      {/* One team selected, waiting for second */}
      {((teamA && !teamB) || (!teamA && teamB)) && (
        <div style={{ textAlign:"center", padding:"2rem 1rem", color:"var(--color-text-tertiary)", fontSize:13 }}>
          Now search for {teamA ? "Team B" : "Team A"} to compare
        </div>
      )}
    </div>
  );
}

const TEAMS_BY_NAME = Object.fromEntries(TEAMS_WITH_CP.map(t => [t.name, t]));

function PicksTab({ onTeamClick, scores, odds }) {
  const [sortBy,       setSortBy]      = useState("time");
  const [hideFinished, setHideFinished] = useState(true);
  const [filterRegion, setFilterRegion] = useState("All");
  const [filterTier, setFilterTier]   = useState("All");
  const [filterRound,  setFilterRound]  = useState("All");
  const [showKenPom,   setShowKenPom]   = useState(false);

  // Round label → date range mapping for UPSET_DATA
  const ROUND_DATES = {
    "R64":  ["2026-03-19","2026-03-20"],
    "R32":  ["2026-03-21","2026-03-22"],
    "S16":  ["2026-03-27","2026-03-28"],
    "E8":   ["2026-03-29","2026-03-30"],
    "F4":   ["2026-04-03"],
    "NCG":  ["2026-04-05"],
  };

  // gapColor and gapLabel imported from ./utils/gapUtils

  const TIER_META = {
    strong:   { label:"⚡ Strong upset candidate",  color:"#dc2626" },
    moderate: { label:"▲ Moderate upset potential", color:"#d97706" },
    low:      { label:"— Low upset probability",    color:"#475569" },
  };

  const filtered = useMemo(() => {
    let d = [...UPSET_DATA];
    if (filterRegion !== "All") d = d.filter(m => m.region === filterRegion);
    if (filterTier   !== "All") d = d.filter(m => m.tier   === filterTier);
    if (filterRound  !== "All") {
      const dates = ROUND_DATES[filterRound] || [];
      d = d.filter(m => dates.includes(m.date));
    }
    if (sortBy === "upset")      d.sort((a,b) => b.upset_score - a.upset_score);
    if (sortBy === "jb_delta")   d.sort((a,b) => a.jb_delta   - b.jb_delta);
    if (sortBy === "seed_gap")   d.sort((a,b) => (b.dog_seed - b.fav_seed) - (a.dog_seed - a.fav_seed));
    if (sortBy === "region")     d.sort((a,b) => a.region.localeCompare(b.region));
    if (sortBy === "time")       d.sort((a,b) => (a.date+(a.time||"")).localeCompare(b.date+(b.time||"")));
    return hideFinished ? d.filter(m => !scores?.[m.fav]?.some(r=>r.state==="post"&&r.date===m.date)) : d;
  }, [sortBy, filterRegion, filterTier, filterRound, hideFinished, scores]);

  const JbBar = ({ score, color }) => (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <div style={{ flex:1, height:6, background:"var(--color-border-tertiary)", borderRadius:3, overflow:"hidden" }}>
        <div style={{ width:`${Math.max(0,Math.min(100,score))}%`, height:"100%", background:color, borderRadius:3 }}/>
      </div>
      <span style={{ fontSize:11, fontWeight:600, color:"var(--color-text-secondary)", width:32, textAlign:"right" }}>
        {score?.toFixed(1)}
      </span>
    </div>
  );

  const EdgePill = ({ value, label }) => {
    if (!value || Math.abs(value) < 5) return null;
    const pos = value > 0;
    return (
      <span style={{
        fontSize:9, padding:"1px 5px", borderRadius:4, fontWeight:500,
        background: pos ? "#dcfce7" : "#fee2e2",
        color:      pos ? "#166534" : "#991b1b",
        border: `1px solid ${pos ? "#86efac" : "#fca5a5"}`,
      }}>{pos?"+":""}{value.toFixed(0)} {label}</span>
    );
  };

  const UpsetMeter = ({ score }) => {
    const pct = Math.max(0, Math.min(100, ((score + 25) / 45) * 100));
    const color = score > 15 ? "#dc2626" : score > 5 ? "#d97706" : "#6b7280";
    return (
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <div style={{ flex:1, height:8, background:"var(--color-border-tertiary)", borderRadius:4, overflow:"hidden", position:"relative" }}>
          <div style={{ position:"absolute", left:"55%", top:0, bottom:0, width:"0.5px", background:"var(--color-border-secondary)" }}/>
          <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:4 }}/>
        </div>
        <span style={{ fontSize:11, fontWeight:600, color, width:36, textAlign:"right" }}>
          {score > 0 ? "+" : ""}{score?.toFixed(1)}
        </span>
      </div>
    );
  };

  return (
    <div>
      {/* Explainer */}
      <div style={{ marginBottom:"1rem", padding:"0.875rem 1rem", background:"var(--color-background-secondary)", borderRadius:"var(--border-radius-lg)", border:"0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:10 }}>
          <div style={{ flex:1, minWidth:180 }}>
            <p style={{ margin:"0 0 3px", fontSize:12, fontWeight:500, color:"var(--color-text-primary)" }}>jbScore (baseline)</p>
            <p style={{ margin:0, fontSize:11, color:"var(--color-text-tertiary)", lineHeight:1.5 }}>
              Team quality 0–100, normalized to 2026 field. Weights AdjO/D, NetRTG, 3P%, FTR, TO%, Steal%, Barthag, RR, EM Rank, KP Rank.
            </p>
          </div>
          <div style={{ flex:1, minWidth:180 }}>
            <p style={{ margin:"0 0 3px", fontSize:12, fontWeight:500, color:"var(--color-text-primary)" }}>Upset Score (overlay)</p>
            <p style={{ margin:0, fontSize:11, color:"var(--color-text-tertiary)", lineHeight:1.5 }}>
              Possession-volatility edge for the underdog. Positive = dog has statistical advantages that generate upset probability.
            </p>
          </div>
        </div>
        <div style={{ borderTop:"0.5px solid var(--color-border-tertiary)", paddingTop:8 }}>
          <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:500, color:"var(--color-text-primary)" }}>jbGap heatmap</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
            {[[-2,"Pick the dog"],[2,"Coin flip"],[6,"Danger zone"],[10,"Live underdog"],[15,"Moderate gap"],[20,"Lean favorite"],[28,"Chalk"],[40,"Blowout city"]].map(([d,l])=>{
              const c = gapColor(d);
              return <span key={l} style={{ fontSize:9, padding:"2px 6px", borderRadius:4, background:c.bg, color:c.text, border:`1px solid ${c.border}` }}>{l}</span>;
            })}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:"0.875rem", alignItems:"center" }}>
        <select value={filterRound} onChange={e=>setFilterRound(e.target.value)}
          style={{ fontSize:12, padding:"5px 6px", borderRadius:6, border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)" }}>
          <option value="All">All Rounds</option>
          <option value="R64">Round of 64</option>
          <option value="R32">Round of 32</option>
          <option value="S16">Sweet 16</option>
          <option value="E8">Elite 8</option>
          <option value="F4">Final Four</option>
          <option value="NCG">Championship</option>
        </select>
        <select value={filterRegion} onChange={e=>setFilterRegion(e.target.value)}
          style={{ fontSize:12, padding:"5px 6px", borderRadius:6, border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)" }}>
          <option value="All">All Regions</option>
          {["East","South","West","Midwest"].map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filterTier} onChange={e=>setFilterTier(e.target.value)}
          style={{ fontSize:12, padding:"5px 6px", borderRadius:6, border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)" }}>
          <option value="All">All tiers</option>
          <option value="strong">Strong only</option>
          <option value="moderate">Moderate only</option>
          <option value="low">Low only</option>
        </select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{ fontSize:12, padding:"5px 6px", borderRadius:6, border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)" }}>
          <option value="upset">Sort: Upset Score</option>
          <option value="jb_delta">Sort: jbGap (hottest first)</option>
          <option value="seed_gap">Sort: Seed gap</option>
          <option value="region">Sort: Region</option>
          <option value="time">Sort: Tip-off time</option>
        </select>
        <button onClick={()=>setHideFinished(h=>!h)}
          style={{ fontSize:11, padding:"5px 9px", borderRadius:6, border:"0.5px solid var(--color-border-secondary)",
            background: hideFinished ? "var(--color-background-info)" : "var(--color-background-primary)",
            color: hideFinished ? "var(--color-text-info)" : "var(--color-text-secondary)",
            cursor:"pointer", fontWeight: hideFinished ? 500 : 400 }}>
          {hideFinished ? "✓ Hiding finished" : "Hide finished"}
        </button>
        <span style={{ fontSize:11, color:"var(--color-text-tertiary)", marginLeft:"auto" }}>{filtered.length} matchup{filtered.length!==1?"s":""}</span>
      </div>

      {/* KenPom predictions — collapsible, hidden by default */}
      <div style={{ marginBottom:"0.875rem" }}>
        <button onClick={()=>setShowKenPom(s=>!s)} style={{
          display:"flex", alignItems:"center", gap:7, width:"100%",
          padding:"8px 12px", borderRadius:"var(--border-radius-md)",
          border:"0.5px solid var(--color-border-secondary)",
          background:"var(--color-background-secondary)",
          color:"var(--color-text-secondary)", cursor:"pointer", fontSize:12,
          textAlign:"left",
        }}>
          <span style={{ fontSize:10, padding:"1px 7px", borderRadius:8, background:"rgba(124,58,237,0.12)", color:"#7c3aed", fontWeight:600 }}>vs KenPom</span>
          <span style={{ fontWeight:500, color:"var(--color-text-primary)" }}>
            {filterRound === "R32" ? "Round of 32" : "Round of 64"} — jbScore vs KenPom predictions
          </span>
          <span style={{ marginLeft:"auto", fontSize:11, color:"var(--color-text-tertiary)" }}>
            {showKenPom ? "▲ hide" : "▼ show"}
          </span>
        </button>
        {showKenPom && (
          <div style={{ marginTop:8 }}>
            {(filterRound === "All" || filterRound === "R64") && <KenPomR64Compare S={{
              card:{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)", padding:"1rem 1.25rem", marginBottom:"1rem" },
              metric:{ background:"var(--color-background-secondary)", borderRadius:"var(--border-radius-md)", padding:"12px 14px" },
              metricLabel:{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:3 },
              metricValue:{ fontSize:22, fontWeight:500, color:"var(--color-text-primary)", lineHeight:1.2 },
              metricSub:{ fontSize:11, color:"var(--color-text-tertiary)", marginTop:2 },
            }}/>}
            {(filterRound === "All" || filterRound === "R32") && <KenPomR32Compare S={{
              card:{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)", padding:"1rem 1.25rem", marginBottom:"1rem" },
              metric:{ background:"var(--color-background-secondary)", borderRadius:"var(--border-radius-md)", padding:"12px 14px" },
              metricLabel:{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:3 },
              metricValue:{ fontSize:22, fontWeight:500, color:"var(--color-text-primary)", lineHeight:1.2 },
              metricSub:{ fontSize:11, color:"var(--color-text-tertiary)", marginTop:2 },
            }}/>}
            {filterRound !== "All" && filterRound !== "R64" && filterRound !== "R32" && (
              <div style={{ padding:"1.5rem", textAlign:"center", fontSize:12, color:"var(--color-text-tertiary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)" }}>
                KenPom comparison data available for R64 and R32. {filterRound} data will be added after games conclude.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Matchup cards */}
      <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
        {filtered.map((m,i) => {
          const tm   = TIER_META[m.tier];
          const gc   = gapColor(m.jb_delta);
          const oFav = (odds && odds[m.fav]) || ODDS[m.fav] || {};
          const oDog = (odds && odds[m.dog]) || ODDS[m.dog] || {};
          const jbFav = JB_DATA[m.fav]?.jb;
          const jbDog = JB_DATA[m.dog]?.jb;
          const favColor = "#475569";
          const dogColor = m.tier==="strong" ? "#dc2626" : m.tier==="moderate" ? "#d97706" : "#6b7280";

          return (
            <div key={i} style={{ border:`1px solid ${gc.border}`, borderRadius:"var(--border-radius-lg)", overflow:"hidden" }}>

              {/* Header — heatmap colored by jbGap */}
              <div style={{ background:gc.bg, padding:"7px 12px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:11, fontWeight:600, color:gc.text }}>
                  jbGap {m.jb_delta.toFixed(1)} — {gapLabel(m.jb_delta)}
                </span>
                <span style={{ fontSize:10, color:gc.text, opacity:0.75, marginLeft:"auto" }}>
                  {m.region} · {m.site} · {m.date}{m.time && <span style={{ fontWeight:600, color:"var(--color-text-secondary)", marginLeft:4 }}> · {fmt12h(m.time)} ET</span>}
                </span>
              </div>

              <div style={{ padding:"10px 12px" }}>
                {/* Teams side by side */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:10 }}>

                  {/* Favorite */}
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:4 }}>
                      <span style={{ fontSize:10, background:"var(--color-border-tertiary)", borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, flexShrink:0 }}>{m.fav_seed}</span>
                      <span style={{ fontSize:13, fontWeight:600, color:"var(--color-text-primary)", cursor:"pointer" }}
                        onClick={()=>{const t=TEAMS_BY_NAME[m.fav];if(t)onTeamClick(t);}}>
                        {m.fav}
                      </span>
                    </div>
                    <div style={{ marginBottom:4 }}>
                      <div style={{ fontSize:9, color:"var(--color-text-tertiary)", marginBottom:2 }}>jbScore</div>
                      <JbBar score={jbFav} color={favColor}/>
                    </div>
                    {oFav.ok && (
                      <div style={{ fontSize:10, color:"var(--color-text-secondary)" }}>
                        {oFav.s&&<span style={{ fontWeight:600, color:parseFloat(oFav.s)<0?"#1a6b3a":"var(--color-text-secondary)", marginRight:6 }}>{parseFloat(oFav.s)>0?"+":""}{oFav.s}</span>}
                        {oFav.ml&&<span style={{ color:"var(--color-text-tertiary)" }}>{oFav.ml}</span>}
                      </div>
                    )}
                  </div>

                  {/* Underdog */}
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:4 }}>
                      <span style={{ fontSize:10, background:dogColor+"22", color:dogColor, borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600, flexShrink:0 }}>{m.dog_seed}</span>
                      <span style={{ fontSize:13, fontWeight:600, color:dogColor, cursor:"pointer" }}
                        onClick={()=>{const t=TEAMS_BY_NAME[m.dog];if(t)onTeamClick(t);}}>
                        {m.dog}
                      </span>
                    </div>
                    <div style={{ marginBottom:4 }}>
                      <div style={{ fontSize:9, color:"var(--color-text-tertiary)", marginBottom:2 }}>jbScore</div>
                      <JbBar score={jbDog} color={dogColor}/>
                    </div>
                    {oDog.ok && (
                      <div style={{ fontSize:10, color:"var(--color-text-secondary)" }}>
                        {oDog.s&&<span style={{ fontWeight:600, marginRight:6 }}>{parseFloat(oDog.s)>0?"+":""}{oDog.s}</span>}
                        {oDog.ml&&<span style={{ color:"var(--color-text-tertiary)" }}>{oDog.ml}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Upset score + tier + edge pills */}
                <div style={{ borderTop:"0.5px solid var(--color-border-tertiary)", paddingTop:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, alignItems:"center" }}>
                    <span style={{ fontSize:10, fontWeight:500, color:tm.color }}>{tm.label}</span>
                    {oFav.ou&&<span style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>O/U {oFav.ou}</span>}
                  </div>
                  <UpsetMeter score={m.upset_score}/>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:6 }}>
                    <EdgePill value={m.to_edge}     label="TO"/>
                    <EdgePill value={m.threep_edge} label="3P"/>
                    <EdgePill value={m.orb_edge}    label="ORB"/>
                    <EdgePill value={m.ftr_edge}    label="FTR"/>
                    <EdgePill value={m.arc_edge}    label="ArcD"/>
                    <EdgePill value={m.tempo_edge}  label="Pace"/>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop:"1.5rem", padding:"0.875rem", background:"var(--color-background-secondary)", borderRadius:"var(--border-radius-lg)", border:"0.5px solid var(--color-border-tertiary)", fontSize:11, color:"var(--color-text-tertiary)", lineHeight:1.65 }}>
        <strong style={{ color:"var(--color-text-secondary)" }}>jbScore:</strong> 13 KenPom stats + Barthag, RR, EM Rank, KP Rank — normalized to the 2026 field (0–100). Range this year: 11.3 (Lehigh) – 82.3 (Duke).{" "}
        <strong style={{ color:"var(--color-text-secondary)" }}>jbGap:</strong> jbScore difference between favorite and underdog. Card header color = heatmap — deep red (toss-up) → blue (blowout likely).{" "}
        <strong style={{ color:"var(--color-text-secondary)" }}>Upset Score:</strong> possession-volatility composite for the underdog (TO differential 25%, 3P volatility 20%, ORB 20%, FTR 15%, arc defense 10%, tempo 10%).
      </div>
    </div>
  );
}


// ── R64ResultsTable ───────────────────────────────────────────────────────────
function R64ResultsTable({ S }) {
  const [showAll, setShowAll] = useState(false);

  const ALL_GAMES = [
    { fav:"(8) Clemson",          dog:"(9) Iowa",              delta:-4.6, uScore:-0.8,  winner:"Iowa",          score:"67-61",  upset:true  },
    { fav:"(8) Villanova",        dog:"(9) Utah State",        delta:-3.5, uScore:6.7,   winner:"Utah State",    score:"86-76",  upset:true  },
    { fav:"(6) North Carolina",   dog:"(11) VCU",              delta:-1.9, uScore:11.6,  winner:"VCU",           score:"82-78",  upset:true  },
    { fav:"(8) Georgia",          dog:"(9) Saint Louis",       delta:0.3,  uScore:-3.5,  winner:"Saint Louis",   score:"102-77", upset:true  },
    { fav:"(7) Saint Mary\'s",   dog:"(10) Texas A&M",        delta:1.1,  uScore:12.3,  winner:"Texas A&M",     score:"63-50",  upset:true  },
    { fav:"(7) Kentucky",         dog:"(10) Santa Clara",      delta:2.9,  uScore:1.1,   winner:"Kentucky",      score:"89-84",  upset:false },
    { fav:"(7) Miami (FL)",       dog:"(10) Missouri",         delta:5.5,  uScore:-4.4,  winner:"Miami (FL)",    score:"80-66",  upset:false },
    { fav:"(8) Ohio State",       dog:"(9) TCU",               delta:8.9,  uScore:5.7,   winner:"TCU",           score:"66-64",  upset:true  },
    { fav:"(6) Louisville",       dog:"(11) South Florida",    delta:10.6, uScore:8.8,   winner:"Louisville",    score:"83-79",  upset:false },
    { fav:"(5) Texas Tech",       dog:"(12) Akron",            delta:13.9, uScore:2.0,   winner:"Texas Tech",    score:"91-71",  upset:false },
    { fav:"(7) UCLA",             dog:"(10) UCF",              delta:15.8, uScore:-6.0,  winner:"UCLA",          score:"75-71",  upset:false },
    { fav:"(5) Wisconsin",        dog:"(12) High Point",       delta:17.0, uScore:16.1,  winner:"High Point",    score:"83-82",  upset:true  },
    { fav:"(3) Michigan State",   dog:"(14) N Dakota State",   delta:19.4, uScore:3.7,   winner:"Michigan State",score:"92-67",  upset:false },
    { fav:"(5) St. John\'s",     dog:"(12) Northern Iowa",    delta:21.6, uScore:-23.9, winner:"St. John\'s",  score:"79-53",  upset:false },
    { fav:"(5) Vanderbilt",       dog:"(12) McNeese",          delta:24.2, uScore:-0.8,  winner:"Vanderbilt",    score:"78-68",  upset:false },
    { fav:"(4) Alabama",          dog:"(13) Hofstra",          delta:28.4, uScore:-18.6, winner:"Alabama",       score:"90-70",  upset:false },
    { fav:"(4) Kansas",           dog:"(13) Cal Baptist",      delta:28.6, uScore:2.2,   winner:"Kansas",        score:"68-60",  upset:false },
    { fav:"(4) Nebraska",         dog:"(13) Troy",             delta:33.8, uScore:0.7,   winner:"Nebraska",      score:"76-47",  upset:false },
    { fav:"(3) Gonzaga",          dog:"(14) Kennesaw State",   delta:34.6, uScore:3.6,   winner:"Gonzaga",       score:"73-64",  upset:false },
    { fav:"(2) UConn",            dog:"(15) Furman",           delta:34.9, uScore:-10.4, winner:"UConn",         score:"82-71",  upset:false },
    { fav:"(3) Virginia",         dog:"(14) Wright State",     delta:35.1, uScore:-9.0,  winner:"Virginia",      score:"82-73",  upset:false },
    { fav:"(4) Arkansas",         dog:"(13) Hawai\'i",        delta:39.8, uScore:-10.2, winner:"Arkansas",      score:"97-78",  upset:false },
    { fav:"(3) Illinois",         dog:"(14) Penn",             delta:41.6, uScore:-6.1,  winner:"Illinois",      score:"105-70", upset:false },
    { fav:"(2) Houston",          dog:"(15) Idaho",            delta:42.3, uScore:-7.6,  winner:"Houston",       score:"78-47",  upset:false },
    { fav:"(2) Purdue",           dog:"(15) Queens",           delta:45.7, uScore:1.4,   winner:"Purdue",        score:"104-71", upset:false },
    { fav:"(2) Iowa State",       dog:"(15) Tenn. State",      delta:54.9, uScore:-8.9,  winner:"Iowa State",    score:"108-74", upset:false },
    { fav:"(1) Arizona",          dog:"(16) Long Island",      delta:62.1, uScore:-15.0, winner:"Arizona",       score:"92-58",  upset:false },
    { fav:"(1) Duke",             dog:"(16) Siena",            delta:63.1, uScore:-24.3, winner:"Duke",          score:"71-65",  upset:false },
  ];

  const upsets = ALL_GAMES.filter(g => g.upset);
  const display = showAll ? ALL_GAMES : upsets;

  const col = (upset, uScore) => {
    if (upset) return "#166534";
    return uScore > 5 ? "#166534" : uScore < 0 ? "#dc2626" : "var(--color-text-secondary)";
  };

  return (
    <div style={S.card}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div style={S.sectionTitle}>
          {showAll ? `All 28 first-round results` : `All ${upsets.length} first-round upsets`} — sorted by jbGap
        </div>
        <button onClick={() => setShowAll(s => !s)} style={{
          fontSize:11, padding:"3px 10px", borderRadius:6, cursor:"pointer",
          border:"0.5px solid var(--color-border-secondary)",
          background:"var(--color-background-secondary)",
          color:"var(--color-text-secondary)", fontWeight:500, whiteSpace:"nowrap", flexShrink:0
        }}>
          {showAll ? "Show upsets only" : "Show all 28 games"}
        </button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto auto", gap:"0 10px", alignItems:"baseline" }}>
        {["Winner · Loser","Score","Margin","jbGap","Upset sc"].map(h => (
          <div key={h} style={{ fontSize:11, fontWeight:500, color:"var(--color-text-secondary)", paddingBottom:6, borderBottom:"0.5px solid var(--color-border-secondary)" }}>{h}</div>
        ))}
        {display.map((g,i) => {
          const last = i === display.length - 1;
          const rowStyle = { padding:"6px 0", borderBottom: last ? "none" : "0.5px solid var(--color-border-tertiary)" };
          const loser = g.upset ? g.fav : g.dog;
          return [
            <div key={`t${i}`} style={{ ...rowStyle, fontSize:13 }}>
              <span style={{ fontWeight:500, color: g.upset ? "#166534" : "var(--color-text-primary)" }}>{g.winner}</span>
              <span style={{ color:"var(--color-text-tertiary)", fontSize:11 }}> · {loser}</span>
              {g.upset && <span style={{ fontSize:9, fontWeight:600, marginLeft:5, padding:"1px 5px", borderRadius:4, background:"rgba(22,101,52,0.1)", color:"#166534" }}>UPSET</span>}
            </div>,
            <div key={`s${i}`} style={{ ...rowStyle, ...S.mono }}>{g.score}</div>,
            <div key={`m${i}`} style={{ ...rowStyle, ...S.mono, color:"var(--color-text-tertiary)" }}>+{parseInt(g.score.split('-')[0]) - parseInt(g.score.split('-')[1])}</div>,
            <div key={`d${i}`} style={{ ...rowStyle, ...S.mono, color: g.delta < 5 ? "#dc2626" : g.delta < 17 ? "#b45309" : "var(--color-text-secondary)" }}>{g.delta > 0 ? "+" : ""}{g.delta}</div>,
            <div key={`u${i}`} style={{ ...rowStyle, ...S.mono, color: g.uScore > 5 ? "#166534" : g.uScore < 0 ? "#dc2626" : "var(--color-text-secondary)" }}>{g.uScore > 0 ? "+" : ""}{g.uScore}</div>,
          ];
        })}
      </div>
    </div>
  );
}

// ── KenPomR64Compare ─────────────────────────────────────────────────────────
function KenPomR64Compare({ S }) {
  const [day, setDay] = useState("thu");

  const THU = [
    // Thursday March 19 — from FanMatch
    { dog:"(9) Saint Louis",    fav:"(8) Georgia",      kp_winner:"Georgia",       kp_pct:55, jb_delta:0.3,   jb_tier:"Coin flip",    result:"UPSET", note:"jbGap agreed dog better" },
    { dog:"(11) Texas",         fav:"(6) BYU",          kp_winner:"BYU",           kp_pct:60, jb_delta:5.7,   jb_tier:"Danger zone",  result:"UPSET", note:"KP & jb both wrong" },
    { dog:"(10) Texas A&M",     fav:"(7) Saint Mary\'s", kp_winner:"Saint Mary\'s", kp_pct:61, jb_delta:1.1, jb_tier:"Coin flip",    result:"UPSET" },
    { dog:"(11) VCU",           fav:"(6) N Carolina",   kp_winner:"N Carolina",    kp_pct:58, jb_delta:-1.9,  jb_tier:"Pick the dog", result:"UPSET", note:"jbGap correct" },
    { dog:"(9) TCU",            fav:"(8) Ohio State",   kp_winner:"Ohio State",    kp_pct:61, jb_delta:8.9,   jb_tier:"Live underdog",result:"UPSET", note:"Both wrong" },
    { dog:"(11) South Florida", fav:"(6) Louisville",   kp_winner:"Louisville",    kp_pct:72, jb_delta:10.6,  jb_tier:"Live underdog",result:"Fav won" },
    { dog:"(12) McNeese",       fav:"(5) Vanderbilt",   kp_winner:"Vanderbilt",    kp_pct:82, jb_delta:24.2,  jb_tier:"Chalk",        result:"Fav won" },
    { dog:"(12) High Point",    fav:"(5) Wisconsin",    kp_winner:"Wisconsin",     kp_pct:83, jb_delta:17.0,  jb_tier:"Lean favorite",result:"UPSET", note:"Both wrong — biggest miss" },
    { dog:"(13) Hawai\'i",     fav:"(4) Arkansas",     kp_winner:"Arkansas",      kp_pct:91, jb_delta:39.8,  jb_tier:"Blowout city", result:"Fav won" },
    { dog:"(14) N Dakota St",   fav:"(3) Michigan St",  kp_winner:"Michigan St",   kp_pct:92, jb_delta:19.4,  jb_tier:"Lean favorite",result:"Fav won" },
    { dog:"(13) Troy",          fav:"(4) Nebraska",     kp_winner:"Nebraska",      kp_pct:92, jb_delta:33.8,  jb_tier:"Blowout city", result:"Fav won" },
    { dog:"(14) Penn",          fav:"(3) Illinois",     kp_winner:"Illinois",      kp_pct:97, jb_delta:41.6,  jb_tier:"Blowout city", result:"Fav won" },
    { dog:"(14) Kennesaw St",   fav:"(3) Gonzaga",      kp_winner:"Gonzaga",       kp_pct:96, jb_delta:34.6,  jb_tier:"Blowout city", result:"Fav won" },
    { dog:"(15) Idaho",         fav:"(2) Houston",      kp_winner:"Houston",       kp_pct:97, jb_delta:42.3,  jb_tier:"Blowout city", result:"Fav won" },
    { dog:"(16) Siena",         fav:"(1) Duke",         kp_winner:"Duke",          kp_pct:99, jb_delta:63.1,  jb_tier:"Blowout city", result:"Fav won" },
    { dog:"(16) Howard",        fav:"(1) Michigan",     kp_winner:"Michigan",      kp_pct:99.6, jb_delta:48.1, jb_tier:"Blowout city", result:"Fav won" },
  ];

  const FRI = [
    // Friday March 20 — from FanMatch
    { dog:"(10) Santa Clara",   fav:"(7) Kentucky",     kp_winner:"Kentucky",      kp_pct:56, jb_delta:2.9,   jb_tier:"Coin flip",    result:"Fav won" },
    { dog:"(9) Utah State",     fav:"(8) Villanova",    kp_winner:"Utah State",    kp_pct:52, jb_delta:-3.5,  jb_tier:"Pick the dog", result:"UPSET", note:"Both correct" },
    { dog:"(9) Iowa",           fav:"(8) Clemson",      kp_winner:"Iowa",          kp_pct:58, jb_delta:-4.6,  jb_tier:"Pick the dog", result:"UPSET", note:"Both correct" },
    { dog:"(10) Missouri",      fav:"(7) Miami (FL)",   kp_winner:"Miami (FL)",    kp_pct:62, jb_delta:5.5,   jb_tier:"Danger zone",  result:"Fav won" },
    { dog:"(10) UCF",           fav:"(7) UCLA",         kp_winner:"UCLA",          kp_pct:66, jb_delta:15.8,  jb_tier:"Lean favorite",result:"Fav won" },
    { dog:"(12) Akron",         fav:"(5) Texas Tech",   kp_winner:"Texas Tech",    kp_pct:78, jb_delta:13.9,  jb_tier:"Moderate gap", result:"Fav won" },
    { dog:"(12) N Iowa",        fav:"(5) St. John\'s", kp_winner:"St. John\'s",  kp_pct:80, jb_delta:21.6,  jb_tier:"Lean favorite",result:"Fav won" },
    { dog:"(13) Hofstra",       fav:"(4) Alabama",      kp_winner:"Alabama",       kp_pct:85, jb_delta:28.4,  jb_tier:"Blowout city", result:"Fav won" },
    { dog:"(11) Miami (Ohio)",  fav:"(6) Tennessee",    kp_winner:"Tennessee",     kp_pct:85, jb_delta:null,  jb_tier:"—",            result:"Fav won" },
    { dog:"(13) Cal Baptist",   fav:"(4) Kansas",       kp_winner:"Kansas",        kp_pct:87, jb_delta:28.6,  jb_tier:"Blowout city", result:"Fav won" },
    { dog:"(14) Wright State",  fav:"(3) Virginia",     kp_winner:"Virginia",      kp_pct:93, jb_delta:35.1,  jb_tier:"Blowout city", result:"Fav won" },
    { dog:"(15) Queens",        fav:"(2) Purdue",       kp_winner:"Purdue",        kp_pct:98, jb_delta:45.7,  jb_tier:"Blowout city", result:"Fav won" },
    { dog:"(15) Furman",        fav:"(2) UConn",        kp_winner:"UConn",         kp_pct:96, jb_delta:34.9,  jb_tier:"Blowout city", result:"Fav won" },
    { dog:"(15) Tenn State",    fav:"(2) Iowa State",   kp_winner:"Iowa State",    kp_pct:98, jb_delta:54.9,  jb_tier:"Blowout city", result:"Fav won" },
    { dog:"(16) LIU",           fav:"(1) Arizona",      kp_winner:"Arizona",       kp_pct:99.6, jb_delta:62.1, jb_tier:"Blowout city", result:"Fav won" },
    { dog:"(16) Prairie View",  fav:"(1) Florida",      kp_winner:"Florida",       kp_pct:99.8, jb_delta:null, jb_tier:"—",            result:"Fav won" },
  ];

  const matchups = day === "thu" ? THU : FRI;
  const upsets = matchups.filter(m => m.result === "UPSET");
  const kpCorrect = matchups.filter(m => {
    if (m.result === "UPSET") return m.kp_winner === m.dog.split(") ")[1];
    return m.kp_winner !== m.dog.split(") ")[1];
  }).length;

  const tierColor = (tier) => {
    if (!tier || tier === "—") return "#888";
    if (tier === "Pick the dog" || tier === "Coin flip") return "#b91c1c";
    if (tier === "Danger zone") return "#854d0e";
    if (tier === "Live underdog") return "#b45309";
    if (tier === "Moderate gap") return "#3f6212";
    if (tier === "Lean favorite") return "#166534";
    return "#0f766e";
  };

  return (
    <div>
      <div style={S.card}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
          <span style={{ padding:"2px 9px", borderRadius:10, fontSize:11, fontWeight:500, background:"rgba(124,58,237,0.1)", color:"#7c3aed" }}>vs KenPom</span>
          <span style={{ fontSize:14, fontWeight:500, color:"var(--color-text-primary)" }}>R64 — jbScore vs KenPom predictions</span>
          <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
            {[["thu","Thu Mar 19"],["fri","Fri Mar 20"]].map(([val,label]) => (
              <button key={val} onClick={() => setDay(val)} style={{
                fontSize:11, padding:"3px 10px", borderRadius:6, cursor:"pointer",
                border:"0.5px solid var(--color-border-secondary)", fontWeight: day===val ? 500 : 400,
                background: day===val ? "var(--color-background-info)" : "var(--color-background-primary)",
                color: day===val ? "var(--color-text-info)" : "var(--color-text-secondary)",
              }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14 }}>
          <div style={S.metric}>
            <div style={S.metricLabel}>KP confidence range</div>
            <div style={S.metricValue}>{day==="thu"?"55–99.6%":"52–99.8%"}</div>
            <div style={S.metricSub}>Win probability</div>
          </div>
          <div style={S.metric}>
            <div style={S.metricLabel}>Upsets this day</div>
            <div style={S.metricValue}>{upsets.length}</div>
            <div style={S.metricSub}>of {matchups.length} games</div>
          </div>
          <div style={S.metric}>
            <div style={S.metricLabel}>Danger zone games</div>
            <div style={S.metricValue}>{matchups.filter(m => m.jb_delta !== null && m.jb_delta < 8).length}</div>
            <div style={S.metricSub}>jbGap under 8</div>
          </div>
        </div>

        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
              {["Matchup","KenPom pick","KP%","jbGap","jb tier","Result"].map(h => (
                <th key={h} style={{ textAlign:"left", padding:"5px 8px", fontSize:11, fontWeight:500, color:"var(--color-text-secondary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...matchups].sort((a,b) => (a.jb_delta??99) - (b.jb_delta??99)).map((m,i) => (
              <tr key={i} style={{ borderBottom:"0.5px solid var(--color-border-tertiary)", background: m.result==="UPSET" ? "rgba(220,38,38,0.04)" : "transparent" }}>
                <td style={{ padding:"7px 8px" }}>
                  <span style={{ fontWeight:500, color:"var(--color-text-primary)" }}>{m.dog}</span>
                  <span style={{ color:"var(--color-text-tertiary)" }}> vs {m.fav}</span>
                </td>
                <td style={{ padding:"7px 8px", fontWeight:500, color:"var(--color-text-primary)" }}>{m.kp_winner}</td>
                <td style={{ padding:"7px 8px", fontFamily:"monospace", color: m.kp_pct >= 85 ? "#166534" : m.kp_pct <= 62 ? "#b45309" : "var(--color-text-secondary)" }}>
                  {m.kp_pct}%
                </td>
                <td style={{ padding:"7px 8px", fontFamily:"monospace", color: m.jb_delta === null ? "#888" : m.jb_delta < 0 ? "#dc2626" : m.jb_delta < 8 ? "#b45309" : "var(--color-text-secondary)" }}>
                  {m.jb_delta === null ? "—" : (m.jb_delta > 0 ? "+" : "") + m.jb_delta}
                </td>
                <td style={{ padding:"7px 8px" }}>
                  <span style={{ fontSize:10, padding:"1px 6px", borderRadius:4, background: tierColor(m.jb_tier)+"22", color: tierColor(m.jb_tier), fontWeight:500 }}>{m.jb_tier}</span>
                </td>
                <td style={{ padding:"7px 8px" }}>
                  {m.result === "UPSET"
                    ? <span style={{ fontSize:11, fontWeight:500, color:"#991b1b", background:"rgba(220,38,38,0.1)", padding:"1px 7px", borderRadius:10 }}>Upset</span>
                    : <span style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>Chalk</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {day === "thu" && (
          <div style={{ marginTop:10, fontSize:11, color:"var(--color-text-tertiary)", lineHeight:1.6 }}>
            Upsets: Saint Louis, Texas, Texas A&M, VCU, TCU, High Point. KenPom correctly called Iowa/Clemson and Utah St/Villanova direction (low confidence). Biggest shared miss: High Point over Wisconsin — both models had Wisconsin at 83%+.
          </div>
        )}
        {day === "fri" && (
          <div style={{ marginTop:10, fontSize:11, color:"var(--color-text-tertiary)", lineHeight:1.6 }}>
            Both models agreed on direction for Iowa (KP 58%, jbGap -4.6) and Utah State (KP 52%, jbGap -3.5) — the two 8/9 upsets. No upsets from seed 12+ on Friday; all chalk below jbGap 15 held.
          </div>
        )}
      </div>
    </div>
  );
}

// ── KenPomR32Compare ─────────────────────────────────────────────────────────
function KenPomR32Compare({ S }) {
  const [day, setDay] = useState("sat");

  const SAT = [
    // Saturday March 21 — from FanMatch
    { dog:"(9) Saint Louis",  fav:"(1) Michigan",    kp_winner:"Michigan",    kp_pct:88, jb_delta:14.6, jb_tier:"Moderate gap" },
    { dog:"(9) TCU",          fav:"(1) Duke",         kp_winner:"Duke",        kp_pct:88, jb_delta:26.5, jb_tier:"Chalk"        },
    { dog:"(12) High Point",  fav:"(4) Arkansas",    kp_winner:"Arkansas",    kp_pct:87, jb_delta:20.7, jb_tier:"Lean favorite"},
    { dog:"(10) Texas A&M",   fav:"(2) Houston",     kp_winner:"Houston",     kp_pct:80, jb_delta:11.6, jb_tier:"Live underdog"},
    { dog:"(11) VCU",         fav:"(3) Illinois",    kp_winner:"Illinois",    kp_pct:81, jb_delta:12.4, jb_tier:"Live underdog"},
    { dog:"(11) Texas",       fav:"(3) Gonzaga",     kp_winner:"Gonzaga",     kp_pct:68, jb_delta:5.7,  jb_tier:"Danger zone"  },
    { dog:"(3) Michigan St",  fav:"(6) Louisville",  kp_winner:"Michigan St", kp_pct:59, jb_delta:2.2,  jb_tier:"Coin flip", note:"KP favors dog" },
    { dog:"(4) Nebraska",     fav:"(5) Vanderbilt",  kp_winner:"Vanderbilt",  kp_pct:52, jb_delta:6.5,  jb_tier:"Danger zone"  },
    { dog:"(2) UConn",        fav:"(7) UCLA",        kp_winner:"UConn",       kp_pct:63, jb_delta:9.0,  jb_tier:"Live underdog", note:"jbGap favors UCLA" },
  ];

  const SUN = [
    // Sunday March 22 — from FanMatch
    { dog:"(5) Texas Tech",   fav:"(4) Alabama",     kp_winner:"Alabama",     kp_pct:51, jb_delta:6.5,  jb_tier:"Danger zone"  },
    { dog:"(6) Tennessee",    fav:"(3) Virginia",    kp_winner:"Tennessee",   kp_pct:51, jb_delta:5.6,  jb_tier:"Danger zone", note:"KP favors dog" },
    { dog:"(4) Kansas",       fav:"(5) St. John\'s",kp_winner:"St. John\'s",kp_pct:56, jb_delta:5.7,  jb_tier:"Danger zone"  },
    { dog:"(7) Miami (FL)",   fav:"(2) Purdue",      kp_winner:"Purdue",      kp_pct:73, jb_delta:16.1, jb_tier:"Lean favorite"},
    { dog:"(9) Iowa",         fav:"(1) Florida",     kp_winner:"Florida",     kp_pct:75, jb_delta:5.1,  jb_tier:"Danger zone"  },
    { dog:"(7) Kentucky",     fav:"(2) Iowa State",  kp_winner:"Iowa State",  kp_pct:75, jb_delta:15.7, jb_tier:"Lean favorite"},
    { dog:"(9) Utah State",   fav:"(1) Arizona",     kp_winner:"Arizona",     kp_pct:85, jb_delta:14.6, jb_tier:"Moderate gap" },
  ];

  const matchups = day === "sat" ? SAT : SUN;
  const agree = matchups.filter(m => !m.note || !m.note.includes("favors dog")).length;

  const tierColor = (tier) => {
    if (tier === "Coin flip" || tier === "Danger zone") return "#854d0e";
    if (tier === "Live underdog") return "#b45309";
    if (tier === "Moderate gap") return "#3f6212";
    if (tier === "Lean favorite") return "#166534";
    return "#0f766e";
  };

  return (
    <div>
      <div style={{ marginBottom:"1rem", padding:"0.75rem 1rem", background:"var(--color-background-secondary)", borderRadius:"var(--border-radius-lg)", border:"0.5px solid var(--color-border-tertiary)", fontSize:12, color:"var(--color-text-secondary)", lineHeight:1.6 }}>
        Round of 32 — 16 games across Mar 21–22. KenPom predictions from FanMatch vs jbScore signal. Full results analysis added after games conclude.
      </div>

      <div style={S.card}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
          <span style={{ padding:"2px 9px", borderRadius:10, fontSize:11, fontWeight:500, background:"rgba(124,58,237,0.1)", color:"#7c3aed" }}>vs KenPom</span>
          <span style={{ fontSize:14, fontWeight:500, color:"var(--color-text-primary)" }}>R32 — jbScore vs KenPom predictions</span>
          <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
            {[["sat","Sat Mar 21"],["sun","Sun Mar 22"]].map(([val,label]) => (
              <button key={val} onClick={() => setDay(val)} style={{
                fontSize:11, padding:"3px 10px", borderRadius:6, cursor:"pointer",
                border:"0.5px solid var(--color-border-secondary)", fontWeight: day===val ? 500 : 400,
                background: day===val ? "var(--color-background-info)" : "var(--color-background-primary)",
                color: day===val ? "var(--color-text-info)" : "var(--color-text-secondary)",
              }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14 }}>
          <div style={S.metric}><div style={S.metricLabel}>KP confidence range</div><div style={S.metricValue}>{day==="sat"?"52–88%":"51–85%"}</div><div style={S.metricSub}>Win probability</div></div>
          <div style={S.metric}><div style={S.metricLabel}>Danger zone games</div><div style={S.metricValue}>{matchups.filter(m=>m.jb_delta<8).length}</div><div style={S.metricSub}>jbGap under 8</div></div>
          <div style={S.metric}><div style={S.metricLabel}>Model divergences</div><div style={S.metricValue}>{matchups.filter(m=>m.note).length}</div><div style={S.metricSub}>KP and jbGap disagree</div></div>
        </div>

        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
              {["Matchup","KenPom pick","KP%","jbGap","jb tier","Signal"].map(h => (
                <th key={h} style={{ textAlign:"left", padding:"5px 8px", fontSize:11, fontWeight:500, color:"var(--color-text-secondary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...matchups].sort((a,b) => b.kp_pct - a.kp_pct).map((m,i) => (
              <tr key={i} style={{ borderBottom:"0.5px solid var(--color-border-tertiary)", background: m.note ? "rgba(217,119,6,0.04)" : "transparent" }}>
                <td style={{ padding:"7px 8px" }}>
                  <span style={{ fontWeight:500, color:"var(--color-text-primary)" }}>{m.dog}</span>
                  <span style={{ color:"var(--color-text-tertiary)" }}> vs {m.fav}</span>
                </td>
                <td style={{ padding:"7px 8px", fontWeight:500, color:"var(--color-text-primary)" }}>{m.kp_winner}</td>
                <td style={{ padding:"7px 8px", fontFamily:"monospace", color: m.kp_pct >= 75 ? "#166534" : m.kp_pct <= 56 ? "#b45309" : "var(--color-text-secondary)" }}>
                  {m.kp_pct}%
                </td>
                <td style={{ padding:"7px 8px", fontFamily:"monospace", color: m.jb_delta < 8 ? "#dc2626" : m.jb_delta < 17 ? "#b45309" : "var(--color-text-secondary)" }}>
                  +{m.jb_delta}
                </td>
                <td style={{ padding:"7px 8px" }}>
                  <span style={{ fontSize:10, padding:"1px 6px", borderRadius:4, background: tierColor(m.jb_tier)+"22", color: tierColor(m.jb_tier), fontWeight:500 }}>{m.jb_tier}</span>
                </td>
                <td style={{ padding:"7px 8px" }}>
                  {m.note
                    ? <span style={{ fontSize:11, fontWeight:500, color:"#92400e", background:"rgba(217,119,6,0.1)", padding:"1px 7px", borderRadius:10 }} title={m.note}>⚡ Diverge</span>
                    : <span style={{ fontSize:11, fontWeight:500, color:"#166534", background:"rgba(22,101,52,0.1)", padding:"1px 7px", borderRadius:10 }}>Agree</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {day === "sat" && (
          <div style={{ marginTop:10, fontSize:11, color:"var(--color-text-tertiary)", lineHeight:1.6 }}>
            Key divergences: <strong style={{ color:"var(--color-text-secondary)" }}>Louisville vs Michigan St</strong> — KP favors MSU (59%), jbGap 2.2 calls it a coin flip. <strong style={{ color:"var(--color-text-secondary)" }}>UCLA vs UConn</strong> — jbGap has UCLA listed as fav (+9.0) but KP picks UConn (63%).
          </div>
        )}
        {day === "sun" && (
          <div style={{ marginTop:10, fontSize:11, color:"var(--color-text-tertiary)", lineHeight:1.6 }}>
            Key divergences: <strong style={{ color:"var(--color-text-secondary)" }}>Tennessee vs Virginia</strong> — KP favors Tennessee (51%) despite Virginia listed as jbGap fav (+5.6). Five games under jbGap 8 — Sunday is the more volatile day.
          </div>
        )}
      </div>
    </div>
  );
}



// ── FormulaResultsTab ────────────────────────────────────────────────────────
function FormulaResultsTab() {
  const [round, setRound] = useState("r64");

  const S = {
    card: { background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)", padding:"1rem 1.25rem", marginBottom:"1rem" },
    sectionTitle: { fontSize:11, fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10, paddingBottom:6, borderBottom:"0.5px solid var(--color-border-tertiary)" },
    metricGrid: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:"1rem" },
    metric: { background:"var(--color-background-secondary)", borderRadius:"var(--border-radius-md)", padding:"12px 14px" },
    metricLabel: { fontSize:11, color:"var(--color-text-secondary)", marginBottom:3 },
    metricValue: { fontSize:22, fontWeight:500, color:"var(--color-text-primary)", lineHeight:1.2 },
    metricSub: { fontSize:11, color:"var(--color-text-tertiary)", marginTop:2 },
    gameRow: { display:"flex", justifyContent:"space-between", alignItems:"baseline", padding:"6px 0", borderBottom:"0.5px solid var(--color-border-tertiary)", gap:8, fontSize:13 },
    mono: { fontFamily:"var(--font-mono, monospace)", fontSize:12, color:"var(--color-text-secondary)" },
    divider: { height:"0.5px", background:"var(--color-border-tertiary)", margin:"1.25rem 0" },
    twoCol: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" },
    callout: (type) => ({
      padding:"10px 14px", borderRadius:"var(--border-radius-md)", fontSize:12, lineHeight:1.6, marginTop:10,
      background: type==="warn" ? "rgba(217,119,6,0.08)" : type==="success" ? "rgba(22,101,52,0.08)" : "rgba(29,78,216,0.08)",
      border: `0.5px solid ${type==="warn" ? "rgba(217,119,6,0.3)" : type==="success" ? "rgba(22,101,52,0.3)" : "rgba(29,78,216,0.3)"}`,
      color: type==="warn" ? "#92400e" : type==="success" ? "#14532d" : "#1e3a8a",
    }),
  };

  const pill = (type) => ({
    display:"inline-block", padding:"2px 7px", borderRadius:10, fontSize:11, fontWeight:500,
    background: type==="hit" ? "rgba(22,101,52,0.1)" : type==="miss" ? "rgba(153,27,27,0.1)" : "rgba(146,64,14,0.1)",
    color: type==="hit" ? "#166534" : type==="miss" ? "#991b1b" : "#92400e",
  });

  const dot = (color) => ({ display:"inline-block", width:8, height:8, borderRadius:"50%", background:color, marginRight:5, verticalAlign:"middle", flexShrink:0 });

  const Bar = ({ pct, color, width=80 }) => (
    <div style={{ width, height:5, background:"var(--color-border-tertiary)", borderRadius:3, display:"inline-block" }}>
      <div style={{ width:`${pct}%`, height:5, background:color, borderRadius:3 }}/>
    </div>
  );

  const TIERS = [
    { label:"Pick the dog",  range:"< 0",      color:"#b91c1c", n:3,  upsets:3,  pct:100 },
    { label:"Coin flip",     range:"0 – 5",    color:"#c2410c", n:3,  upsets:2,  pct:67  },
    { label:"Danger zone",   range:"5 – 8",    color:"#854d0e", n:1,  upsets:0,  pct:0   },
    { label:"Live underdog", range:"8 – 13",   color:"#b45309", n:2,  upsets:1,  pct:50  },
    { label:"Moderate gap",  range:"13 – 17",  color:"#3f6212", n:2,  upsets:0,  pct:0   },
    { label:"Lean favorite", range:"17 – 23",  color:"#166534", n:3,  upsets:1,  pct:33  },
    { label:"Chalk",         range:"23 – 35",  color:"#0f766e", n:6,  upsets:0,  pct:0   },
    { label:"Blowout city",  range:"35+",      color:"#1d4ed8", n:8,  upsets:0,  pct:0   },
  ];

  const UPSETS = [
    { dog:"(9) Iowa",         fav:"(8) Clemson",       score:"67-61",  delta:-4.6, uScore:-0.8  },
    { dog:"(9) Utah State",   fav:"(8) Villanova",     score:"86-76",  delta:-3.5, uScore:6.7   },
    { dog:"(11) VCU",         fav:"(6) N Carolina",    score:"82-78",  delta:-1.9, uScore:11.6  },
    { dog:"(9) Saint Louis",  fav:"(8) Georgia",       score:"102-77", delta:0.3,  uScore:-3.5  },
    { dog:"(10) Texas A&M",   fav:"(7) Saint Mary's",  score:"63-50",  delta:1.1,  uScore:12.3  },
    { dog:"(9) TCU",          fav:"(8) Ohio State",    score:"66-64",  delta:8.9,  uScore:5.7   },
    { dog:"(12) High Point",  fav:"(5) Wisconsin",     score:"83-82",  delta:17.0, uScore:16.1  },
  ];

  const R64_CONTENT = round === "r64";
  const R32_CONTENT = round === "r32";
  const PENDING_ROUND = ["s16","e8","f4","ncg"].includes(round);
  const ROUND_LABELS = { s16:"Sweet 16", e8:"Elite 8", f4:"Final Four", ncg:"National Championship" };

  return (
    <div>
      {/* Round selector */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"1rem" }}>
        <span style={{ fontSize:12, fontWeight:500, color:"var(--color-text-secondary)" }}>Round:</span>
        <select value={round} onChange={e=>setRound(e.target.value)}
          style={{ fontSize:13, padding:"5px 10px", borderRadius:6, border:"0.5px solid var(--color-border-secondary)", background:"var(--color-background-primary)", color:"var(--color-text-primary)", fontWeight:500, cursor:"pointer" }}>
          <option value="r64">Round of 64</option>
          <option value="r32">Round of 32</option>
          <option value="s16">Sweet 16</option>
          <option value="e8">Elite 8</option>
          <option value="f4">Final Four</option>
          <option value="ncg">National Championship</option>
        </select>
      </div>

      {/* R64 content */}
      {R64_CONTENT && <div>
      <div style={{ marginBottom:"1rem", padding:"0.75rem 1rem", background:"var(--color-background-secondary)", borderRadius:"var(--border-radius-lg)", border:"0.5px solid var(--color-border-tertiary)", fontSize:12, color:"var(--color-text-secondary)", lineHeight:1.6 }}>
        Post-tournament formula analysis — 28 First Round games (2026-03-19/20). jbScore/jbGap and Upset Score evaluated separately against actual results.
      </div>

      <KenPomR64Compare S={S}/>

      {/* ── FORMULA 1: jbScore / jbGap ── */}
      <div style={S.card}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
          <span style={{ padding:"2px 9px", borderRadius:10, fontSize:11, fontWeight:500, background:"rgba(29,78,216,0.1)", color:"#1d4ed8" }}>Formula 1</span>
          <span style={{ fontSize:14, fontWeight:500, color:"var(--color-text-primary)" }}>jbScore / jbGap — team quality + gap signal</span>
        </div>

        <div style={S.metricGrid}>
          <div style={S.metric}>
            <div style={S.metricLabel}>Direction accuracy</div>
            <div style={S.metricValue}>75%</div>
            <div style={S.metricSub}>21 of 28 games correct</div>
          </div>
          <div style={S.metric}>
            <div style={S.metricLabel}>Upsets (first round)</div>
            <div style={S.metricValue}>7 / 28</div>
            <div style={S.metricSub}>25% upset rate</div>
          </div>
          <div style={S.metric}>
            <div style={S.metricLabel}>Blowout tiers (23+) accuracy</div>
            <div style={S.metricValue}>100%</div>
            <div style={S.metricSub}>14 of 14 went chalk</div>
          </div>
        </div>

        {/* Tier table */}
        <div style={S.sectionTitle}>jbGap tier breakdown</div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
              {["Tier","Range","Games","Upsets","Upset %",""].map(h => (
                <th key={h} style={{ textAlign:"left", padding:"5px 8px", fontSize:11, fontWeight:500, color:"var(--color-text-secondary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIERS.map(t => (
              <tr key={t.label} style={{ borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ padding:"7px 8px" }}><span style={dot(t.color)}/>{t.label}</td>
                <td style={{ padding:"7px 8px", fontFamily:"monospace", fontSize:11, color:"var(--color-text-secondary)" }}>{t.range}</td>
                <td style={{ padding:"7px 8px", color:"var(--color-text-secondary)" }}>{t.n}</td>
                <td style={{ padding:"7px 8px", color:"var(--color-text-secondary)" }}>{t.upsets}</td>
                <td style={{ padding:"7px 8px", fontWeight: t.pct >= 50 ? 600 : 400 }}>{t.pct}%</td>
                <td style={{ padding:"7px 8px" }}><Bar pct={t.pct} color={t.color}/></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ ...S.callout("warn"), marginTop:12 }}>
          Signal held cleanly at the extremes — jbGap below 0 went to the lower-seed team 100% (3/3), and every game above 23 went chalk (14/14). The messy zone is 8–23 where gap size alone doesn't tell the full story. "Lean favorite" (17–23) still produced 1 upset in 3 games — High Point over Wisconsin at jbGap 17.0, won by 1. Tier names calibrated to reflect actual R64 behavior.
        </div>
      </div>

      {/* ── FORMULA 2: Upset Score ── */}
      <div style={S.card}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
          <span style={{ padding:"2px 9px", borderRadius:10, fontSize:11, fontWeight:500, background:"rgba(217,119,6,0.1)", color:"#92400e" }}>Formula 2</span>
          <span style={{ fontSize:14, fontWeight:500, color:"var(--color-text-primary)" }}>Upset Score — possession volatility composite</span>
        </div>

        <div style={S.metricGrid}>
          <div style={S.metric}>
            <div style={S.metricLabel}>Top 3 candidates hit</div>
            <div style={S.metricValue}>3 / 3</div>
            <div style={S.metricSub}>High Point, Texas A&M, VCU</div>
          </div>
          <div style={S.metric}>
            <div style={S.metricLabel}>Top 6 candidates hit</div>
            <div style={S.metricValue}>5 / 6</div>
            <div style={S.metricSub}>South Florida only miss</div>
          </div>
          <div style={S.metric}>
            <div style={S.metricLabel}>Upsets w/ negative score</div>
            <div style={S.metricValue}>2 / 7</div>
            <div style={S.metricSub}>Iowa, Saint Louis — blind spots</div>
          </div>
        </div>

        <div style={S.twoCol}>
          {/* Top candidates */}
          <div>
            <div style={S.sectionTitle}>Top upset score candidates</div>
            {[
              { dog:"(12) High Point",  fav:"(5) Wisconsin",     us:16.1, score:"83-82",  hit:true  },
              { dog:"(10) Texas A&M",   fav:"(7) Saint Mary's",  us:12.3, score:"63-50",  hit:true  },
              { dog:"(11) VCU",         fav:"(6) N Carolina",    us:11.6, score:"82-78",  hit:true  },
              { dog:"(11) S Florida",   fav:"(6) Louisville",    us:8.8,  score:"83-79",  hit:false },
              { dog:"(9) Utah State",   fav:"(8) Villanova",     us:6.7,  score:"86-76",  hit:true  },
              { dog:"(9) TCU",          fav:"(8) Ohio State",    us:5.7,  score:"66-64",  hit:true  },
            ].map((r,i) => (
              <div key={i} style={{ ...S.gameRow, ...(i===5?{borderBottom:"none"}:{}) }}>
                <div style={{ flex:1, color: r.hit ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
                  <span style={{ fontWeight: r.hit ? 500 : 400 }}>{r.dog}</span>
                  <span style={{ color:"var(--color-text-tertiary)", fontSize:11 }}> vs {r.fav}</span>
                </div>
                <span style={{ ...S.mono }}>{r.us > 0 ? "+" : ""}{r.us}</span>
                <span style={{ ...S.mono, width:44, textAlign:"right" }}>{r.score}</span>
                <span style={pill(r.hit ? "hit" : "miss")}>{r.hit ? "Hit" : "Miss"}</span>
              </div>
            ))}
          </div>

          {/* Blind spots */}
          <div>
            <div style={S.sectionTitle}>Blind spots — missed upsets</div>
            {[
              { dog:"(9) Iowa",        fav:"(8) Clemson",   us:-0.8, score:"67-61"  },
              { dog:"(9) Saint Louis", fav:"(8) Georgia",   us:-3.5, score:"102-77" },
            ].map((r,i) => (
              <div key={i} style={{ ...S.gameRow }}>
                <div style={{ flex:1 }}><span style={{ fontWeight:500 }}>{r.dog}</span><span style={{ color:"var(--color-text-tertiary)", fontSize:11 }}> def {r.fav}</span></div>
                <span style={{ ...S.mono, color:"#dc2626" }}>{r.us}</span>
                <span style={{ ...S.mono, width:44, textAlign:"right" }}>{r.score}</span>
                <span style={pill("warn")}>Blind spot</span>
              </div>
            ))}
            <div style={{ marginTop:12, paddingTop:10, borderTop:"0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ ...S.sectionTitle, marginBottom:8 }}>High score, fav held on</div>
              <div style={{ ...S.gameRow, borderBottom:"none" }}>
                <div style={{ flex:1 }}><span style={{ color:"var(--color-text-secondary)" }}>(6) Louisville def (11) S Florida</span></div>
                <span style={{ ...S.mono }}>+8.8</span>
                <span style={{ ...S.mono, width:44, textAlign:"right" }}>83-79</span>
                <span style={pill("warn")}>4-pt win</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...S.callout("success"), marginTop:12 }}>
          5 of top 6 upset score candidates resulted in actual upsets. All three games scoring above +11 hit at 100%. The two blind spots (Iowa, Saint Louis) were both 8/9 games — jbGap already flagged them as near-even, so the upset score just didn't add independent signal. South Florida came within 4 points.
        </div>
      </div>

      {/* ── All R64 results ── */}
      <R64ResultsTable S={S}/>
      </div>}

      {/* R32 content — KenPom comparison + results after games finish */}
      {R32_CONTENT && <div>
        <KenPomR32Compare S={S}/>
      </div>}

      {/* Future rounds — stub */}
      {PENDING_ROUND && <div>
        <div style={{ padding:"3rem 1rem", textAlign:"center", color:"var(--color-text-tertiary)", fontSize:13, border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)" }}>
          {ROUND_LABELS[round]} results will be added after games conclude.
        </div>
      </div>}
    </div>
  );
}


// ── Tournament Context ────────────────────────────────────────────────────────
const TournamentContext = createContext(null);

function TournamentProvider({ children }) {
  const { scores, lastUpdate, error: scoresError } = useScores();
  const liveOdds = useOdds();
  const [selectedTeam, setSelectedTeam] = useState(null);
  return (
    <TournamentContext.Provider value={{ scores, lastUpdate, scoresError, liveOdds, selectedTeam, setSelectedTeam }}>
      {children}
    </TournamentContext.Provider>
  );
}

function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournament must be used inside <TournamentProvider>");
  return ctx;
}

// ── Root ──────────────────────────────────────────────────────────────────────
function AppShell() {
  const [tab, setTab] = useState("classifier");
  const { scores, lastUpdate, liveOdds, selectedTeam, setSelectedTeam } = useTournament();

  const tabs = [
    { id: "classifier",  label: "Team Classifier" },
    { id: "matchups",    label: "Matchups" },
    { id: "picks",       label: "Picks & Analysis" },
    { id: "results",     label: "Formula Results" },
    { id: "compare",     label: "Compare" },
    { id: "glossary",    label: "Glossary" },
  ];

  return (
    <div style={{ fontFamily:"var(--font-sans)", maxWidth:900, margin:"0 auto", padding:"0 0 2rem" }}>

      {/* Header */}
      <div style={{ padding:"1.25rem 0 0", marginBottom:"1rem" }}>
        <h1 style={{ margin:"0 0 0.75rem", fontSize:19, fontWeight:600, color:"var(--color-text-primary)" }}>
          2026 NCAA Tournament — Intelligence Suite
        </h1>

        {/* Tab bar */}
        <div style={{ display:"flex", gap:0, borderBottom:"0.5px solid var(--color-border-tertiary)", overflowX:"auto" }}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              padding:"8px 16px", fontSize:13, fontWeight:tab===t.id?600:400,
              color:tab===t.id?"var(--color-text-primary)":"var(--color-text-tertiary)",
              background:"transparent", border:"none", cursor:"pointer",
              borderBottom:tab===t.id?"2px solid var(--color-text-primary)":"2px solid transparent",
              marginBottom:"-0.5px", transition:"all 0.1s", whiteSpace:"nowrap",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab==="classifier" && <ClassifierTab onTeamClick={setSelectedTeam} scores={scores}/>}
      {tab==="matchups"   && <MatchupsTab   onTeamClick={setSelectedTeam} scores={scores} lastUpdate={lastUpdate} odds={liveOdds}/>}
      {tab==="glossary"   && <GlossaryTab/>}
      {tab==="picks"      && <PicksTab onTeamClick={setSelectedTeam} scores={scores} odds={liveOdds}/>}
      {tab==="results"    && <FormulaResultsTab/>}
      {tab==="compare"    && <CompareTab onTeamClick={setSelectedTeam}/>}

      {/* Team detail modal */}
      {selectedTeam && <TeamModal team={selectedTeam} onClose={()=>setSelectedTeam(null)}/>}
    </div>
  );
}

export default function App() {
  return (
    <TournamentProvider>
      <AppShell />
    </TournamentProvider>
  );
}
