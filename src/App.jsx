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

function gapColor(delta) {
  if (delta < 0)  return { bg: "#b91c1c", text: "#fecaca", border: "#dc2626" };
  if (delta < 5)  return { bg: "#c2410c", text: "#fed7aa", border: "#ea580c" };
  if (delta < 8)  return { bg: "#854d0e", text: "#fef08a", border: "#ca8a04" };
  if (delta < 13) return { bg: "#b45309", text: "#fde68a", border: "#d97706" };
  if (delta < 17) return { bg: "#3f6212", text: "#d9f99d", border: "#65a30d" };
  if (delta < 23) return { bg: "#166534", text: "#bbf7d0", border: "#16a34a" };
  if (delta < 35) return { bg: "#0f766e", text: "#99f6e4", border: "#0d9488" };
  return              { bg: "#1d4ed8", text: "#bfdbfe", border: "#3b82f6" };
}

function gapLabel(delta) {
  if (delta < 0)  return "🔥 Pick the dog";
  if (delta < 5)  return "Coin flip";
  if (delta < 8)  return "Danger zone";
  if (delta < 13) return "Live underdog";
  if (delta < 17) return "Moderate gap";
  if (delta < 23) return "Lean favorite";
  if (delta < 35) return "Chalk";
  return "Blowout city";
}

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
const JB_DATA = {"Duke":{"jb":82.3,"adjo":128.0,"adjd":89.1,"net":38.9,"three_pct":35.1,"three_par":44.4,"ftr":37.8,"to_pct":15.7,"steal":11.5,"block":10.4,"orb":38.1,"opp3":30.4,"tempo":65.3,"barthag":0.981,"rr":34.8,"em_rank":1,"kp_rank":1},"UConn":{"jb":57.8,"adjo":122.0,"adjd":94.1,"net":27.9,"three_pct":35.2,"three_par":40.3,"ftr":30.0,"to_pct":16.8,"steal":10.3,"block":15.2,"orb":35.7,"opp3":30.3,"tempo":64.4,"barthag":null,"rr":null,"em_rank":null,"kp_rank":11},"Michigan State":{"jb":67.1,"adjo":123.0,"adjd":94.7,"net":28.3,"three_pct":35.9,"three_par":36.4,"ftr":36.2,"to_pct":17.1,"steal":7.6,"block":13.3,"orb":38.4,"opp3":32.9,"tempo":66.0,"barthag":0.944,"rr":24.6,"em_rank":12,"kp_rank":9},"Kansas":{"jb":62.1,"adjo":118.3,"adjd":93.9,"net":24.4,"three_pct":35.0,"three_par":35.7,"ftr":32.6,"to_pct":15.5,"steal":8.0,"block":15.6,"orb":29.5,"opp3":30.7,"tempo":67.6,"barthag":0.928,"rr":21.9,"em_rank":19,"kp_rank":21},"St. John's":{"jb":67.8,"adjo":120.1,"adjd":94.2,"net":25.9,"three_pct":33.2,"three_par":33.8,"ftr":41.9,"to_pct":14.7,"steal":11.1,"block":12.4,"orb":35.9,"opp3":31.3,"tempo":69.6,"barthag":0.942,"rr":25.5,"em_rank":11,"kp_rank":17},"Louisville":{"jb":69.3,"adjo":124.1,"adjd":98.6,"net":25.5,"three_pct":35.7,"three_par":52.8,"ftr":33.5,"to_pct":16.4,"steal":9.7,"block":9.2,"orb":32.9,"opp3":32.7,"tempo":69.6,"barthag":0.936,"rr":21.8,"em_rank":20,"kp_rank":19},"UCLA":{"jb":66.8,"adjo":123.7,"adjd":102.1,"net":21.6,"three_pct":38.2,"three_par":35.9,"ftr":33.1,"to_pct":13.4,"steal":9.9,"block":9.4,"orb":31.1,"opp3":31.8,"tempo":64.6,"barthag":0.911,"rr":20.3,"em_rank":24,"kp_rank":27},"Ohio State":{"jb":64.7,"adjo":124.3,"adjd":102.1,"net":22.2,"three_pct":36.0,"three_par":40.1,"ftr":37.8,"to_pct":15.5,"steal":7.1,"block":6.8,"orb":30.7,"opp3":31.6,"tempo":66.1,"barthag":0.917,"rr":21.2,"em_rank":22,"kp_rank":26},"TCU":{"jb":55.8,"adjo":115.4,"adjd":97.8,"net":17.6,"three_pct":33.1,"three_par":36.9,"ftr":38.7,"to_pct":15.5,"steal":10.9,"block":12.6,"orb":34.4,"opp3":33.7,"tempo":67.7,"barthag":0.837,"rr":16.0,"em_rank":43,"kp_rank":43},"UCF":{"jb":51.0,"adjo":120.5,"adjd":105.4,"net":15.1,"three_pct":36.2,"three_par":34.4,"ftr":30.8,"to_pct":15.7,"steal":7.9,"block":8.3,"orb":34.4,"opp3":34.0,"tempo":69.2,"barthag":0.812,"rr":11.3,"em_rank":61,"kp_rank":54},"South Florida":{"jb":58.7,"adjo":117.3,"adjd":100.9,"net":16.4,"three_pct":33.1,"three_par":43.8,"ftr":41.1,"to_pct":15.2,"steal":11.9,"block":10.9,"orb":38.2,"opp3":33.9,"tempo":71.5,"barthag":0.836,"rr":15.8,"em_rank":44,"kp_rank":47},"Northern Iowa":{"jb":46.2,"adjo":110.0,"adjd":98.2,"net":11.8,"three_pct":34.9,"three_par":39.6,"ftr":25.7,"to_pct":14.6,"steal":9.7,"block":9.8,"orb":22.0,"opp3":28.9,"tempo":62.3,"barthag":0.774,"rr":10.6,"em_rank":67,"kp_rank":72},"Cal Baptist":{"jb":33.5,"adjo":107.9,"adjd":101.9,"net":6.0,"three_pct":33.7,"three_par":32.1,"ftr":36.1,"to_pct":18.1,"steal":8.0,"block":7.5,"orb":37.8,"opp3":29.7,"tempo":65.8,"barthag":0.689,"rr":3.7,"em_rank":118,"kp_rank":106},"North Dakota State":{"jb":47.7,"adjo":111.7,"adjd":106.6,"net":5.1,"three_pct":35.7,"three_par":42.7,"ftr":30.7,"to_pct":15.6,"steal":11.2,"block":9.0,"orb":33.6,"opp3":33.5,"tempo":66.3,"barthag":0.904,"rr":14.7,"em_rank":48,"kp_rank":113},"Furman":{"jb":22.9,"adjo":107.5,"adjd":109.4,"net":-1.9,"three_pct":33.3,"three_par":46.3,"ftr":32.1,"to_pct":17.8,"steal":6.6,"block":9.4,"orb":31.0,"opp3":32.6,"tempo":65.9,"barthag":0.444,"rr":0.9,"em_rank":153,"kp_rank":191},"Siena":{"jb":19.2,"adjo":107.1,"adjd":109.2,"net":-2.1,"three_pct":30.4,"three_par":31.9,"ftr":34.2,"to_pct":16.0,"steal":9.0,"block":9.1,"orb":31.9,"opp3":32.8,"tempo":64.6,"barthag":0.455,"rr":-0.1,"em_rank":166,"kp_rank":192},"Florida":{"jb":70.3,"adjo":125.5,"adjd":91.7,"net":33.8,"three_pct":30.8,"three_par":37.1,"ftr":39.1,"to_pct":16.5,"steal":9.2,"block":12.4,"orb":43.1,"opp3":32.4,"tempo":70.5,"barthag":0.973,"rr":31.4,"em_rank":4,"kp_rank":4},"Houston":{"jb":75.4,"adjo":124.9,"adjd":91.4,"net":33.5,"three_pct":34.9,"three_par":40.8,"ftr":26.9,"to_pct":13.0,"steal":11.9,"block":12.4,"orb":35.8,"opp3":32.1,"tempo":63.3,"barthag":0.97,"rr":31.0,"em_rank":5,"kp_rank":5},"Illinois":{"jb":76.0,"adjo":131.2,"adjd":99.1,"net":32.1,"three_pct":34.7,"three_par":50.7,"ftr":32.9,"to_pct":13.2,"steal":5.6,"block":12.6,"orb":38.7,"opp3":31.4,"tempo":65.5,"barthag":0.968,"rr":28.9,"em_rank":9,"kp_rank":7},"Nebraska":{"jb":68.2,"adjo":118.5,"adjd":92.4,"net":26.1,"three_pct":35.3,"three_par":50.7,"ftr":27.2,"to_pct":14.4,"steal":10.7,"block":8.7,"orb":26.3,"opp3":29.9,"tempo":66.7,"barthag":0.931,"rr":22.3,"em_rank":18,"kp_rank":14},"Vanderbilt":{"jb":74.7,"adjo":126.8,"adjd":99.3,"net":27.5,"three_pct":35.5,"three_par":43.6,"ftr":38.2,"to_pct":13.3,"steal":11.4,"block":12.6,"orb":31.2,"opp3":32.2,"tempo":68.8,"barthag":0.946,"rr":24.0,"em_rank":14,"kp_rank":12},"North Carolina":{"jb":61.7,"adjo":121.4,"adjd":100.5,"net":20.9,"three_pct":34.5,"three_par":42.3,"ftr":37.4,"to_pct":14.0,"steal":7.8,"block":8.6,"orb":31.4,"opp3":34.5,"tempo":67.9,"barthag":0.904,"rr":14.7,"em_rank":48,"kp_rank":29},"Saint Mary's":{"jb":64.9,"adjo":120.3,"adjd":97.2,"net":23.1,"three_pct":38.6,"three_par":36.1,"ftr":35.9,"to_pct":16.5,"steal":8.3,"block":9.7,"orb":37.4,"opp3":31.3,"tempo":65.2,"barthag":0.911,"rr":20.4,"em_rank":23,"kp_rank":24},"Clemson":{"jb":60.6,"adjo":116.5,"adjd":97.3,"net":19.2,"three_pct":34.1,"three_par":42.9,"ftr":37.1,"to_pct":14.2,"steal":9.5,"block":9.1,"orb":28.2,"opp3":32.6,"tempo":64.2,"barthag":0.892,"rr":16.6,"em_rank":38,"kp_rank":36},"Iowa":{"jb":65.2,"adjo":121.7,"adjd":99.3,"net":22.4,"three_pct":35.5,"three_par":41.8,"ftr":34.5,"to_pct":15.2,"steal":11.2,"block":6.7,"orb":30.1,"opp3":33.6,"tempo":63.0,"barthag":0.907,"rr":20.1,"em_rank":26,"kp_rank":25},"Texas A&M":{"jb":63.8,"adjo":119.7,"adjd":101.0,"net":18.7,"three_pct":36.2,"three_par":46.3,"ftr":37.4,"to_pct":14.6,"steal":10.9,"block":8.9,"orb":32.3,"opp3":31.7,"tempo":70.5,"barthag":0.872,"rr":16.4,"em_rank":41,"kp_rank":39},"VCU":{"jb":63.6,"adjo":119.9,"adjd":102.7,"net":17.2,"three_pct":36.7,"three_par":43.8,"ftr":43.7,"to_pct":15.2,"steal":10.6,"block":11.3,"orb":32.3,"opp3":33.1,"tempo":68.5,"barthag":0.843,"rr":16.1,"em_rank":42,"kp_rank":45},"McNeese":{"jb":50.5,"adjo":114.3,"adjd":101.8,"net":12.5,"three_pct":31.6,"three_par":35.1,"ftr":38.3,"to_pct":14.3,"steal":15.3,"block":15.8,"orb":35.0,"opp3":32.5,"tempo":66.2,"barthag":0.765,"rr":10.7,"em_rank":65,"kp_rank":68},"Troy":{"jb":34.4,"adjo":110.7,"adjd":109.0,"net":1.7,"three_pct":33.2,"three_par":45.6,"ftr":36.3,"to_pct":17.0,"steal":10.4,"block":9.1,"orb":34.8,"opp3":31.3,"tempo":64.9,"barthag":0.543,"rr":4.5,"em_rank":109,"kp_rank":143},"Penn":{"jb":34.4,"adjo":107.4,"adjd":105.9,"net":1.5,"three_pct":38.7,"three_par":35.0,"ftr":35.2,"to_pct":15.4,"steal":9.5,"block":8.5,"orb":30.3,"opp3":31.7,"tempo":69.0,"barthag":0.532,"rr":0.9,"em_rank":152,"kp_rank":150},"Idaho":{"jb":33.1,"adjo":108.8,"adjd":107.3,"net":1.5,"three_pct":34.5,"three_par":46.8,"ftr":34.8,"to_pct":15.0,"steal":8.1,"block":6.2,"orb":28.9,"opp3":34.8,"tempo":67.7,"barthag":0.57,"rr":0.1,"em_rank":163,"kp_rank":145},"Prairie View A&M":{"jb":11.5,"adjo":null,"adjd":null,"net":null,"three_pct":null,"three_par":null,"ftr":null,"to_pct":null,"steal":null,"block":null,"orb":null,"opp3":null,"tempo":null,"barthag":0.255,"rr":-9.8,"em_rank":288,"kp_rank":null},"Lehigh":{"jb":11.3,"adjo":null,"adjd":null,"net":null,"three_pct":null,"three_par":null,"ftr":null,"to_pct":null,"steal":null,"block":null,"orb":null,"opp3":null,"tempo":null,"barthag":0.252,"rr":-8.5,"em_rank":275,"kp_rank":null},"Arizona":{"jb":79.1,"adjo":127.7,"adjd":90.0,"net":37.7,"three_pct":36.0,"three_par":26.8,"ftr":42.9,"to_pct":15.2,"steal":10.9,"block":10.8,"orb":38.1,"opp3":31.4,"tempo":69.8,"barthag":0.978,"rr":32.0,"em_rank":3,"kp_rank":2},"Purdue":{"jb":76.2,"adjo":131.6,"adjd":100.4,"net":31.2,"three_pct":37.9,"three_par":40.9,"ftr":28.6,"to_pct":13.5,"steal":8.5,"block":8.9,"orb":36.3,"opp3":34.2,"tempo":64.4,"barthag":0.964,"rr":30.3,"em_rank":6,"kp_rank":8},"Gonzaga":{"jb":67.9,"adjo":122.0,"adjd":93.9,"net":28.1,"three_pct":34.0,"three_par":31.0,"ftr":31.1,"to_pct":13.7,"steal":12.0,"block":11.4,"orb":34.8,"opp3":30.8,"tempo":68.6,"barthag":0.95,"rr":27.7,"em_rank":10,"kp_rank":10},"Arkansas":{"jb":74.0,"adjo":127.7,"adjd":101.6,"net":26.1,"three_pct":38.9,"three_par":33.4,"ftr":36.4,"to_pct":12.3,"steal":9.9,"block":12.9,"orb":32.2,"opp3":31.7,"tempo":71.0,"barthag":0.936,"rr":23.8,"em_rank":15,"kp_rank":15},"Wisconsin":{"jb":70.3,"adjo":125.3,"adjd":102.0,"net":23.3,"three_pct":36.1,"three_par":52.6,"ftr":31.9,"to_pct":12.8,"steal":8.1,"block":8.5,"orb":29.4,"opp3":33.3,"tempo":68.7,"barthag":0.929,"rr":21.7,"em_rank":21,"kp_rank":22},"BYU":{"jb":63.2,"adjo":125.5,"adjd":102.2,"net":23.3,"three_pct":34.9,"three_par":39.8,"ftr":34.2,"to_pct":15.3,"steal":10.2,"block":11.9,"orb":34.6,"opp3":35.3,"tempo":69.9,"barthag":0.889,"rr":16.5,"em_rank":39,"kp_rank":23},"Miami (FL)":{"jb":60.1,"adjo":121.4,"adjd":100.7,"net":20.7,"three_pct":34.7,"three_par":31.6,"ftr":37.5,"to_pct":16.2,"steal":11.4,"block":10.0,"orb":37.0,"opp3":35.4,"tempo":67.6,"barthag":0.887,"rr":18.6,"em_rank":28,"kp_rank":31},"Villanova":{"jb":61.0,"adjo":120.4,"adjd":100.4,"net":20.0,"three_pct":35.3,"three_par":45.7,"ftr":31.3,"to_pct":15.1,"steal":11.1,"block":6.0,"orb":32.4,"opp3":33.9,"tempo":65.2,"barthag":0.88,"rr":15.0,"em_rank":47,"kp_rank":33},"Utah State":{"jb":64.5,"adjo":122.1,"adjd":101.4,"net":20.7,"three_pct":35.1,"three_par":40.7,"ftr":38.7,"to_pct":15.4,"steal":12.6,"block":8.8,"orb":33.1,"opp3":33.9,"tempo":67.7,"barthag":0.895,"rr":17.6,"em_rank":32,"kp_rank":30},"Missouri":{"jb":54.6,"adjo":119.5,"adjd":104.1,"net":15.4,"three_pct":35.0,"three_par":36.0,"ftr":42.5,"to_pct":18.0,"steal":9.7,"block":10.4,"orb":35.5,"opp3":36.5,"tempo":66.2,"barthag":0.851,"rr":14.4,"em_rank":49,"kp_rank":52},"Texas":{"jb":62.2,"adjo":125.0,"adjd":105.9,"net":19.1,"three_pct":34.9,"three_par":36.2,"ftr":46.2,"to_pct":15.3,"steal":8.1,"block":7.4,"orb":35.7,"opp3":36.0,"tempo":66.9,"barthag":0.854,"rr":17.1,"em_rank":34,"kp_rank":37},"NC State":{"jb":68.3,"adjo":124.1,"adjd":104.5,"net":19.6,"three_pct":38.8,"three_par":43.9,"ftr":35.2,"to_pct":13.1,"steal":11.5,"block":10.6,"orb":28.5,"opp3":35.6,"tempo":69.1,"barthag":0.876,"rr":16.5,"em_rank":40,"kp_rank":34},"High Point":{"jb":53.3,"adjo":117.0,"adjd":108.6,"net":8.4,"three_pct":34.4,"three_par":42.9,"ftr":42.9,"to_pct":13.0,"steal":14.5,"block":11.0,"orb":32.1,"opp3":31.9,"tempo":69.9,"barthag":0.699,"rr":8.6,"em_rank":79,"kp_rank":92},"Hawai'i":{"jb":34.2,"adjo":107.1,"adjd":101.2,"net":5.9,"three_pct":31.6,"three_par":39.7,"ftr":42.4,"to_pct":18.9,"steal":9.0,"block":10.0,"orb":31.4,"opp3":30.7,"tempo":69.7,"barthag":0.635,"rr":3.3,"em_rank":120,"kp_rank":108},"Kennesaw State":{"jb":33.3,"adjo":110.6,"adjd":110.1,"net":0.5,"three_pct":33.7,"three_par":42.9,"ftr":45.1,"to_pct":16.7,"steal":9.3,"block":14.7,"orb":35.5,"opp3":33.9,"tempo":71.2,"barthag":0.534,"rr":1.0,"em_rank":150,"kp_rank":163},"Queens":{"jb":30.5,"adjo":115.8,"adjd":117.2,"net":-1.4,"three_pct":35.9,"three_par":46.8,"ftr":36.3,"to_pct":14.8,"steal":8.2,"block":8.0,"orb":30.4,"opp3":35.8,"tempo":69.6,"barthag":0.44,"rr":-2.1,"em_rank":194,"kp_rank":181},"Long Island University":{"jb":17.0,"adjo":105.6,"adjd":109.6,"net":-4.0,"three_pct":36.1,"three_par":29.0,"ftr":34.7,"to_pct":19.0,"steal":11.4,"block":13.9,"orb":34.3,"opp3":31.9,"tempo":67.8,"barthag":0.34,"rr":-3.3,"em_rank":207,"kp_rank":216},"Michigan":{"jb":78.6,"adjo":126.6,"adjd":89.0,"net":37.6,"three_pct":36.0,"three_par":41.8,"ftr":37.7,"to_pct":16.7,"steal":8.0,"block":15.9,"orb":35.4,"opp3":30.2,"tempo":70.9,"barthag":0.98,"rr":34.5,"em_rank":2,"kp_rank":3},"Iowa State":{"jb":78.5,"adjo":123.8,"adjd":91.4,"net":32.4,"three_pct":38.7,"three_par":38.8,"ftr":34.0,"to_pct":15.1,"steal":13.2,"block":8.6,"orb":35.3,"opp3":32.1,"tempo":66.5,"barthag":0.966,"rr":29.5,"em_rank":7,"kp_rank":6},"Virginia":{"jb":69.4,"adjo":122.5,"adjd":95.8,"net":26.7,"three_pct":35.9,"three_par":46.5,"ftr":33.1,"to_pct":16.0,"steal":9.5,"block":17.5,"orb":37.9,"opp3":30.9,"tempo":65.7,"barthag":0.943,"rr":24.1,"em_rank":13,"kp_rank":13},"Alabama":{"jb":74.8,"adjo":129.0,"adjd":103.3,"net":25.7,"three_pct":35.8,"three_par":53.7,"ftr":37.2,"to_pct":13.0,"steal":8.6,"block":11.3,"orb":31.8,"opp3":33.5,"tempo":73.1,"barthag":0.934,"rr":23.2,"em_rank":17,"kp_rank":18},"Texas Tech":{"jb":68.3,"adjo":125.0,"adjd":99.8,"net":25.2,"three_pct":39.3,"three_par":48.0,"ftr":27.1,"to_pct":15.9,"steal":8.5,"block":9.5,"orb":33.3,"opp3":31.5,"tempo":66.2,"barthag":0.944,"rr":18.3,"em_rank":29,"kp_rank":20},"Tennessee":{"jb":63.8,"adjo":121.1,"adjd":95.0,"net":26.1,"three_pct":33.4,"three_par":31.7,"ftr":38.7,"to_pct":17.1,"steal":11.0,"block":11.3,"orb":45.1,"opp3":30.6,"tempo":65.0,"barthag":0.941,"rr":23.5,"em_rank":16,"kp_rank":16},"Kentucky":{"jb":62.8,"adjo":120.5,"adjd":99.0,"net":21.5,"three_pct":34.1,"three_par":39.2,"ftr":37.5,"to_pct":15.0,"steal":10.1,"block":12.3,"orb":33.8,"opp3":31.6,"tempo":68.3,"barthag":0.89,"rr":20.2,"em_rank":25,"kp_rank":28},"Georgia":{"jb":64.3,"adjo":124.7,"adjd":104.2,"net":20.5,"three_pct":34.1,"three_par":43.9,"ftr":37.0,"to_pct":14.3,"steal":11.2,"block":15.1,"orb":35.2,"opp3":33.7,"tempo":71.4,"barthag":0.876,"rr":18.2,"em_rank":30,"kp_rank":32},"Saint Louis":{"jb":64.0,"adjo":119.5,"adjd":101.2,"net":18.3,"three_pct":40.5,"three_par":45.1,"ftr":34.7,"to_pct":17.4,"steal":9.8,"block":9.4,"orb":31.1,"opp3":30.0,"tempo":71.0,"barthag":0.873,"rr":17.7,"em_rank":31,"kp_rank":41},"Santa Clara":{"jb":59.9,"adjo":123.6,"adjd":104.2,"net":19.4,"three_pct":34.9,"three_par":45.0,"ftr":25.8,"to_pct":15.6,"steal":12.6,"block":10.5,"orb":36.7,"opp3":33.0,"tempo":69.2,"barthag":0.895,"rr":16.9,"em_rank":36,"kp_rank":35},"Miami (Ohio)":{"jb":51.9,"adjo":116.8,"adjd":108.5,"net":8.3,"three_pct":37.5,"three_par":44.6,"ftr":40.2,"to_pct":14.5,"steal":9.7,"block":8.1,"orb":25.3,"opp3":33.0,"tempo":69.9,"barthag":0.718,"rr":8.1,"em_rank":84,"kp_rank":93},"SMU":{"jb":58.5,"adjo":122.9,"adjd":104.8,"net":18.1,"three_pct":37.4,"three_par":36.0,"ftr":30.6,"to_pct":15.9,"steal":10.0,"block":11.3,"orb":35.4,"opp3":33.9,"tempo":68.5,"barthag":0.861,"rr":16.6,"em_rank":37,"kp_rank":42},"Akron":{"jb":54.4,"adjo":118.8,"adjd":106.0,"net":12.8,"three_pct":38.5,"three_par":45.1,"ftr":29.1,"to_pct":15.5,"steal":10.2,"block":8.4,"orb":33.5,"opp3":35.1,"tempo":70.3,"barthag":0.773,"rr":11.2,"em_rank":62,"kp_rank":64},"Hofstra":{"jb":46.4,"adjo":114.6,"adjd":105.1,"net":9.5,"three_pct":36.8,"three_par":43.1,"ftr":32.5,"to_pct":16.2,"steal":7.3,"block":10.4,"orb":34.9,"opp3":32.3,"tempo":64.7,"barthag":0.705,"rr":10.0,"em_rank":74,"kp_rank":87},"Wright State":{"jb":34.3,"adjo":112.1,"adjd":110.0,"net":2.1,"three_pct":36.1,"three_par":33.7,"ftr":38.0,"to_pct":16.3,"steal":10.2,"block":11.4,"orb":33.2,"opp3":33.6,"tempo":67.2,"barthag":0.586,"rr":1.3,"em_rank":148,"kp_rank":140},"Tennessee State":{"jb":23.6,"adjo":109.1,"adjd":110.9,"net":-1.8,"three_pct":33.7,"three_par":30.7,"ftr":33.5,"to_pct":16.5,"steal":12.7,"block":10.1,"orb":34.9,"opp3":33.5,"tempo":70.2,"barthag":0.395,"rr":0.4,"em_rank":160,"kp_rank":187},"Howard":{"jb":22.8,"adjo":103.1,"adjd":106.3,"net":-3.2,"three_pct":34.7,"three_par":34.3,"ftr":44.2,"to_pct":19.8,"steal":12.4,"block":10.6,"orb":36.6,"opp3":30.4,"tempo":69.0,"barthag":0.425,"rr":-1.1,"em_rank":181,"kp_rank":207},"UMBC":{"jb":27.8,"adjo":108.2,"adjd":109.9,"net":-1.7,"three_pct":35.9,"three_par":38.8,"ftr":33.8,"to_pct":14.1,"steal":7.2,"block":6.5,"orb":25.1,"opp3":32.2,"tempo":66.2,"barthag":0.456,"rr":-0.1,"em_rank":165,"kp_rank":185}};

const UPSET_DATA = [{"region":"West","site":"Portland, OR","date":"2026-03-19","time":"13:50","fav":"Wisconsin","fav_seed":5,"dog":"High Point","dog_seed":12,"jb_fav":70.3,"jb_dog":53.3,"jb_delta":17.0,"upset_score":16.1,"tier":"strong","to_edge":41.3,"threep_edge":-30.2,"orb_edge":11.7,"ftr_edge":44.0,"arc_edge":17.5,"tempo_edge":10.9},{"region":"South","site":"Oklahoma City, OK","date":"2026-03-19","time":"18:50","fav":"Saint Mary's","fav_seed":7,"dog":"Texas A&M","dog_seed":10,"jb_fav":64.9,"jb_dog":63.8,"jb_delta":1.1,"upset_score":12.3,"tier":"moderate","to_edge":30.0,"threep_edge":20.2,"orb_edge":-22.2,"ftr_edge":6.0,"arc_edge":-5.0,"tempo_edge":48.2},{"region":"South","site":"Greenville, SC","date":"2026-03-19","time":"13:30","fav":"North Carolina","fav_seed":6,"dog":"VCU","dog_seed":11,"jb_fav":61.7,"jb_dog":63.6,"jb_delta":-1.9,"upset_score":11.6,"tier":"moderate","to_edge":10.7,"threep_edge":10.6,"orb_edge":3.9,"ftr_edge":25.2,"arc_edge":17.5,"tempo_edge":5.5},{"region":"East","site":"Buffalo, NY","date":"2026-03-19","time":"13:30","fav":"Louisville","fav_seed":6,"dog":"South Florida","dog_seed":11,"jb_fav":69.3,"jb_dog":58.7,"jb_delta":10.6,"upset_score":8.8,"tier":"moderate","to_edge":22.7,"threep_edge":-31.1,"orb_edge":23.0,"ftr_edge":30.4,"arc_edge":-15.0,"tempo_edge":17.3},{"region":"West","site":"San Diego, CA","date":"2026-03-20","time":"16:10","fav":"Villanova","fav_seed":8,"dog":"Utah State","dog_seed":9,"jb_fav":61.0,"jb_dog":64.5,"jb_delta":-3.5,"upset_score":6.7,"tier":"moderate","to_edge":8.0,"threep_edge":-13.2,"orb_edge":3.0,"ftr_edge":29.6,"arc_edge":0.0,"tempo_edge":22.7},{"region":"East","site":"Greenville, SC","date":"2026-03-19","time":"16:05","fav":"Ohio State","fav_seed":8,"dog":"TCU","dog_seed":9,"jb_fav":64.7,"jb_dog":55.8,"jb_delta":8.9,"upset_score":5.7,"tier":"moderate","to_edge":25.3,"threep_edge":-15.9,"orb_edge":16.1,"ftr_edge":3.6,"arc_edge":-26.3,"tempo_edge":14.5},{"region":"East","site":"Buffalo, NY","date":"2026-03-19","time":"22:00","fav":"Michigan State","fav_seed":3,"dog":"North Dakota State","dog_seed":14,"jb_fav":67.1,"jb_dog":47.7,"jb_delta":19.4,"upset_score":3.7,"tier":"low","to_edge":34.0,"threep_edge":15.5,"orb_edge":-20.9,"ftr_edge":-22.0,"arc_edge":-7.5,"tempo_edge":2.7},{"region":"West","site":"Portland, OR","date":"2026-03-19","time":"22:00","fav":"Gonzaga","fav_seed":3,"dog":"Kennesaw State","dog_seed":14,"jb_fav":67.9,"jb_dog":33.3,"jb_delta":34.6,"upset_score":3.6,"tier":"low","to_edge":-38.0,"threep_edge":28.0,"orb_edge":3.0,"ftr_edge":56.0,"arc_edge":-38.7,"tempo_edge":23.6},{"region":"East","site":"San Diego, CA","date":"2026-03-20","time":"21:45","fav":"Kansas","fav_seed":4,"dog":"Cal Baptist","dog_seed":13,"jb_fav":62.1,"jb_dog":33.5,"jb_delta":28.6,"upset_score":2.2,"tier":"low","to_edge":-17.3,"threep_edge":-12.0,"orb_edge":36.1,"ftr_edge":14.0,"arc_edge":12.5,"tempo_edge":-16.4},{"region":"Midwest","site":"Tampa, FL","date":"2026-03-20","time":"19:35","fav":"Texas Tech","fav_seed":5,"dog":"Akron","dog_seed":12,"jb_fav":68.3,"jb_dog":54.4,"jb_delta":13.9,"upset_score":2.0,"tier":"low","to_edge":14.0,"threep_edge":-10.7,"orb_edge":0.9,"ftr_edge":8.0,"arc_edge":-45.0,"tempo_edge":37.3},{"region":"West","site":"St. Louis, MO","date":"2026-03-20","time":"19:35","fav":"Purdue","fav_seed":2,"dog":"Queens","dog_seed":15,"jb_fav":76.2,"jb_dog":30.5,"jb_delta":45.7,"upset_score":1.4,"tier":"low","to_edge":-10.7,"threep_edge":9.3,"orb_edge":-25.7,"ftr_edge":30.8,"arc_edge":-20.0,"tempo_edge":47.3},{"region":"Midwest","site":"St. Louis, MO","date":"2026-03-20","time":"12:15","fav":"Kentucky","fav_seed":7,"dog":"Santa Clara","dog_seed":10,"jb_fav":62.8,"jb_dog":59.9,"jb_delta":2.9,"upset_score":1.1,"tier":"low","to_edge":12.7,"threep_edge":16.7,"orb_edge":12.6,"ftr_edge":-46.8,"arc_edge":-17.5,"tempo_edge":8.2},{"region":"South","site":"Oklahoma City, OK","date":"2026-03-19","time":"12:40","fav":"Nebraska","fav_seed":4,"dog":"Troy","dog_seed":13,"jb_fav":68.2,"jb_dog":34.4,"jb_delta":33.8,"upset_score":0.7,"tier":"low","to_edge":-19.3,"threep_edge":-19.7,"orb_edge":37.0,"ftr_edge":36.4,"arc_edge":-17.5,"tempo_edge":-16.4},{"region":"South","site":"Tampa, FL","date":"2026-03-20","time":"18:50","fav":"Clemson","fav_seed":8,"dog":"Iowa","dog_seed":9,"jb_fav":60.6,"jb_dog":65.2,"jb_delta":-4.6,"upset_score":-0.8,"tier":"low","to_edge":4.7,"threep_edge":1.5,"orb_edge":8.3,"ftr_edge":-10.4,"arc_edge":-12.5,"tempo_edge":-10.9},{"region":"South","site":"Oklahoma City, OK","date":"2026-03-19","time":"15:15","fav":"Vanderbilt","fav_seed":5,"dog":"McNeese","dog_seed":12,"jb_fav":74.7,"jb_dog":50.5,"jb_delta":24.2,"upset_score":-0.8,"tier":"low","to_edge":19.3,"threep_edge":-31.3,"orb_edge":16.5,"ftr_edge":0.4,"arc_edge":-3.7,"tempo_edge":-23.6},{"region":"Midwest","site":"Buffalo, NY","date":"2026-03-19","time":"21:45","fav":"Georgia","fav_seed":8,"dog":"Saint Louis","dog_seed":9,"jb_fav":64.3,"jb_dog":64.0,"jb_delta":0.3,"upset_score":-3.5,"tier":"low","to_edge":-30.0,"threep_edge":23.5,"orb_edge":-17.8,"ftr_edge":-9.2,"arc_edge":46.3,"tempo_edge":-3.6},{"region":"West","site":"St. Louis, MO","date":"2026-03-20","time":"22:10","fav":"Miami (FL)","fav_seed":7,"dog":"Missouri","dog_seed":10,"jb_fav":60.1,"jb_dog":54.6,"jb_delta":5.5,"upset_score":-4.4,"tier":"low","to_edge":-23.3,"threep_edge":11.7,"orb_edge":-6.5,"ftr_edge":20.0,"arc_edge":-13.8,"tempo_edge":-12.7},{"region":"East","site":"Philadelphia, PA","date":"2026-03-20","time":"19:25","fav":"UCLA","fav_seed":7,"dog":"UCF","dog_seed":10,"jb_fav":66.8,"jb_dog":51.0,"jb_delta":15.8,"upset_score":-6.0,"tier":"low","to_edge":-28.7,"threep_edge":-9.0,"orb_edge":14.3,"ftr_edge":-9.2,"arc_edge":-27.5,"tempo_edge":41.8},{"region":"South","site":"Greenville, SC","date":"2026-03-19","time":"21:25","fav":"Illinois","fav_seed":3,"dog":"Penn","dog_seed":14,"jb_fav":76.0,"jb_dog":34.4,"jb_delta":41.6,"upset_score":-6.1,"tier":"low","to_edge":11.3,"threep_edge":-28.9,"orb_edge":-36.5,"ftr_edge":9.2,"arc_edge":-3.8,"tempo_edge":31.8},{"region":"South","site":"Oklahoma City, OK","date":"2026-03-19","time":"22:10","fav":"Houston","fav_seed":2,"dog":"Idaho","dog_seed":15,"jb_fav":75.4,"jb_dog":33.1,"jb_delta":42.3,"upset_score":-7.6,"tier":"low","to_edge":-38.7,"threep_edge":13.6,"orb_edge":-30.0,"ftr_edge":31.6,"arc_edge":-33.7,"tempo_edge":40.0},{"region":"Midwest","site":"St. Louis, MO","date":"2026-03-20","time":"14:50","fav":"Iowa State","fav_seed":2,"dog":"Tennessee State","dog_seed":15,"jb_fav":78.5,"jb_dog":23.6,"jb_delta":54.9,"upset_score":-8.9,"tier":"low","to_edge":-12.7,"threep_edge":-33.4,"orb_edge":-1.7,"ftr_edge":-2.0,"arc_edge":-17.5,"tempo_edge":33.6},{"region":"Midwest","site":"Philadelphia, PA","date":"2026-03-20","time":"13:50","fav":"Virginia","fav_seed":3,"dog":"Wright State","dog_seed":14,"jb_fav":69.4,"jb_dog":34.3,"jb_delta":35.1,"upset_score":-9.0,"tier":"low","to_edge":2.7,"threep_edge":-32.3,"orb_edge":-20.4,"ftr_edge":19.6,"arc_edge":-33.8,"tempo_edge":13.6},{"region":"West","site":"Portland, OR","date":"2026-03-19","time":"16:25","fav":"Arkansas","fav_seed":4,"dog":"Hawai'i","dog_seed":13,"jb_fav":74.0,"jb_dog":34.2,"jb_delta":39.8,"upset_score":-10.2,"tier":"low","to_edge":-50.0,"threep_edge":-3.2,"orb_edge":-3.5,"ftr_edge":24.0,"arc_edge":12.5,"tempo_edge":-11.8},{"region":"East","site":"Philadelphia, PA","date":"2026-03-20","time":"22:00","fav":"UConn","fav_seed":2,"dog":"Furman","dog_seed":15,"jb_fav":57.8,"jb_dog":22.9,"jb_delta":34.9,"upset_score":-10.4,"tier":"low","to_edge":-31.3,"threep_edge":8.8,"orb_edge":-20.4,"ftr_edge":8.4,"arc_edge":-28.8,"tempo_edge":13.6},{"region":"West","site":"San Diego, CA","date":"2026-03-20","time":"13:35","fav":"Arizona","fav_seed":1,"dog":"Long Island University","dog_seed":16,"jb_fav":79.1,"jb_dog":17.0,"jb_delta":62.1,"upset_score":-15.0,"tier":"low","to_edge":-22.0,"threep_edge":5.9,"orb_edge":-16.5,"ftr_edge":-32.8,"arc_edge":-6.2,"tempo_edge":-18.2},{"region":"Midwest","site":"Tampa, FL","date":"2026-03-20","time":"15:15","fav":"Alabama","fav_seed":4,"dog":"Hofstra","dog_seed":13,"jb_fav":74.8,"jb_dog":46.4,"jb_delta":28.4,"upset_score":-18.6,"tier":"low","to_edge":-30.0,"threep_edge":-24.0,"orb_edge":13.5,"ftr_edge":-18.8,"arc_edge":15.0,"tempo_edge":-76.4},{"region":"East","site":"San Diego, CA","date":"2026-03-20","time":"19:20","fav":"St. John's","fav_seed":5,"dog":"Northern Iowa","dog_seed":12,"jb_fav":67.8,"jb_dog":46.2,"jb_delta":21.6,"upset_score":-23.9,"tier":"low","to_edge":-8.7,"threep_edge":18.6,"orb_edge":-60.4,"ftr_edge":-64.8,"arc_edge":30.0,"tempo_edge":-66.4},{"region":"East","site":"Greenville, SC","date":"2026-03-19","time":"14:50","fav":"Duke","fav_seed":1,"dog":"Siena","dog_seed":16,"jb_fav":82.3,"jb_dog":19.2,"jb_delta":63.1,"upset_score":-24.3,"tier":"low","to_edge":-18.7,"threep_edge":-42.0,"orb_edge":-27.0,"ftr_edge":-14.4,"arc_edge":-30.0,"tempo_edge":-6.4},{"region":"Midwest","site":"Oklahoma City, OK","date":"2026-03-21","time":"12:10","fav":"Michigan","fav_seed":1,"dog":"Saint Louis","dog_seed":9,"jb_fav":78.6,"jb_dog":64.0,"jb_delta":14.6,"upset_score":-4.4,"tier":"low","to_edge":-0.9999999999999996,"threep_edge":0.09999999999999964,"orb_edge":-1.7000000000000002,"ftr_edge":-1.3999999999999995,"arc_edge":1.7000000000000002,"tempo_edge":0},{"region":"East","site":"Oklahoma City, OK","date":"2026-03-21","time":"14:45","fav":"Louisville","fav_seed":6,"dog":"Michigan State","dog_seed":3,"jb_fav":69.3,"jb_dog":67.1,"jb_delta":2.2,"upset_score":-0.4,"tier":"low","to_edge":-0.8999999999999999,"threep_edge":-0.40000000000000036,"orb_edge":2.2,"ftr_edge":1.3000000000000007,"arc_edge":-1.9,"tempo_edge":0},{"region":"East","site":"Greenville, SC","date":"2026-03-21","time":"17:15","fav":"Duke","fav_seed":1,"dog":"TCU","dog_seed":9,"jb_fav":82.3,"jb_dog":55.8,"jb_delta":26.5,"upset_score":-7.6,"tier":"low","to_edge":0.2999999999999998,"threep_edge":-4.299999999999999,"orb_edge":-1.5,"ftr_edge":0.40000000000000036,"arc_edge":-0.5999999999999996,"tempo_edge":0},{"region":"South","site":"Oklahoma City, OK","date":"2026-03-21","time":"18:10","fav":"Houston","fav_seed":2,"dog":"Texas A&M","dog_seed":10,"jb_fav":75.4,"jb_dog":63.8,"jb_delta":11.6,"upset_score":0.8,"tier":"low","to_edge":-2.1999999999999993,"threep_edge":0.5999999999999996,"orb_edge":-1.4000000000000004,"ftr_edge":4.800000000000001,"arc_edge":-0.8999999999999995,"tempo_edge":3},{"region":"West","site":"Portland, OR","date":"2026-03-21","time":"19:10","fav":"Gonzaga","fav_seed":3,"dog":"Texas","dog_seed":11,"jb_fav":67.9,"jb_dog":62.2,"jb_delta":5.7,"upset_score":-6.1,"tier":"low","to_edge":-2.0999999999999996,"threep_edge":-3.2,"orb_edge":0.2999999999999998,"ftr_edge":6.5,"arc_edge":-3.6000000000000005,"tempo_edge":0},{"region":"South","site":"Greenville, SC","date":"2026-03-21","time":"19:50","fav":"Illinois","fav_seed":3,"dog":"VCU","dog_seed":11,"jb_fav":76.0,"jb_dog":63.6,"jb_delta":12.4,"upset_score":-1.4,"tier":"low","to_edge":-2.700000000000001,"threep_edge":-0.2999999999999998,"orb_edge":-2.5,"ftr_edge":5.1000000000000005,"arc_edge":4.6,"tempo_edge":0},{"region":"South","site":"Oklahoma City, OK","date":"2026-03-21","time":"20:45","fav":"Vanderbilt","fav_seed":5,"dog":"Nebraska","dog_seed":4,"jb_fav":74.7,"jb_dog":68.2,"jb_delta":6.5,"upset_score":-10.0,"tier":"low","to_edge":-1.4999999999999991,"threep_edge":1.1000000000000005,"orb_edge":-1.8999999999999995,"ftr_edge":-5.1,"arc_edge":-0.7000000000000002,"tempo_edge":0},{"region":"West","site":"Portland, OR","date":"2026-03-21","time":"21:45","fav":"Arkansas","fav_seed":4,"dog":"High Point","dog_seed":12,"jb_fav":74.0,"jb_dog":53.3,"jb_delta":20.7,"upset_score":2.3,"tier":"low","to_edge":-0.9000000000000004,"threep_edge":-1.2000000000000002,"orb_edge":-0.09999999999999964,"ftr_edge":3.0,"arc_edge":4.300000000000001,"tempo_edge":0},{"region":"East","site":"Buffalo, NY","date":"2026-03-22","time":"20:45","fav":"UCLA","fav_seed":7,"dog":"UConn","dog_seed":2,"jb_fav":66.8,"jb_dog":57.8,"jb_delta":9.0,"upset_score":-12.0,"tier":"low","to_edge":-4.5,"threep_edge":-1.1999999999999993,"orb_edge":1.7999999999999998,"ftr_edge":-1.4000000000000004,"arc_edge":0.40000000000000036,"tempo_edge":0},{"region":"West","site":"St. Louis, MO","date":"2026-03-22","time":"12:10","fav":"Purdue","fav_seed":2,"dog":"Miami (FL)","dog_seed":7,"jb_fav":76.2,"jb_dog":60.1,"jb_delta":16.1,"upset_score":-2.4,"tier":"low","to_edge":-3.6000000000000005,"threep_edge":0.0,"orb_edge":0.20000000000000018,"ftr_edge":4.2,"arc_edge":2.7,"tempo_edge":0},{"region":"Midwest","site":"St. Louis, MO","date":"2026-03-22","time":"14:45","fav":"Iowa State","fav_seed":2,"dog":"Kentucky","dog_seed":7,"jb_fav":78.5,"jb_dog":62.8,"jb_delta":15.7,"upset_score":-3.2,"tier":"low","to_edge":0.20000000000000018,"threep_edge":-1.5,"orb_edge":-0.6000000000000005,"ftr_edge":1.5999999999999996,"arc_edge":-2.8999999999999995,"tempo_edge":0},{"region":"East","site":"San Diego, CA","date":"2026-03-22","time":"17:15","fav":"St. John's","fav_seed":5,"dog":"Kansas","dog_seed":4,"jb_fav":67.8,"jb_dog":62.1,"jb_delta":5.7,"upset_score":-16.4,"tier":"low","to_edge":-1.0999999999999996,"threep_edge":-2.7,"orb_edge":-2.5000000000000004,"ftr_edge":-4.3,"arc_edge":-2.8999999999999995,"tempo_edge":0},{"region":"Midwest","site":"Philadelphia, PA","date":"2026-03-22","time":"18:10","fav":"Virginia","fav_seed":3,"dog":"Tennessee","dog_seed":6,"jb_fav":69.4,"jb_dog":63.8,"jb_delta":5.6,"upset_score":-3.0,"tier":"low","to_edge":-1.4,"threep_edge":-4.3999999999999995,"orb_edge":2.8,"ftr_edge":2.5999999999999996,"arc_edge":1.4000000000000004,"tempo_edge":0},{"region":"South","site":"Tampa, FL","date":"2026-03-22","time":"19:10","fav":"Florida","fav_seed":1,"dog":"Iowa","dog_seed":9,"jb_fav":70.3,"jb_dog":65.2,"jb_delta":5.1,"upset_score":-5.5,"tier":"low","to_edge":1.6999999999999993,"threep_edge":-0.10000000000000053,"orb_edge":-4.999999999999999,"ftr_edge":-2.1000000000000005,"arc_edge":1.9000000000000004,"tempo_edge":-3},{"region":"West","site":"San Diego, CA","date":"2026-03-22","time":"19:50","fav":"Arizona","fav_seed":1,"dog":"Utah State","dog_seed":9,"jb_fav":79.1,"jb_dog":64.5,"jb_delta":14.6,"upset_score":-6.1,"tier":"low","to_edge":-0.2999999999999998,"threep_edge":-1.5,"orb_edge":-2.0,"ftr_edge":-2.0,"arc_edge":1.5999999999999996,"tempo_edge":0},{"region":"Midwest","site":"Tampa, FL","date":"2026-03-22","time":"21:45","fav":"Alabama","fav_seed":4,"dog":"Texas Tech","dog_seed":5,"jb_fav":74.8,"jb_dog":68.3,"jb_delta":6.5,"upset_score":-11.0,"tier":"low","to_edge":-3.8999999999999995,"threep_edge":3.9000000000000004,"orb_edge":0.6000000000000005,"ftr_edge":-4.699999999999999,"arc_edge":-0.09999999999999964,"tempo_edge":-3},{"region":"West","site":"San Jose, CA","date":"2026-03-26","time":"19:10","fav":"Purdue","fav_seed":2,"dog":"Texas","dog_seed":11,"jb_fav":76.2,"jb_dog":62.2,"jb_delta":14.0,"upset_score":0.0,"tier":"low","to_edge":0,"threep_edge":0,"orb_edge":0,"ftr_edge":0,"arc_edge":0,"tempo_edge":0},{"region":"South","site":"Houston, TX","date":"2026-03-26","time":"19:30","fav":"Nebraska","fav_seed":4,"dog":"Iowa","dog_seed":9,"jb_fav":68.2,"jb_dog":65.2,"jb_delta":3.0,"upset_score":0.0,"tier":"moderate","to_edge":0,"threep_edge":0,"orb_edge":0,"ftr_edge":0,"arc_edge":0,"tempo_edge":0},{"region":"West","site":"San Jose, CA","date":"2026-03-26","time":"21:45","fav":"Arizona","fav_seed":1,"dog":"Arkansas","dog_seed":4,"jb_fav":79.1,"jb_dog":74.0,"jb_delta":5.1,"upset_score":0.0,"tier":"moderate","to_edge":0,"threep_edge":0,"orb_edge":0,"ftr_edge":0,"arc_edge":0,"tempo_edge":0},{"region":"South","site":"Houston, TX","date":"2026-03-26","time":"22:05","fav":"Houston","fav_seed":2,"dog":"Illinois","dog_seed":3,"jb_fav":75.4,"jb_dog":76.0,"jb_delta":-0.6,"upset_score":0.0,"tier":"moderate","to_edge":0,"threep_edge":0,"orb_edge":0,"ftr_edge":0,"arc_edge":0,"tempo_edge":0},{"region":"East","site":"Washington, DC","date":"2026-03-27","time":"19:10","fav":"Duke","fav_seed":1,"dog":"St. John's","dog_seed":5,"jb_fav":82.3,"jb_dog":67.8,"jb_delta":14.5,"upset_score":0.0,"tier":"low","to_edge":0,"threep_edge":0,"orb_edge":0,"ftr_edge":0,"arc_edge":0,"tempo_edge":0},{"region":"Midwest","site":"Chicago, IL","date":"2026-03-27","time":"19:35","fav":"Michigan","fav_seed":1,"dog":"Alabama","dog_seed":4,"jb_fav":78.6,"jb_dog":74.8,"jb_delta":3.8,"upset_score":0.0,"tier":"moderate","to_edge":0,"threep_edge":0,"orb_edge":0,"ftr_edge":0,"arc_edge":0,"tempo_edge":0},{"region":"East","site":"Washington, DC","date":"2026-03-27","time":"21:45","fav":"Michigan State","fav_seed":3,"dog":"UConn","dog_seed":2,"jb_fav":67.1,"jb_dog":57.8,"jb_delta":9.3,"upset_score":0.0,"tier":"low","to_edge":0,"threep_edge":0,"orb_edge":0,"ftr_edge":0,"arc_edge":0,"tempo_edge":0},{"region":"Midwest","site":"Chicago, IL","date":"2026-03-27","time":"22:10","fav":"Iowa State","fav_seed":2,"dog":"Tennessee","dog_seed":6,"jb_fav":78.5,"jb_dog":63.8,"jb_delta":14.7,"upset_score":0.0,"tier":"low","to_edge":0,"threep_edge":0,"orb_edge":0,"ftr_edge":0,"arc_edge":0,"tempo_edge":0}];


// ── Team data (pre-scored from KenPom + EvanMiya) ─────────────────────────────
const TEAM_DATA = {"teams":[{"id":"duke","name":"Duke","seed":1,"region":"East","record":"32-2","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":6.1,"free_throw_gen":6.6,"off_efficiency":8.8,"ball_security":5.4,"off_rebounding":7.3,"def_efficiency":10.0,"opp_3pt_allowed":8.2,"rim_protection":4.4,"pressure_defense":6.5,"experience":1.6,"pace_label":"Slow","pace_raw":65.3,"avg_height":79.3,"barthag":0.981,"rr":34.8,"em_rank":"1","kenpom_rank":1},{"id":"uconn","name":"UConn","seed":2,"region":"East","record":"29-5","is_ff":false,"archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":5.4,"free_throw_gen":3.0,"off_efficiency":6.7,"ball_security":4.0,"off_rebounding":6.3,"def_efficiency":8.4,"opp_3pt_allowed":8.3,"rim_protection":8.2,"pressure_defense":5.4,"experience":8.6,"pace_label":"Slow","pace_raw":64.4,"avg_height":78.6,"barthag":0.965,"rr":30.5,"em_rank":"8","kenpom_rank":11},{"id":"michigan_state","name":"Michigan State","seed":3,"region":"East","record":"25-7","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":5.1,"free_throw_gen":5.9,"off_efficiency":7.0,"ball_security":3.6,"off_rebounding":7.4,"def_efficiency":8.2,"opp_3pt_allowed":5.3,"rim_protection":6.7,"pressure_defense":2.9,"experience":4.0,"pace_label":"Slow","pace_raw":66.0,"avg_height":78.7,"barthag":0.944,"rr":24.6,"em_rank":"12","kenpom_rank":9},{"id":"kansas","name":"Kansas","seed":4,"region":"East","record":"23-10","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":4.5,"free_throw_gen":4.2,"off_efficiency":5.4,"ball_security":5.7,"off_rebounding":3.9,"def_efficiency":8.4,"opp_3pt_allowed":7.9,"rim_protection":8.5,"pressure_defense":3.2,"experience":5.6,"pace_label":"Moderate","pace_raw":67.6,"avg_height":78.7,"barthag":0.928,"rr":21.9,"em_rank":"19","kenpom_rank":21},{"id":"st_johns","name":"St. John's","seed":5,"region":"East","record":"28-6","is_ff":false,"archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":3.4,"free_throw_gen":8.5,"off_efficiency":6.0,"ball_security":6.8,"off_rebounding":6.4,"def_efficiency":8.3,"opp_3pt_allowed":7.2,"rim_protection":6.0,"pressure_defense":6.1,"experience":7.9,"pace_label":"Moderate","pace_raw":69.6,"avg_height":78.2,"barthag":0.942,"rr":25.5,"em_rank":"11","kenpom_rank":17},{"id":"louisville","name":"Louisville","seed":6,"region":"East","record":"23-10","is_ff":false,"archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":7.7,"free_throw_gen":4.6,"off_efficiency":7.4,"ball_security":4.5,"off_rebounding":5.2,"def_efficiency":6.9,"opp_3pt_allowed":5.5,"rim_protection":3.5,"pressure_defense":4.8,"experience":8.9,"pace_label":"Moderate","pace_raw":69.6,"avg_height":78.4,"barthag":0.936,"rr":21.8,"em_rank":"20","kenpom_rank":19},{"id":"ucla","name":"UCLA","seed":7,"region":"East","record":"23-11","is_ff":false,"archetype":"offensive_engine","is_veteran":true,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":4.4,"off_efficiency":7.3,"ball_security":8.5,"off_rebounding":4.5,"def_efficiency":5.8,"opp_3pt_allowed":6.6,"rim_protection":3.7,"pressure_defense":5.0,"experience":9.1,"pace_label":"Slow","pace_raw":64.6,"avg_height":78.0,"barthag":0.911,"rr":20.3,"em_rank":"24","kenpom_rank":27},{"id":"ohio_state","name":"Ohio State","seed":8,"region":"East","record":"21-12","is_ff":false,"archetype":"offensive_engine","is_veteran":true,"is_length":false,"three_pt_prowess":5.7,"free_throw_gen":6.6,"off_efficiency":7.5,"ball_security":5.7,"off_rebounding":4.4,"def_efficiency":5.8,"opp_3pt_allowed":6.8,"rim_protection":1.6,"pressure_defense":2.4,"experience":7.5,"pace_label":"Slow","pace_raw":66.1,"avg_height":77.9,"barthag":0.917,"rr":21.2,"em_rank":"22","kenpom_rank":26},{"id":"tcu","name":"TCU","seed":9,"region":"East","record":"22-11","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":3.9,"free_throw_gen":7.0,"off_efficiency":4.4,"ball_security":5.7,"off_rebounding":5.8,"def_efficiency":7.2,"opp_3pt_allowed":4.3,"rim_protection":6.2,"pressure_defense":5.9,"experience":5.7,"pace_label":"Moderate","pace_raw":67.7,"avg_height":76.4,"barthag":0.837,"rr":16.0,"em_rank":"43","kenpom_rank":43},{"id":"ucf","name":"UCF","seed":10,"region":"East","record":"21-11","is_ff":false,"archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":4.8,"free_throw_gen":3.4,"off_efficiency":6.2,"ball_security":5.4,"off_rebounding":5.8,"def_efficiency":4.8,"opp_3pt_allowed":4.0,"rim_protection":2.8,"pressure_defense":3.1,"experience":8.3,"pace_label":"Moderate","pace_raw":69.2,"avg_height":78.6,"barthag":0.812,"rr":11.3,"em_rank":"61","kenpom_rank":54},{"id":"south_florida","name":"South Florida","seed":11,"region":"East","record":"25-8","is_ff":false,"archetype":"foul_line_bully","is_veteran":false,"is_length":false,"three_pt_prowess":5.0,"free_throw_gen":8.1,"off_efficiency":5.1,"ball_security":6.1,"off_rebounding":7.3,"def_efficiency":6.2,"opp_3pt_allowed":4.1,"rim_protection":4.8,"pressure_defense":6.8,"experience":4.7,"pace_label":"Fast","pace_raw":71.5,"avg_height":77.1,"barthag":0.836,"rr":15.8,"em_rank":"44","kenpom_rank":47},{"id":"northern_iowa","name":"Northern Iowa","seed":12,"region":"East","record":"23-12","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":5.2,"free_throw_gen":1.0,"off_efficiency":2.5,"ball_security":6.9,"off_rebounding":1.0,"def_efficiency":7.1,"opp_3pt_allowed":10.0,"rim_protection":4.0,"pressure_defense":4.8,"experience":6.5,"pace_label":"Slow","pace_raw":62.3,"avg_height":77.6,"barthag":0.774,"rr":10.6,"em_rank":"67","kenpom_rank":72},{"id":"cal_baptist","name":"Cal Baptist","seed":13,"region":"East","record":"25-8","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.3,"free_throw_gen":5.8,"off_efficiency":1.8,"ball_security":2.2,"off_rebounding":7.2,"def_efficiency":5.9,"opp_3pt_allowed":9.1,"rim_protection":2.2,"pressure_defense":3.2,"experience":4.0,"pace_label":"Slow","pace_raw":65.8,"avg_height":76.5,"barthag":0.689,"rr":3.7,"em_rank":"118","kenpom_rank":106},{"id":"north_dakota_state","name":"North Dakota State","seed":14,"region":"East","record":"27-7","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":3.3,"off_efficiency":3.1,"ball_security":5.6,"off_rebounding":5.5,"def_efficiency":4.4,"opp_3pt_allowed":4.6,"rim_protection":3.3,"pressure_defense":6.2,"experience":3.7,"pace_label":"Slow","pace_raw":66.3,"avg_height":76.2,"barthag":0.904,"rr":14.7,"em_rank":"48","kenpom_rank":113},{"id":"furman","name":"Furman","seed":15,"region":"East","record":"22-12","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":true,"three_pt_prowess":5.5,"free_throw_gen":4.0,"off_efficiency":1.7,"ball_security":2.6,"off_rebounding":4.5,"def_efficiency":3.5,"opp_3pt_allowed":5.6,"rim_protection":3.7,"pressure_defense":1.9,"experience":3.0,"pace_label":"Slow","pace_raw":65.9,"avg_height":79.2,"barthag":0.444,"rr":0.9,"em_rank":"153","kenpom_rank":191},{"id":"siena","name":"Siena","seed":16,"region":"East","record":"23-11","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":1.9,"free_throw_gen":4.9,"off_efficiency":1.5,"ball_security":5.0,"off_rebounding":4.9,"def_efficiency":3.6,"opp_3pt_allowed":5.4,"rim_protection":3.4,"pressure_defense":4.2,"experience":2.9,"pace_label":"Slow","pace_raw":64.6,"avg_height":76.7,"barthag":0.455,"rr":-0.1,"em_rank":"166","kenpom_rank":192},{"id":"florida","name":"Florida","seed":1,"region":"South","record":"26-7","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":2.9,"free_throw_gen":7.2,"off_efficiency":7.9,"ball_security":4.4,"off_rebounding":9.2,"def_efficiency":9.1,"opp_3pt_allowed":5.9,"rim_protection":6.0,"pressure_defense":4.3,"experience":6.5,"pace_label":"Fast","pace_raw":70.5,"avg_height":78.9,"barthag":0.973,"rr":31.4,"em_rank":"4","kenpom_rank":4},{"id":"houston","name":"Houston","seed":2,"region":"South","record":"28-6","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":false,"three_pt_prowess":5.3,"free_throw_gen":1.6,"off_efficiency":7.7,"ball_security":9.1,"off_rebounding":6.4,"def_efficiency":9.2,"opp_3pt_allowed":6.2,"rim_protection":6.0,"pressure_defense":6.8,"experience":5.9,"pace_label":"Slow","pace_raw":63.3,"avg_height":77.8,"barthag":0.97,"rr":31.0,"em_rank":"5","kenpom_rank":5},{"id":"illinois","name":"Illinois","seed":3,"region":"South","record":"24-8","is_ff":false,"archetype":"offensive_juggernaut","is_veteran":false,"is_length":true,"three_pt_prowess":6.9,"free_throw_gen":4.3,"off_efficiency":9.9,"ball_security":8.8,"off_rebounding":7.5,"def_efficiency":6.8,"opp_3pt_allowed":7.0,"rim_protection":6.2,"pressure_defense":1.0,"experience":5.0,"pace_label":"Slow","pace_raw":65.5,"avg_height":80.0,"barthag":0.968,"rr":28.9,"em_rank":"9","kenpom_rank":7},{"id":"nebraska","name":"Nebraska","seed":4,"region":"South","record":"26-6","is_ff":false,"archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":7.2,"free_throw_gen":1.7,"off_efficiency":5.5,"ball_security":7.2,"off_rebounding":2.7,"def_efficiency":8.9,"opp_3pt_allowed":8.8,"rim_protection":3.1,"pressure_defense":5.7,"experience":8.4,"pace_label":"Slow","pace_raw":66.7,"avg_height":77.8,"barthag":0.931,"rr":22.3,"em_rank":"18","kenpom_rank":14},{"id":"vanderbilt","name":"Vanderbilt","seed":5,"region":"South","record":"26-8","is_ff":false,"archetype":"offensive_juggernaut","is_veteran":true,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":6.8,"off_efficiency":8.3,"ball_security":8.7,"off_rebounding":4.6,"def_efficiency":6.7,"opp_3pt_allowed":6.1,"rim_protection":6.2,"pressure_defense":6.4,"experience":8.8,"pace_label":"Moderate","pace_raw":68.8,"avg_height":77.2,"barthag":0.946,"rr":24.0,"em_rank":"14","kenpom_rank":12},{"id":"north_carolina","name":"North Carolina","seed":6,"region":"South","record":"24-8","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":true,"three_pt_prowess":5.5,"free_throw_gen":6.4,"off_efficiency":6.5,"ball_security":7.7,"off_rebounding":4.7,"def_efficiency":6.3,"opp_3pt_allowed":3.4,"rim_protection":3.0,"pressure_defense":3.0,"experience":3.5,"pace_label":"Moderate","pace_raw":67.9,"avg_height":79.2,"barthag":0.904,"rr":14.7,"em_rank":"48","kenpom_rank":29},{"id":"saint_marys","name":"Saint Mary's","seed":7,"region":"South","record":"27-5","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":6.2,"free_throw_gen":5.7,"off_efficiency":6.1,"ball_security":4.4,"off_rebounding":7.0,"def_efficiency":7.4,"opp_3pt_allowed":7.2,"rim_protection":3.9,"pressure_defense":3.5,"experience":1.0,"pace_label":"Slow","pace_raw":65.2,"avg_height":78.9,"barthag":0.911,"rr":20.4,"em_rank":"23","kenpom_rank":24},{"id":"clemson","name":"Clemson","seed":8,"region":"South","record":"24-10","is_ff":false,"archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":5.3,"free_throw_gen":6.3,"off_efficiency":4.8,"ball_security":7.4,"off_rebounding":3.4,"def_efficiency":7.4,"opp_3pt_allowed":5.6,"rim_protection":3.4,"pressure_defense":4.6,"experience":8.3,"pace_label":"Slow","pace_raw":64.2,"avg_height":77.8,"barthag":0.892,"rr":16.6,"em_rank":"38","kenpom_rank":36},{"id":"iowa","name":"Iowa","seed":9,"region":"South","record":"21-12","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":5.8,"free_throw_gen":5.1,"off_efficiency":6.6,"ball_security":6.1,"off_rebounding":4.2,"def_efficiency":6.7,"opp_3pt_allowed":4.4,"rim_protection":1.5,"pressure_defense":6.2,"experience":4.2,"pace_label":"Slow","pace_raw":63.0,"avg_height":78.5,"barthag":0.907,"rr":20.1,"em_rank":"26","kenpom_rank":25},{"id":"texas_am","name":"Texas A&M","seed":10,"region":"South","record":"21-11","is_ff":false,"archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":6.4,"off_efficiency":5.9,"ball_security":6.9,"off_rebounding":5.0,"def_efficiency":6.2,"opp_3pt_allowed":6.7,"rim_protection":3.3,"pressure_defense":5.9,"experience":9.5,"pace_label":"Fast","pace_raw":70.5,"avg_height":77.2,"barthag":0.872,"rr":16.4,"em_rank":"41","kenpom_rank":39},{"id":"vcu","name":"VCU","seed":11,"region":"South","record":"27-7","is_ff":false,"archetype":"gunslinger","is_veteran":false,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":9.4,"off_efficiency":6.0,"ball_security":6.1,"off_rebounding":5.0,"def_efficiency":5.6,"opp_3pt_allowed":5.0,"rim_protection":5.1,"pressure_defense":5.6,"experience":5.0,"pace_label":"Moderate","pace_raw":68.5,"avg_height":77.8,"barthag":0.843,"rr":16.1,"em_rank":"42","kenpom_rank":45},{"id":"mcneese","name":"McNeese","seed":12,"region":"South","record":"28-5","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.0,"free_throw_gen":6.8,"off_efficiency":4.0,"ball_security":7.3,"off_rebounding":6.1,"def_efficiency":5.9,"opp_3pt_allowed":5.7,"rim_protection":8.7,"pressure_defense":10.0,"experience":6.2,"pace_label":"Slow","pace_raw":66.2,"avg_height":77.1,"barthag":0.765,"rr":10.7,"em_rank":"65","kenpom_rank":68},{"id":"troy","name":"Troy","seed":13,"region":"South","record":"22-11","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.4,"free_throw_gen":5.9,"off_efficiency":2.8,"ball_security":3.7,"off_rebounding":6.0,"def_efficiency":3.6,"opp_3pt_allowed":7.2,"rim_protection":3.4,"pressure_defense":5.5,"experience":3.5,"pace_label":"Slow","pace_raw":64.9,"avg_height":77.4,"barthag":0.543,"rr":4.5,"em_rank":"109","kenpom_rank":143},{"id":"penn","name":"Penn","seed":14,"region":"South","record":"18-11","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.1,"free_throw_gen":5.4,"off_efficiency":1.6,"ball_security":5.8,"off_rebounding":4.2,"def_efficiency":4.6,"opp_3pt_allowed":6.7,"rim_protection":3.0,"pressure_defense":4.6,"experience":3.2,"pace_label":"Moderate","pace_raw":69.0,"avg_height":77.8,"barthag":0.532,"rr":0.9,"em_rank":"152","kenpom_rank":150},{"id":"idaho","name":"Idaho","seed":15,"region":"South","record":"21-14","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.2,"free_throw_gen":5.2,"off_efficiency":2.1,"ball_security":6.4,"off_rebounding":3.7,"def_efficiency":4.2,"opp_3pt_allowed":3.0,"rim_protection":1.2,"pressure_defense":3.3,"experience":4.8,"pace_label":"Moderate","pace_raw":67.7,"avg_height":77.2,"barthag":0.57,"rr":0.1,"em_rank":"163","kenpom_rank":145},{"id":"prairie_view_am","name":"Prairie View A&M","seed":16,"region":"South","record":"18-17","is_ff":true,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":null,"free_throw_gen":null,"off_efficiency":null,"ball_security":null,"off_rebounding":null,"def_efficiency":null,"opp_3pt_allowed":null,"rim_protection":null,"pressure_defense":null,"experience":null,"pace_label":"Slow","pace_raw":null,"avg_height":null,"barthag":0.255,"rr":-9.8,"em_rank":"288","kenpom_rank":999},{"id":"lehigh","name":"Lehigh","seed":16,"region":"South","record":"18-16","is_ff":true,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":null,"free_throw_gen":null,"off_efficiency":null,"ball_security":null,"off_rebounding":null,"def_efficiency":null,"opp_3pt_allowed":null,"rim_protection":null,"pressure_defense":null,"experience":null,"pace_label":"Slow","pace_raw":null,"avg_height":null,"barthag":0.252,"rr":-8.5,"em_rank":"275","kenpom_rank":999},{"id":"arizona","name":"Arizona","seed":1,"region":"West","record":"32-2","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":3.5,"free_throw_gen":9.0,"off_efficiency":8.7,"ball_security":6.1,"off_rebounding":7.3,"def_efficiency":9.7,"opp_3pt_allowed":7.0,"rim_protection":4.8,"pressure_defense":5.9,"experience":4.8,"pace_label":"Moderate","pace_raw":69.8,"avg_height":79.0,"barthag":0.978,"rr":32.0,"em_rank":"3","kenpom_rank":2},{"id":"purdue","name":"Purdue","seed":2,"region":"West","record":"27-8","is_ff":false,"archetype":"offensive_juggernaut","is_veteran":true,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":2.3,"off_efficiency":10.0,"ball_security":8.4,"off_rebounding":6.6,"def_efficiency":6.4,"opp_3pt_allowed":3.7,"rim_protection":3.3,"pressure_defense":3.7,"experience":9.0,"pace_label":"Slow","pace_raw":64.4,"avg_height":77.8,"barthag":0.964,"rr":30.3,"em_rank":"6","kenpom_rank":8},{"id":"gonzaga","name":"Gonzaga","seed":3,"region":"West","record":"30-3","is_ff":false,"archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":3.3,"free_throw_gen":3.5,"off_efficiency":6.7,"ball_security":8.1,"off_rebounding":6.0,"def_efficiency":8.4,"opp_3pt_allowed":7.7,"rim_protection":5.2,"pressure_defense":6.9,"experience":10.0,"pace_label":"Moderate","pace_raw":68.6,"avg_height":78.0,"barthag":0.95,"rr":27.7,"em_rank":"10","kenpom_rank":10},{"id":"arkansas","name":"Arkansas","seed":4,"region":"West","record":"26-8","is_ff":false,"archetype":"offensive_juggernaut","is_veteran":false,"is_length":false,"three_pt_prowess":5.9,"free_throw_gen":6.0,"off_efficiency":8.7,"ball_security":10.0,"off_rebounding":5.0,"def_efficiency":6.0,"opp_3pt_allowed":6.7,"rim_protection":6.4,"pressure_defense":5.0,"experience":4.9,"pace_label":"Fast","pace_raw":71.0,"avg_height":78.5,"barthag":0.936,"rr":23.8,"em_rank":"15","kenpom_rank":15},{"id":"wisconsin","name":"Wisconsin","seed":5,"region":"West","record":"24-10","is_ff":false,"archetype":"sniper_system","is_veteran":true,"is_length":true,"three_pt_prowess":7.8,"free_throw_gen":3.9,"off_efficiency":7.8,"ball_security":9.3,"off_rebounding":3.9,"def_efficiency":5.9,"opp_3pt_allowed":4.8,"rim_protection":3.0,"pressure_defense":3.3,"experience":8.3,"pace_label":"Moderate","pace_raw":68.7,"avg_height":78.8,"barthag":0.929,"rr":21.7,"em_rank":"21","kenpom_rank":22},{"id":"byu","name":"BYU","seed":6,"region":"West","record":"23-11","is_ff":false,"archetype":"offensive_engine","is_veteran":false,"is_length":false,"three_pt_prowess":5.2,"free_throw_gen":4.9,"off_efficiency":7.9,"ball_security":6.0,"off_rebounding":5.9,"def_efficiency":5.8,"opp_3pt_allowed":2.4,"rim_protection":5.6,"pressure_defense":5.3,"experience":5.0,"pace_label":"Moderate","pace_raw":69.9,"avg_height":78.3,"barthag":0.889,"rr":16.5,"em_rank":"39","kenpom_rank":23},{"id":"miami_fl","name":"Miami (FL)","seed":7,"region":"West","record":"25-8","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.7,"free_throw_gen":6.5,"off_efficiency":6.5,"ball_security":4.8,"off_rebounding":6.8,"def_efficiency":6.3,"opp_3pt_allowed":2.3,"rim_protection":4.1,"pressure_defense":6.4,"experience":5.6,"pace_label":"Moderate","pace_raw":67.6,"avg_height":78.4,"barthag":0.887,"rr":18.6,"em_rank":"28","kenpom_rank":31},{"id":"villanova","name":"Villanova","seed":8,"region":"West","record":"24-8","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.3,"free_throw_gen":3.6,"off_efficiency":6.1,"ball_security":6.2,"off_rebounding":5.1,"def_efficiency":6.4,"opp_3pt_allowed":4.1,"rim_protection":1.0,"pressure_defense":6.1,"experience":6.1,"pace_label":"Slow","pace_raw":65.2,"avg_height":77.6,"barthag":0.88,"rr":15.0,"em_rank":"47","kenpom_rank":33},{"id":"utah_state","name":"Utah State","seed":9,"region":"West","record":"28-6","is_ff":false,"archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":7.0,"off_efficiency":6.7,"ball_security":5.8,"off_rebounding":5.3,"def_efficiency":6.0,"opp_3pt_allowed":4.1,"rim_protection":3.2,"pressure_defense":7.5,"experience":8.7,"pace_label":"Moderate","pace_raw":67.7,"avg_height":77.7,"barthag":0.895,"rr":17.6,"em_rank":"32","kenpom_rank":30},{"id":"missouri","name":"Missouri","seed":10,"region":"West","record":"20-12","is_ff":false,"archetype":"foul_line_bully","is_veteran":true,"is_length":true,"three_pt_prowess":4.6,"free_throw_gen":8.8,"off_efficiency":5.8,"ball_security":2.3,"off_rebounding":6.3,"def_efficiency":5.2,"opp_3pt_allowed":1.0,"rim_protection":4.4,"pressure_defense":4.8,"experience":7.6,"pace_label":"Slow","pace_raw":66.2,"avg_height":79.3,"barthag":0.851,"rr":14.4,"em_rank":"49","kenpom_rank":52},{"id":"texas","name":"Texas","seed":11,"region":"West","record":"18-14","is_ff":true,"archetype":"foul_line_bully","is_veteran":true,"is_length":false,"three_pt_prowess":4.5,"free_throw_gen":10.0,"off_efficiency":7.7,"ball_security":6.0,"off_rebounding":6.3,"def_efficiency":4.6,"opp_3pt_allowed":1.6,"rim_protection":2.1,"pressure_defense":3.3,"experience":10.0,"pace_label":"Slow","pace_raw":66.9,"avg_height":78.1,"barthag":0.854,"rr":17.1,"em_rank":"34","kenpom_rank":37},{"id":"nc_state","name":"NC State","seed":11,"region":"West","record":"20-13","is_ff":true,"archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":7.6,"free_throw_gen":5.4,"off_efficiency":7.4,"ball_security":8.9,"off_rebounding":3.5,"def_efficiency":5.1,"opp_3pt_allowed":2.1,"rim_protection":4.6,"pressure_defense":6.5,"experience":7.6,"pace_label":"Moderate","pace_raw":69.1,"avg_height":77.9,"barthag":0.876,"rr":16.5,"em_rank":"40","kenpom_rank":34},{"id":"high_point","name":"High Point","seed":12,"region":"West","record":"30-4","is_ff":false,"archetype":"foul_line_bully","is_veteran":true,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":9.0,"off_efficiency":4.9,"ball_security":9.1,"off_rebounding":4.9,"def_efficiency":3.7,"opp_3pt_allowed":6.4,"rim_protection":4.9,"pressure_defense":9.3,"experience":7.8,"pace_label":"Moderate","pace_raw":69.9,"avg_height":76.3,"barthag":0.699,"rr":8.6,"em_rank":"79","kenpom_rank":92},{"id":"hawaii","name":"Hawai'i","seed":13,"region":"West","record":"24-8","is_ff":false,"archetype":"foul_line_bully","is_veteran":false,"is_length":true,"three_pt_prowess":3.7,"free_throw_gen":8.7,"off_efficiency":1.5,"ball_security":1.1,"off_rebounding":4.7,"def_efficiency":6.1,"opp_3pt_allowed":7.9,"rim_protection":4.1,"pressure_defense":4.2,"experience":5.6,"pace_label":"Moderate","pace_raw":69.7,"avg_height":78.7,"barthag":0.635,"rr":3.3,"em_rank":"120","kenpom_rank":108},{"id":"kennesaw_state","name":"Kennesaw State","seed":14,"region":"West","record":"21-13","is_ff":false,"archetype":"foul_line_bully","is_veteran":false,"is_length":false,"three_pt_prowess":5.2,"free_throw_gen":10.0,"off_efficiency":2.7,"ball_security":4.1,"off_rebounding":6.3,"def_efficiency":3.3,"opp_3pt_allowed":4.1,"rim_protection":7.8,"pressure_defense":4.4,"experience":3.2,"pace_label":"Fast","pace_raw":71.2,"avg_height":78.3,"barthag":0.534,"rr":1.0,"em_rank":"150","kenpom_rank":163},{"id":"queens","name":"Queens","seed":15,"region":"West","record":"21-13","is_ff":false,"archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":5.9,"off_efficiency":4.5,"ball_security":6.6,"off_rebounding":4.3,"def_efficiency":1.0,"opp_3pt_allowed":1.8,"rim_protection":2.6,"pressure_defense":3.4,"experience":3.6,"pace_label":"Moderate","pace_raw":69.6,"avg_height":78.3,"barthag":0.44,"rr":-2.1,"em_rank":"194","kenpom_rank":181},{"id":"long_island_university","name":"Long Island University","seed":16,"region":"West","record":"24-10","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.9,"free_throw_gen":5.2,"off_efficiency":1.0,"ball_security":1.0,"off_rebounding":5.8,"def_efficiency":3.4,"opp_3pt_allowed":6.4,"rim_protection":7.2,"pressure_defense":6.4,"experience":2.7,"pace_label":"Moderate","pace_raw":67.8,"avg_height":77.4,"barthag":0.34,"rr":-3.3,"em_rank":"207","kenpom_rank":216},{"id":"michigan","name":"Michigan","seed":1,"region":"Midwest","record":"31-3","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":6.0,"free_throw_gen":6.6,"off_efficiency":8.3,"ball_security":4.1,"off_rebounding":6.2,"def_efficiency":10.0,"opp_3pt_allowed":8.5,"rim_protection":8.7,"pressure_defense":3.2,"experience":7.2,"pace_label":"Fast","pace_raw":70.9,"avg_height":78.7,"barthag":0.98,"rr":34.5,"em_rank":"2","kenpom_rank":3},{"id":"iowa_state","name":"Iowa State","seed":2,"region":"Midwest","record":"27-7","is_ff":false,"archetype":"two_way_machine","is_veteran":true,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":4.9,"off_efficiency":7.3,"ball_security":6.2,"off_rebounding":6.2,"def_efficiency":9.2,"opp_3pt_allowed":6.2,"rim_protection":3.0,"pressure_defense":8.1,"experience":9.3,"pace_label":"Slow","pace_raw":66.5,"avg_height":78.1,"barthag":0.966,"rr":29.5,"em_rank":"7","kenpom_rank":6},{"id":"virginia","name":"Virginia","seed":3,"region":"Midwest","record":"29-5","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":4.4,"off_efficiency":6.9,"ball_security":5.0,"off_rebounding":7.2,"def_efficiency":7.8,"opp_3pt_allowed":7.6,"rim_protection":10.0,"pressure_defense":4.6,"experience":6.8,"pace_label":"Slow","pace_raw":65.7,"avg_height":78.2,"barthag":0.943,"rr":24.1,"em_rank":"13","kenpom_rank":13},{"id":"alabama","name":"Alabama","seed":4,"region":"Midwest","record":"23-9","is_ff":false,"archetype":"offensive_juggernaut","is_veteran":false,"is_length":false,"three_pt_prowess":7.9,"free_throw_gen":6.3,"off_efficiency":9.1,"ball_security":9.1,"off_rebounding":4.8,"def_efficiency":5.4,"opp_3pt_allowed":4.6,"rim_protection":5.1,"pressure_defense":3.8,"experience":6.9,"pace_label":"Fast","pace_raw":73.1,"avg_height":78.2,"barthag":0.934,"rr":23.2,"em_rank":"17","kenpom_rank":18},{"id":"texas_tech","name":"Texas Tech","seed":5,"region":"Midwest","record":"22-10","is_ff":false,"archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":8.5,"free_throw_gen":1.6,"off_efficiency":7.7,"ball_security":5.2,"off_rebounding":5.4,"def_efficiency":6.6,"opp_3pt_allowed":6.9,"rim_protection":3.7,"pressure_defense":3.7,"experience":7.2,"pace_label":"Slow","pace_raw":66.2,"avg_height":77.1,"barthag":0.944,"rr":18.3,"em_rank":"29","kenpom_rank":20},{"id":"tennessee","name":"Tennessee","seed":6,"region":"Midwest","record":"22-11","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":3.2,"free_throw_gen":7.0,"off_efficiency":6.4,"ball_security":3.6,"off_rebounding":10.0,"def_efficiency":8.1,"opp_3pt_allowed":8.0,"rim_protection":5.1,"pressure_defense":6.0,"experience":5.0,"pace_label":"Slow","pace_raw":65.0,"avg_height":78.4,"barthag":0.941,"rr":23.5,"em_rank":"16","kenpom_rank":16},{"id":"kentucky","name":"Kentucky","seed":7,"region":"Midwest","record":"21-13","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":4.7,"free_throw_gen":6.5,"off_efficiency":6.2,"ball_security":6.4,"off_rebounding":5.6,"def_efficiency":6.8,"opp_3pt_allowed":6.8,"rim_protection":5.9,"pressure_defense":5.2,"experience":4.4,"pace_label":"Moderate","pace_raw":68.3,"avg_height":78.8,"barthag":0.89,"rr":20.2,"em_rank":"25","kenpom_rank":28},{"id":"georgia","name":"Georgia","seed":8,"region":"Midwest","record":"22-10","is_ff":false,"archetype":"offensive_engine","is_veteran":false,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":6.2,"off_efficiency":7.6,"ball_security":7.3,"off_rebounding":6.1,"def_efficiency":5.1,"opp_3pt_allowed":4.3,"rim_protection":8.1,"pressure_defense":6.2,"experience":6.2,"pace_label":"Fast","pace_raw":71.4,"avg_height":77.4,"barthag":0.876,"rr":18.2,"em_rank":"30","kenpom_rank":32},{"id":"saint_louis","name":"Saint Louis","seed":9,"region":"Midwest","record":"28-5","is_ff":false,"archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":8.6,"free_throw_gen":5.2,"off_efficiency":5.8,"ball_security":3.1,"off_rebounding":4.5,"def_efficiency":6.1,"opp_3pt_allowed":8.7,"rim_protection":3.7,"pressure_defense":4.9,"experience":8.0,"pace_label":"Fast","pace_raw":71.0,"avg_height":77.5,"barthag":0.873,"rr":17.7,"em_rank":"31","kenpom_rank":41},{"id":"santa_clara","name":"Santa Clara","seed":10,"region":"Midwest","record":"26-8","is_ff":false,"archetype":"offensive_engine","is_veteran":false,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":1.0,"off_efficiency":7.2,"ball_security":5.6,"off_rebounding":6.7,"def_efficiency":5.1,"opp_3pt_allowed":5.1,"rim_protection":4.5,"pressure_defense":7.5,"experience":1.8,"pace_label":"Moderate","pace_raw":69.2,"avg_height":78.5,"barthag":0.895,"rr":16.9,"em_rank":"36","kenpom_rank":35},{"id":"miami_ohio","name":"Miami (Ohio)","seed":11,"region":"Midwest","record":"31-1","is_ff":true,"archetype":"gunslinger","is_veteran":false,"is_length":false,"three_pt_prowess":7.2,"free_throw_gen":7.7,"off_efficiency":4.9,"ball_security":7.0,"off_rebounding":2.3,"def_efficiency":3.8,"opp_3pt_allowed":5.1,"rim_protection":2.6,"pressure_defense":4.8,"experience":6.5,"pace_label":"Moderate","pace_raw":69.9,"avg_height":77.5,"barthag":0.718,"rr":8.1,"em_rank":"84","kenpom_rank":93},{"id":"smu","name":"SMU","seed":11,"region":"Midwest","record":"20-13","is_ff":true,"archetype":"offensive_engine","is_veteran":true,"is_length":false,"three_pt_prowess":5.7,"free_throw_gen":3.3,"off_efficiency":7.0,"ball_security":5.2,"off_rebounding":6.2,"def_efficiency":5.0,"opp_3pt_allowed":4.1,"rim_protection":5.1,"pressure_defense":5.1,"experience":10.0,"pace_label":"Moderate","pace_raw":68.5,"avg_height":78.0,"barthag":0.861,"rr":16.6,"em_rank":"37","kenpom_rank":42},{"id":"akron","name":"Akron","seed":12,"region":"Midwest","record":"29-5","is_ff":false,"archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":7.6,"free_throw_gen":2.6,"off_efficiency":5.6,"ball_security":5.7,"off_rebounding":5.5,"def_efficiency":4.6,"opp_3pt_allowed":2.7,"rim_protection":2.9,"pressure_defense":5.3,"experience":5.2,"pace_label":"Fast","pace_raw":70.3,"avg_height":75.9,"barthag":0.773,"rr":11.2,"em_rank":"62","kenpom_rank":64},{"id":"hofstra","name":"Hofstra","seed":13,"region":"Midwest","record":"24-10","is_ff":false,"archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":6.6,"free_throw_gen":4.2,"off_efficiency":4.1,"ball_security":4.8,"off_rebounding":6.0,"def_efficiency":4.9,"opp_3pt_allowed":6.0,"rim_protection":4.4,"pressure_defense":2.6,"experience":4.6,"pace_label":"Slow","pace_raw":64.7,"avg_height":77.4,"barthag":0.705,"rr":10.0,"em_rank":"74","kenpom_rank":87},{"id":"wright_state","name":"Wright State","seed":14,"region":"Midwest","record":"23-11","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":4.7,"free_throw_gen":6.7,"off_efficiency":3.2,"ball_security":4.6,"off_rebounding":5.4,"def_efficiency":3.3,"opp_3pt_allowed":4.4,"rim_protection":5.2,"pressure_defense":5.3,"experience":3.1,"pace_label":"Moderate","pace_raw":67.2,"avg_height":77.0,"barthag":0.586,"rr":1.3,"em_rank":"148","kenpom_rank":140},{"id":"tennessee_state","name":"Tennessee State","seed":15,"region":"Midwest","record":"23-9","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.1,"free_throw_gen":4.6,"off_efficiency":2.2,"ball_security":4.4,"off_rebounding":6.0,"def_efficiency":3.0,"opp_3pt_allowed":4.6,"rim_protection":4.2,"pressure_defense":7.6,"experience":5.3,"pace_label":"Fast","pace_raw":70.2,"avg_height":77.0,"barthag":0.395,"rr":0.4,"em_rank":"160","kenpom_rank":187},{"id":"howard","name":"Howard","seed":16,"region":"Midwest","record":"23-10","is_ff":true,"archetype":"foul_line_bully","is_veteran":false,"is_length":false,"three_pt_prowess":4.2,"free_throw_gen":9.6,"off_efficiency":1.0,"ball_security":1.0,"off_rebounding":6.7,"def_efficiency":4.5,"opp_3pt_allowed":8.2,"rim_protection":4.6,"pressure_defense":7.3,"experience":3.7,"pace_label":"Moderate","pace_raw":69.0,"avg_height":76.2,"barthag":0.425,"rr":-1.1,"em_rank":"181","kenpom_rank":207},{"id":"umbc","name":"UMBC","seed":16,"region":"Midwest","record":"24-8","is_ff":true,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":4.8,"off_efficiency":1.9,"ball_security":7.6,"off_rebounding":2.2,"def_efficiency":3.3,"opp_3pt_allowed":6.1,"rim_protection":1.4,"pressure_defense":2.5,"experience":3.0,"pace_label":"Slow","pace_raw":66.2,"avg_height":77.2,"barthag":0.456,"rr":-0.1,"em_rank":"165","kenpom_rank":185}],"archetypes":[{"id":"two_way_machine","name":"Two-Way Machine","color":"#1a6b3a","description":"Elite on both ends. No glaring weakness. Blue-blood tournament profile.","weights":{"off_efficiency":2.5,"def_efficiency":2.5,"ball_security":0.5,"rim_protection":0.5},"thresholds":{"off_efficiency":7.0,"def_efficiency":7.0}},{"id":"offensive_juggernaut","name":"Offensive Juggernaut","color":"#c2410c","description":"Historically elite offense scoring from everywhere. Defense is secondary.","weights":{"off_efficiency":4.0,"three_pt_prowess":1.0,"free_throw_gen":1.0,"ball_security":0.5},"thresholds":{"off_efficiency":8.0},"anti_thresholds":{"def_efficiency":7.0}},{"id":"defensive_fortress","name":"Defensive Fortress","color":"#0d3b6e","description":"Suffocating defense with rim protection and arc lockdown. Every game is a grind.","weights":{"def_efficiency":3.0,"rim_protection":1.5,"opp_3pt_allowed":1.0,"pressure_defense":1.0,"off_efficiency":0.5},"thresholds":{"def_efficiency":6.5},"anti_thresholds":{"off_efficiency":7.0}},{"id":"gunslinger","name":"Gunslinger","color":"#7c3aed","description":"High 3-point volume AND gets to the line relentlessly. Forces impossible defensive choices.","weights":{"three_pt_prowess":2.5,"free_throw_gen":2.5,"off_efficiency":1.0,"ball_security":0.5},"thresholds":{"three_pt_prowess":6.0,"free_throw_gen":7.0}},{"id":"sniper_system","name":"Sniper System","color":"#0891b2","description":"Lives and dies by the 3. High volume and efficiency from deep.","weights":{"three_pt_prowess":4.0,"off_efficiency":1.0,"ball_security":0.5},"thresholds":{"three_pt_prowess":6.5},"anti_thresholds":{"free_throw_gen":7.0}},{"id":"offensive_engine","name":"Offensive Engine","color":"#b45309","description":"Efficient offense without a dominant identity. Scores well but defense is a question mark.","weights":{"off_efficiency":3.0,"three_pt_prowess":1.0,"ball_security":1.0,"free_throw_gen":0.5},"thresholds":{"off_efficiency":7.0},"anti_thresholds":{"def_efficiency":7.0}},{"id":"foul_line_bully","name":"Foul-Line Bully","color":"#9f1239","description":"Gets to the line relentlessly. Physical, paint-dominant, aggressive style.","weights":{"free_throw_gen":3.5,"off_rebounding":1.5,"off_efficiency":1.0,"rim_protection":0.5},"thresholds":{"free_throw_gen":7.5},"anti_thresholds":{"def_efficiency":7.0,"three_pt_prowess":6.5}},{"id":"system_operator","name":"System Operator","color":"#475569","description":"Wins through execution \u2014 low turnovers, disciplined half-court, hard to put away.","weights":{"ball_security":2.0,"off_efficiency":1.5,"def_efficiency":1.0,"three_pt_prowess":0.5},"thresholds":{}}]};

// ── Matchup data (bracket structure + team profiles) ──────────────────────────
const MATCHUP_DATA = [{"round":"First Four","region":"Midwest","date":"2026-03-17","time":"18:40","site":"Dayton, OH","is_ff":true,"team1_name":"UMBC","team2_name":"Howard","team1":{"id":"umbc","name":"UMBC","seed":16,"region":"Midwest","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":4.8,"off_efficiency":1.9,"ball_security":7.6,"off_rebounding":2.2,"def_efficiency":3.3,"opp_3pt_allowed":6.1,"rim_protection":1.4,"pressure_defense":2.5,"experience":3.0,"pace_label":"Slow","avg_height":77.2,"barthag":0.456,"rr":-0.1,"em_rank":"165","kenpom_rank":185},"team2":{"id":"howard","name":"Howard","seed":16,"region":"Midwest","archetype":"foul_line_bully","is_veteran":false,"is_length":false,"three_pt_prowess":4.2,"free_throw_gen":9.6,"off_efficiency":1.0,"ball_security":1.0,"off_rebounding":6.7,"def_efficiency":4.5,"opp_3pt_allowed":8.2,"rim_protection":4.6,"pressure_defense":7.3,"experience":3.7,"pace_label":"Moderate","avg_height":76.2,"barthag":0.425,"rr":-1.1,"em_rank":"181","kenpom_rank":207}},{"round":"First Four","region":"West","date":"2026-03-17","time":"21:15","site":"Dayton, OH","is_ff":true,"team1_name":"Texas","team2_name":"NC State","team1":{"id":"texas","name":"Texas","seed":11,"region":"West","archetype":"foul_line_bully","is_veteran":true,"is_length":false,"three_pt_prowess":4.5,"free_throw_gen":10.0,"off_efficiency":7.7,"ball_security":6.0,"off_rebounding":6.3,"def_efficiency":4.6,"opp_3pt_allowed":1.6,"rim_protection":2.1,"pressure_defense":3.3,"experience":10.0,"pace_label":"Slow","avg_height":78.1,"barthag":0.854,"rr":17.1,"em_rank":"34","kenpom_rank":37},"team2":{"id":"nc_state","name":"NC State","seed":11,"region":"West","archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":7.6,"free_throw_gen":5.4,"off_efficiency":7.4,"ball_security":8.9,"off_rebounding":3.5,"def_efficiency":5.1,"opp_3pt_allowed":2.1,"rim_protection":4.6,"pressure_defense":6.5,"experience":7.6,"pace_label":"Moderate","avg_height":77.9,"barthag":0.876,"rr":16.5,"em_rank":"40","kenpom_rank":34}},{"round":"First Four","region":"South","date":"2026-03-18","time":"18:40","site":"Dayton, OH","is_ff":true,"team1_name":"Prairie View A&M","team2_name":"Lehigh","team1":{"id":"prairie_view_am","name":"Prairie View A&M","seed":16,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":null,"free_throw_gen":null,"off_efficiency":null,"ball_security":null,"off_rebounding":null,"def_efficiency":null,"opp_3pt_allowed":null,"rim_protection":null,"pressure_defense":null,"experience":null,"pace_label":"Slow","avg_height":null,"barthag":0.255,"rr":-9.8,"em_rank":"288","kenpom_rank":999},"team2":{"id":"lehigh","name":"Lehigh","seed":16,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":null,"free_throw_gen":null,"off_efficiency":null,"ball_security":null,"off_rebounding":null,"def_efficiency":null,"opp_3pt_allowed":null,"rim_protection":null,"pressure_defense":null,"experience":null,"pace_label":"Slow","avg_height":null,"barthag":0.252,"rr":-8.5,"em_rank":"275","kenpom_rank":999}},{"round":"First Four","region":"Midwest","date":"2026-03-19","time":"21:15","site":"Dayton, OH","is_ff":true,"team1_name":"Miami (Ohio)","team2_name":"SMU","team1":{"id":"miami_ohio","name":"Miami (Ohio)","seed":11,"region":"Midwest","archetype":"gunslinger","is_veteran":false,"is_length":false,"three_pt_prowess":7.2,"free_throw_gen":7.7,"off_efficiency":4.9,"ball_security":7.0,"off_rebounding":2.3,"def_efficiency":3.8,"opp_3pt_allowed":5.1,"rim_protection":2.6,"pressure_defense":4.8,"experience":6.5,"pace_label":"Moderate","avg_height":77.5,"barthag":0.718,"rr":8.1,"em_rank":"84","kenpom_rank":93},"team2":{"id":"smu","name":"SMU","seed":11,"region":"Midwest","archetype":"offensive_engine","is_veteran":true,"is_length":false,"three_pt_prowess":5.7,"free_throw_gen":3.3,"off_efficiency":7.0,"ball_security":5.2,"off_rebounding":6.2,"def_efficiency":5.0,"opp_3pt_allowed":4.1,"rim_protection":5.1,"pressure_defense":5.1,"experience":10.0,"pace_label":"Moderate","avg_height":78.0,"barthag":0.861,"rr":16.6,"em_rank":"37","kenpom_rank":42}},{"round":"First Round","region":"East","date":"2026-03-19","time":"14:50","site":"Greenville, SC","is_ff":false,"team1_name":"Duke","team2_name":"Siena","team1":{"id":"duke","name":"Duke","seed":1,"region":"East","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":6.1,"free_throw_gen":6.6,"off_efficiency":8.8,"ball_security":5.4,"off_rebounding":7.3,"def_efficiency":10.0,"opp_3pt_allowed":8.2,"rim_protection":4.4,"pressure_defense":6.5,"experience":1.6,"pace_label":"Slow","avg_height":79.3,"barthag":0.981,"rr":34.8,"em_rank":"1","kenpom_rank":1},"team2":{"id":"siena","name":"Siena","seed":16,"region":"East","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":1.9,"free_throw_gen":4.9,"off_efficiency":1.5,"ball_security":5.0,"off_rebounding":4.9,"def_efficiency":3.6,"opp_3pt_allowed":5.4,"rim_protection":3.4,"pressure_defense":4.2,"experience":2.9,"pace_label":"Slow","avg_height":76.7,"barthag":0.455,"rr":-0.1,"em_rank":"166","kenpom_rank":192}},{"round":"First Round","region":"East","date":"2026-03-19","time":"12:15","site":"Greenville, SC","is_ff":false,"team1_name":"Ohio State","team2_name":"TCU","team1":{"id":"ohio_state","name":"Ohio State","seed":8,"region":"East","archetype":"offensive_engine","is_veteran":true,"is_length":false,"three_pt_prowess":5.7,"free_throw_gen":6.6,"off_efficiency":7.5,"ball_security":5.7,"off_rebounding":4.4,"def_efficiency":5.8,"opp_3pt_allowed":6.8,"rim_protection":1.6,"pressure_defense":2.4,"experience":7.5,"pace_label":"Slow","avg_height":77.9,"barthag":0.917,"rr":21.2,"em_rank":"22","kenpom_rank":26},"team2":{"id":"tcu","name":"TCU","seed":9,"region":"East","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":3.9,"free_throw_gen":7.0,"off_efficiency":4.4,"ball_security":5.7,"off_rebounding":5.8,"def_efficiency":7.2,"opp_3pt_allowed":4.3,"rim_protection":6.2,"pressure_defense":5.9,"experience":5.7,"pace_label":"Moderate","avg_height":76.4,"barthag":0.837,"rr":16.0,"em_rank":"43","kenpom_rank":43}},{"round":"First Round","region":"East","date":"2026-03-20","time":"19:10","site":"San Diego, CA","is_ff":false,"team1_name":"St. John's","team2_name":"Northern Iowa","team1":{"id":"st_johns","name":"St. John's","seed":5,"region":"East","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":3.4,"free_throw_gen":8.5,"off_efficiency":6.0,"ball_security":6.8,"off_rebounding":6.4,"def_efficiency":8.3,"opp_3pt_allowed":7.2,"rim_protection":6.0,"pressure_defense":6.1,"experience":7.9,"pace_label":"Moderate","avg_height":78.2,"barthag":0.942,"rr":25.5,"em_rank":"11","kenpom_rank":17},"team2":{"id":"northern_iowa","name":"Northern Iowa","seed":12,"region":"East","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":5.2,"free_throw_gen":1.0,"off_efficiency":2.5,"ball_security":6.9,"off_rebounding":1.0,"def_efficiency":7.1,"opp_3pt_allowed":10.0,"rim_protection":4.0,"pressure_defense":4.8,"experience":6.5,"pace_label":"Slow","avg_height":77.6,"barthag":0.774,"rr":10.6,"em_rank":"67","kenpom_rank":72}},{"round":"First Round","region":"East","date":"2026-03-20","time":"21:45","site":"San Diego, CA","is_ff":false,"team1_name":"Kansas","team2_name":"Cal Baptist","team1":{"id":"kansas","name":"Kansas","seed":4,"region":"East","archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":4.5,"free_throw_gen":4.2,"off_efficiency":5.4,"ball_security":5.7,"off_rebounding":3.9,"def_efficiency":8.4,"opp_3pt_allowed":7.9,"rim_protection":8.5,"pressure_defense":3.2,"experience":5.6,"pace_label":"Moderate","avg_height":78.7,"barthag":0.928,"rr":21.9,"em_rank":"19","kenpom_rank":21},"team2":{"id":"cal_baptist","name":"Cal Baptist","seed":13,"region":"East","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.3,"free_throw_gen":5.8,"off_efficiency":1.8,"ball_security":2.2,"off_rebounding":7.2,"def_efficiency":5.9,"opp_3pt_allowed":9.1,"rim_protection":2.2,"pressure_defense":3.2,"experience":4.0,"pace_label":"Slow","avg_height":76.5,"barthag":0.689,"rr":3.7,"em_rank":"118","kenpom_rank":106}},{"round":"First Round","region":"East","date":"2026-03-19","time":"13:30","site":"Buffalo, NY","is_ff":false,"team1_name":"Louisville","team2_name":"South Florida","team1":{"id":"louisville","name":"Louisville","seed":6,"region":"East","archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":7.7,"free_throw_gen":4.6,"off_efficiency":7.4,"ball_security":4.5,"off_rebounding":5.2,"def_efficiency":6.9,"opp_3pt_allowed":5.5,"rim_protection":3.5,"pressure_defense":4.8,"experience":8.9,"pace_label":"Moderate","avg_height":78.4,"barthag":0.936,"rr":21.8,"em_rank":"20","kenpom_rank":19},"team2":{"id":"south_florida","name":"South Florida","seed":11,"region":"East","archetype":"foul_line_bully","is_veteran":false,"is_length":false,"three_pt_prowess":5.0,"free_throw_gen":8.1,"off_efficiency":5.1,"ball_security":6.1,"off_rebounding":7.3,"def_efficiency":6.2,"opp_3pt_allowed":4.1,"rim_protection":4.8,"pressure_defense":6.8,"experience":4.7,"pace_label":"Fast","avg_height":77.1,"barthag":0.836,"rr":15.8,"em_rank":"44","kenpom_rank":47}},{"round":"First Round","region":"East","date":"2026-03-19","time":"16:05","site":"Buffalo, NY","is_ff":false,"team1_name":"Michigan State","team2_name":"North Dakota State","team1":{"id":"michigan_state","name":"Michigan State","seed":3,"region":"East","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":5.1,"free_throw_gen":5.9,"off_efficiency":7.0,"ball_security":3.6,"off_rebounding":7.4,"def_efficiency":8.2,"opp_3pt_allowed":5.3,"rim_protection":6.7,"pressure_defense":2.9,"experience":4.0,"pace_label":"Slow","avg_height":78.7,"barthag":0.944,"rr":24.6,"em_rank":"12","kenpom_rank":9},"team2":{"id":"north_dakota_state","name":"North Dakota State","seed":14,"region":"East","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":3.3,"off_efficiency":3.1,"ball_security":5.6,"off_rebounding":5.5,"def_efficiency":4.4,"opp_3pt_allowed":4.6,"rim_protection":3.3,"pressure_defense":6.2,"experience":3.7,"pace_label":"Slow","avg_height":76.2,"barthag":0.904,"rr":14.7,"em_rank":"48","kenpom_rank":113}},{"round":"First Round","region":"East","date":"2026-03-20","time":"19:25","site":"Philadelphia, PA","is_ff":false,"team1_name":"UCLA","team2_name":"UCF","team1":{"id":"ucla","name":"UCLA","seed":7,"region":"East","archetype":"offensive_engine","is_veteran":true,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":4.4,"off_efficiency":7.3,"ball_security":8.5,"off_rebounding":4.5,"def_efficiency":5.8,"opp_3pt_allowed":6.6,"rim_protection":3.7,"pressure_defense":5.0,"experience":9.1,"pace_label":"Slow","avg_height":78.0,"barthag":0.911,"rr":20.3,"em_rank":"24","kenpom_rank":27},"team2":{"id":"ucf","name":"UCF","seed":10,"region":"East","archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":4.8,"free_throw_gen":3.4,"off_efficiency":6.2,"ball_security":5.4,"off_rebounding":5.8,"def_efficiency":4.8,"opp_3pt_allowed":4.0,"rim_protection":2.8,"pressure_defense":3.1,"experience":8.3,"pace_label":"Moderate","avg_height":78.6,"barthag":0.812,"rr":11.3,"em_rank":"61","kenpom_rank":54}},{"round":"First Round","region":"East","date":"2026-03-20","time":"22:00","site":"Philadelphia, PA","is_ff":false,"team1_name":"UConn","team2_name":"Furman","team1":{"id":"uconn","name":"UConn","seed":2,"region":"East","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":5.4,"free_throw_gen":3.0,"off_efficiency":6.7,"ball_security":4.0,"off_rebounding":6.3,"def_efficiency":8.4,"opp_3pt_allowed":8.3,"rim_protection":8.2,"pressure_defense":5.4,"experience":8.6,"pace_label":"Slow","avg_height":78.6,"barthag":0.965,"rr":30.5,"em_rank":"8","kenpom_rank":11},"team2":{"id":"furman","name":"Furman","seed":15,"region":"East","archetype":"system_operator","is_veteran":false,"is_length":true,"three_pt_prowess":5.5,"free_throw_gen":4.0,"off_efficiency":1.7,"ball_security":2.6,"off_rebounding":4.5,"def_efficiency":3.5,"opp_3pt_allowed":5.6,"rim_protection":3.7,"pressure_defense":1.9,"experience":3.0,"pace_label":"Slow","avg_height":79.2,"barthag":0.444,"rr":0.9,"em_rank":"153","kenpom_rank":191}},{"round":"First Round","region":"South","date":"2026-03-20","time":"21:25","site":"Tampa, FL","is_ff":false,"team1_name":"Florida","team2_name":"Prairie View A&M","team1":{"id":"florida","name":"Florida","seed":1,"region":"South","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":2.9,"free_throw_gen":7.2,"off_efficiency":7.9,"ball_security":4.4,"off_rebounding":9.2,"def_efficiency":9.1,"opp_3pt_allowed":5.9,"rim_protection":6.0,"pressure_defense":4.3,"experience":6.5,"pace_label":"Fast","avg_height":78.9,"barthag":0.973,"rr":31.4,"em_rank":"4","kenpom_rank":4},"team2":{"id":"prairie_view_am","name":"Prairie View A&M","seed":16,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":null,"free_throw_gen":null,"off_efficiency":null,"ball_security":null,"off_rebounding":null,"def_efficiency":null,"opp_3pt_allowed":null,"rim_protection":null,"pressure_defense":null,"experience":null,"pace_label":"Slow","avg_height":null,"barthag":0.255,"rr":-9.8,"em_rank":"288","kenpom_rank":999}},{"round":"First Round","region":"South","date":"2026-03-20","time":"18:50","site":"Tampa, FL","is_ff":false,"team1_name":"Clemson","team2_name":"Iowa","team1":{"id":"clemson","name":"Clemson","seed":8,"region":"South","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":5.3,"free_throw_gen":6.3,"off_efficiency":4.8,"ball_security":7.4,"off_rebounding":3.4,"def_efficiency":7.4,"opp_3pt_allowed":5.6,"rim_protection":3.4,"pressure_defense":4.6,"experience":8.3,"pace_label":"Slow","avg_height":77.8,"barthag":0.892,"rr":16.6,"em_rank":"38","kenpom_rank":36},"team2":{"id":"iowa","name":"Iowa","seed":9,"region":"South","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":5.8,"free_throw_gen":5.1,"off_efficiency":6.6,"ball_security":6.1,"off_rebounding":4.2,"def_efficiency":6.7,"opp_3pt_allowed":4.4,"rim_protection":1.5,"pressure_defense":6.2,"experience":4.2,"pace_label":"Slow","avg_height":78.5,"barthag":0.907,"rr":20.1,"em_rank":"26","kenpom_rank":25}},{"round":"First Round","region":"South","date":"2026-03-19","time":"15:15","site":"Oklahoma City, OK","is_ff":false,"team1_name":"Vanderbilt","team2_name":"McNeese","team1":{"id":"vanderbilt","name":"Vanderbilt","seed":5,"region":"South","archetype":"offensive_juggernaut","is_veteran":true,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":6.8,"off_efficiency":8.3,"ball_security":8.7,"off_rebounding":4.6,"def_efficiency":6.7,"opp_3pt_allowed":6.1,"rim_protection":6.2,"pressure_defense":6.4,"experience":8.8,"pace_label":"Moderate","avg_height":77.2,"barthag":0.946,"rr":24.0,"em_rank":"14","kenpom_rank":12},"team2":{"id":"mcneese","name":"McNeese","seed":12,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.0,"free_throw_gen":6.8,"off_efficiency":4.0,"ball_security":7.3,"off_rebounding":6.1,"def_efficiency":5.9,"opp_3pt_allowed":5.7,"rim_protection":8.7,"pressure_defense":10.0,"experience":6.2,"pace_label":"Slow","avg_height":77.1,"barthag":0.765,"rr":10.7,"em_rank":"65","kenpom_rank":68}},{"round":"First Round","region":"South","date":"2026-03-19","time":"12:40","site":"Oklahoma City, OK","is_ff":false,"team1_name":"Nebraska","team2_name":"Troy","team1":{"id":"nebraska","name":"Nebraska","seed":4,"region":"South","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":7.2,"free_throw_gen":1.7,"off_efficiency":5.5,"ball_security":7.2,"off_rebounding":2.7,"def_efficiency":8.9,"opp_3pt_allowed":8.8,"rim_protection":3.1,"pressure_defense":5.7,"experience":8.4,"pace_label":"Slow","avg_height":77.8,"barthag":0.931,"rr":22.3,"em_rank":"18","kenpom_rank":14},"team2":{"id":"troy","name":"Troy","seed":13,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.4,"free_throw_gen":5.9,"off_efficiency":2.8,"ball_security":3.7,"off_rebounding":6.0,"def_efficiency":3.6,"opp_3pt_allowed":7.2,"rim_protection":3.4,"pressure_defense":5.5,"experience":3.5,"pace_label":"Slow","avg_height":77.4,"barthag":0.543,"rr":4.5,"em_rank":"109","kenpom_rank":143}},{"round":"First Round","region":"South","date":"2026-03-19","time":"18:50","site":"Greenville, SC","is_ff":false,"team1_name":"North Carolina","team2_name":"VCU","team1":{"id":"north_carolina","name":"North Carolina","seed":6,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":true,"three_pt_prowess":5.5,"free_throw_gen":6.4,"off_efficiency":6.5,"ball_security":7.7,"off_rebounding":4.7,"def_efficiency":6.3,"opp_3pt_allowed":3.4,"rim_protection":3.0,"pressure_defense":3.0,"experience":3.5,"pace_label":"Moderate","avg_height":79.2,"barthag":0.904,"rr":14.7,"em_rank":"48","kenpom_rank":29},"team2":{"id":"vcu","name":"VCU","seed":11,"region":"South","archetype":"gunslinger","is_veteran":false,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":9.4,"off_efficiency":6.0,"ball_security":6.1,"off_rebounding":5.0,"def_efficiency":5.6,"opp_3pt_allowed":5.0,"rim_protection":5.1,"pressure_defense":5.6,"experience":5.0,"pace_label":"Moderate","avg_height":77.8,"barthag":0.843,"rr":16.1,"em_rank":"42","kenpom_rank":45}},{"round":"First Round","region":"South","date":"2026-03-19","time":"21:25","site":"Greenville, SC","is_ff":false,"team1_name":"Illinois","team2_name":"Penn","team1":{"id":"illinois","name":"Illinois","seed":3,"region":"South","archetype":"offensive_juggernaut","is_veteran":false,"is_length":true,"three_pt_prowess":6.9,"free_throw_gen":4.3,"off_efficiency":9.9,"ball_security":8.8,"off_rebounding":7.5,"def_efficiency":6.8,"opp_3pt_allowed":7.0,"rim_protection":6.2,"pressure_defense":1.0,"experience":5.0,"pace_label":"Slow","avg_height":80.0,"barthag":0.968,"rr":28.9,"em_rank":"9","kenpom_rank":7},"team2":{"id":"penn","name":"Penn","seed":14,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.1,"free_throw_gen":5.4,"off_efficiency":1.6,"ball_security":5.8,"off_rebounding":4.2,"def_efficiency":4.6,"opp_3pt_allowed":6.7,"rim_protection":3.0,"pressure_defense":4.6,"experience":3.2,"pace_label":"Moderate","avg_height":77.8,"barthag":0.532,"rr":0.9,"em_rank":"152","kenpom_rank":150}},{"round":"First Round","region":"South","date":"2026-03-19","time":"19:35","site":"Oklahoma City, OK","is_ff":false,"team1_name":"Saint Mary's","team2_name":"Texas A&M","team1":{"id":"saint_marys","name":"Saint Mary's","seed":7,"region":"South","archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":6.2,"free_throw_gen":5.7,"off_efficiency":6.1,"ball_security":4.4,"off_rebounding":7.0,"def_efficiency":7.4,"opp_3pt_allowed":7.2,"rim_protection":3.9,"pressure_defense":3.5,"experience":1.0,"pace_label":"Slow","avg_height":78.9,"barthag":0.911,"rr":20.4,"em_rank":"23","kenpom_rank":24},"team2":{"id":"texas_am","name":"Texas A&M","seed":10,"region":"South","archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":6.4,"off_efficiency":5.9,"ball_security":6.9,"off_rebounding":5.0,"def_efficiency":6.2,"opp_3pt_allowed":6.7,"rim_protection":3.3,"pressure_defense":5.9,"experience":9.5,"pace_label":"Fast","avg_height":77.2,"barthag":0.872,"rr":16.4,"em_rank":"41","kenpom_rank":39}},{"round":"First Round","region":"South","date":"2026-03-19","time":"22:10","site":"Oklahoma City, OK","is_ff":false,"team1_name":"Houston","team2_name":"Idaho","team1":{"id":"houston","name":"Houston","seed":2,"region":"South","archetype":"two_way_machine","is_veteran":false,"is_length":false,"three_pt_prowess":5.3,"free_throw_gen":1.6,"off_efficiency":7.7,"ball_security":9.1,"off_rebounding":6.4,"def_efficiency":9.2,"opp_3pt_allowed":6.2,"rim_protection":6.0,"pressure_defense":6.8,"experience":5.9,"pace_label":"Slow","avg_height":77.8,"barthag":0.97,"rr":31.0,"em_rank":"5","kenpom_rank":5},"team2":{"id":"idaho","name":"Idaho","seed":15,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.2,"free_throw_gen":5.2,"off_efficiency":2.1,"ball_security":6.4,"off_rebounding":3.7,"def_efficiency":4.2,"opp_3pt_allowed":3.0,"rim_protection":1.2,"pressure_defense":3.3,"experience":4.8,"pace_label":"Moderate","avg_height":77.2,"barthag":0.57,"rr":0.1,"em_rank":"163","kenpom_rank":145}},{"round":"First Round","region":"West","date":"2026-03-20","time":"13:35","site":"San Diego, CA","is_ff":false,"team1_name":"Arizona","team2_name":"Long Island University","team1":{"id":"arizona","name":"Arizona","seed":1,"region":"West","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":3.5,"free_throw_gen":9.0,"off_efficiency":8.7,"ball_security":6.1,"off_rebounding":7.3,"def_efficiency":9.7,"opp_3pt_allowed":7.0,"rim_protection":4.8,"pressure_defense":5.9,"experience":4.8,"pace_label":"Moderate","avg_height":79.0,"barthag":0.978,"rr":32.0,"em_rank":"3","kenpom_rank":2},"team2":{"id":"long_island_university","name":"Long Island University","seed":16,"region":"West","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.9,"free_throw_gen":5.2,"off_efficiency":1.0,"ball_security":1.0,"off_rebounding":5.8,"def_efficiency":3.4,"opp_3pt_allowed":6.4,"rim_protection":7.2,"pressure_defense":6.4,"experience":2.7,"pace_label":"Moderate","avg_height":77.4,"barthag":0.34,"rr":-3.3,"em_rank":"207","kenpom_rank":216}},{"round":"First Round","region":"West","date":"2026-03-20","time":"16:10","site":"San Diego, CA","is_ff":false,"team1_name":"Villanova","team2_name":"Utah State","team1":{"id":"villanova","name":"Villanova","seed":8,"region":"West","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.3,"free_throw_gen":3.6,"off_efficiency":6.1,"ball_security":6.2,"off_rebounding":5.1,"def_efficiency":6.4,"opp_3pt_allowed":4.1,"rim_protection":1.0,"pressure_defense":6.1,"experience":6.1,"pace_label":"Slow","avg_height":77.6,"barthag":0.88,"rr":15.0,"em_rank":"47","kenpom_rank":33},"team2":{"id":"utah_state","name":"Utah State","seed":9,"region":"West","archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":7.0,"off_efficiency":6.7,"ball_security":5.8,"off_rebounding":5.3,"def_efficiency":6.0,"opp_3pt_allowed":4.1,"rim_protection":3.2,"pressure_defense":7.5,"experience":8.7,"pace_label":"Moderate","avg_height":77.7,"barthag":0.895,"rr":17.6,"em_rank":"32","kenpom_rank":30}},{"round":"First Round","region":"West","date":"2026-03-19","time":"13:50","site":"Portland, OR","is_ff":false,"team1_name":"Wisconsin","team2_name":"High Point","team1":{"id":"wisconsin","name":"Wisconsin","seed":5,"region":"West","archetype":"sniper_system","is_veteran":true,"is_length":true,"three_pt_prowess":7.8,"free_throw_gen":3.9,"off_efficiency":7.8,"ball_security":9.3,"off_rebounding":3.9,"def_efficiency":5.9,"opp_3pt_allowed":4.8,"rim_protection":3.0,"pressure_defense":3.3,"experience":8.3,"pace_label":"Moderate","avg_height":78.8,"barthag":0.929,"rr":21.7,"em_rank":"21","kenpom_rank":22},"team2":{"id":"high_point","name":"High Point","seed":12,"region":"West","archetype":"foul_line_bully","is_veteran":true,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":9.0,"off_efficiency":4.9,"ball_security":9.1,"off_rebounding":4.9,"def_efficiency":3.7,"opp_3pt_allowed":6.4,"rim_protection":4.9,"pressure_defense":9.3,"experience":7.8,"pace_label":"Moderate","avg_height":76.3,"barthag":0.699,"rr":8.6,"em_rank":"79","kenpom_rank":92}},{"round":"First Round","region":"West","date":"2026-03-19","time":"16:25","site":"Portland, OR","is_ff":false,"team1_name":"Arkansas","team2_name":"Hawai'i","team1":{"id":"arkansas","name":"Arkansas","seed":4,"region":"West","archetype":"offensive_juggernaut","is_veteran":false,"is_length":false,"three_pt_prowess":5.9,"free_throw_gen":6.0,"off_efficiency":8.7,"ball_security":10.0,"off_rebounding":5.0,"def_efficiency":6.0,"opp_3pt_allowed":6.7,"rim_protection":6.4,"pressure_defense":5.0,"experience":4.9,"pace_label":"Fast","avg_height":78.5,"barthag":0.936,"rr":23.8,"em_rank":"15","kenpom_rank":15},"team2":{"id":"hawaii","name":"Hawai'i","seed":13,"region":"West","archetype":"foul_line_bully","is_veteran":false,"is_length":true,"three_pt_prowess":3.7,"free_throw_gen":8.7,"off_efficiency":1.5,"ball_security":1.1,"off_rebounding":4.7,"def_efficiency":6.1,"opp_3pt_allowed":7.9,"rim_protection":4.1,"pressure_defense":4.2,"experience":5.6,"pace_label":"Moderate","avg_height":78.7,"barthag":0.635,"rr":3.3,"em_rank":"120","kenpom_rank":108}},{"round":"First Round","region":"West","date":"2026-03-19","time":"19:25","site":"Portland, OR","is_ff":false,"team1_name":"BYU","team2_name":"Texas","team1":{"id":"byu","name":"BYU","seed":6,"region":"West","archetype":"offensive_engine","is_veteran":false,"is_length":false,"three_pt_prowess":5.2,"free_throw_gen":4.9,"off_efficiency":7.9,"ball_security":6.0,"off_rebounding":5.9,"def_efficiency":5.8,"opp_3pt_allowed":2.4,"rim_protection":5.6,"pressure_defense":5.3,"experience":5.0,"pace_label":"Moderate","avg_height":78.3,"barthag":0.889,"rr":16.5,"em_rank":"39","kenpom_rank":23},"team2":{"id":"texas","name":"Texas","seed":11,"region":"West","archetype":"foul_line_bully","is_veteran":true,"is_length":false,"three_pt_prowess":4.5,"free_throw_gen":10.0,"off_efficiency":7.7,"ball_security":6.0,"off_rebounding":6.3,"def_efficiency":4.6,"opp_3pt_allowed":1.6,"rim_protection":2.1,"pressure_defense":3.3,"experience":10.0,"pace_label":"Slow","avg_height":78.1,"barthag":0.854,"rr":17.1,"em_rank":"34","kenpom_rank":37}},{"round":"First Round","region":"West","date":"2026-03-19","time":"22:00","site":"Portland, OR","is_ff":false,"team1_name":"Gonzaga","team2_name":"Kennesaw State","team1":{"id":"gonzaga","name":"Gonzaga","seed":3,"region":"West","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":3.3,"free_throw_gen":3.5,"off_efficiency":6.7,"ball_security":8.1,"off_rebounding":6.0,"def_efficiency":8.4,"opp_3pt_allowed":7.7,"rim_protection":5.2,"pressure_defense":6.9,"experience":10.0,"pace_label":"Moderate","avg_height":78.0,"barthag":0.95,"rr":27.7,"em_rank":"10","kenpom_rank":10},"team2":{"id":"kennesaw_state","name":"Kennesaw State","seed":14,"region":"West","archetype":"foul_line_bully","is_veteran":false,"is_length":false,"three_pt_prowess":5.2,"free_throw_gen":10.0,"off_efficiency":2.7,"ball_security":4.1,"off_rebounding":6.3,"def_efficiency":3.3,"opp_3pt_allowed":4.1,"rim_protection":7.8,"pressure_defense":4.4,"experience":3.2,"pace_label":"Fast","avg_height":78.3,"barthag":0.534,"rr":1.0,"em_rank":"150","kenpom_rank":163}},{"round":"First Round","region":"West","date":"2026-03-20","time":"22:10","site":"St. Louis, MO","is_ff":false,"team1_name":"Miami (FL)","team2_name":"Missouri","team1":{"id":"miami_fl","name":"Miami (FL)","seed":7,"region":"West","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.7,"free_throw_gen":6.5,"off_efficiency":6.5,"ball_security":4.8,"off_rebounding":6.8,"def_efficiency":6.3,"opp_3pt_allowed":2.3,"rim_protection":4.1,"pressure_defense":6.4,"experience":5.6,"pace_label":"Moderate","avg_height":78.4,"barthag":0.887,"rr":18.6,"em_rank":"28","kenpom_rank":31},"team2":{"id":"missouri","name":"Missouri","seed":10,"region":"West","archetype":"foul_line_bully","is_veteran":true,"is_length":true,"three_pt_prowess":4.6,"free_throw_gen":8.8,"off_efficiency":5.8,"ball_security":2.3,"off_rebounding":6.3,"def_efficiency":5.2,"opp_3pt_allowed":1.0,"rim_protection":4.4,"pressure_defense":4.8,"experience":7.6,"pace_label":"Slow","avg_height":79.3,"barthag":0.851,"rr":14.4,"em_rank":"49","kenpom_rank":52}},{"round":"First Round","region":"West","date":"2026-03-20","time":"19:35","site":"St. Louis, MO","is_ff":false,"team1_name":"Purdue","team2_name":"Queens","team1":{"id":"purdue","name":"Purdue","seed":2,"region":"West","archetype":"offensive_juggernaut","is_veteran":true,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":2.3,"off_efficiency":10.0,"ball_security":8.4,"off_rebounding":6.6,"def_efficiency":6.4,"opp_3pt_allowed":3.7,"rim_protection":3.3,"pressure_defense":3.7,"experience":9.0,"pace_label":"Slow","avg_height":77.8,"barthag":0.964,"rr":30.3,"em_rank":"6","kenpom_rank":8},"team2":{"id":"queens","name":"Queens","seed":15,"region":"West","archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":5.9,"off_efficiency":4.5,"ball_security":6.6,"off_rebounding":4.3,"def_efficiency":1.0,"opp_3pt_allowed":1.8,"rim_protection":2.6,"pressure_defense":3.4,"experience":3.6,"pace_label":"Moderate","avg_height":78.3,"barthag":0.44,"rr":-2.1,"em_rank":"194","kenpom_rank":181}},{"round":"First Round","region":"Midwest","date":"2026-03-19","time":"19:10","site":"Buffalo, NY","is_ff":false,"team1_name":"Michigan","team2_name":"Howard","team1":{"id":"michigan","name":"Michigan","seed":1,"region":"Midwest","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":6.0,"free_throw_gen":6.6,"off_efficiency":8.3,"ball_security":4.1,"off_rebounding":6.2,"def_efficiency":10.0,"opp_3pt_allowed":8.5,"rim_protection":8.7,"pressure_defense":3.2,"experience":7.2,"pace_label":"Fast","avg_height":78.7,"barthag":0.98,"rr":34.5,"em_rank":"2","kenpom_rank":3},"team2":{"id":"howard","name":"Howard","seed":16,"region":"Midwest","archetype":"foul_line_bully","is_veteran":false,"is_length":false,"three_pt_prowess":4.2,"free_throw_gen":9.6,"off_efficiency":1.0,"ball_security":1.0,"off_rebounding":6.7,"def_efficiency":4.5,"opp_3pt_allowed":8.2,"rim_protection":4.6,"pressure_defense":7.3,"experience":3.7,"pace_label":"Moderate","avg_height":76.2,"barthag":0.425,"rr":-1.1,"em_rank":"181","kenpom_rank":207}},{"round":"First Round","region":"Midwest","date":"2026-03-19","time":"21:45","site":"Buffalo, NY","is_ff":false,"team1_name":"Georgia","team2_name":"Saint Louis","team1":{"id":"georgia","name":"Georgia","seed":8,"region":"Midwest","archetype":"offensive_engine","is_veteran":false,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":6.2,"off_efficiency":7.6,"ball_security":7.3,"off_rebounding":6.1,"def_efficiency":5.1,"opp_3pt_allowed":4.3,"rim_protection":8.1,"pressure_defense":6.2,"experience":6.2,"pace_label":"Fast","avg_height":77.4,"barthag":0.876,"rr":18.2,"em_rank":"30","kenpom_rank":32},"team2":{"id":"saint_louis","name":"Saint Louis","seed":9,"region":"Midwest","archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":8.6,"free_throw_gen":5.2,"off_efficiency":5.8,"ball_security":3.1,"off_rebounding":4.5,"def_efficiency":6.1,"opp_3pt_allowed":8.7,"rim_protection":3.7,"pressure_defense":4.9,"experience":8.0,"pace_label":"Fast","avg_height":77.5,"barthag":0.873,"rr":17.7,"em_rank":"31","kenpom_rank":41}},{"round":"First Round","region":"Midwest","date":"2026-03-20","time":"12:40","site":"Tampa, FL","is_ff":false,"team1_name":"Texas Tech","team2_name":"Akron","team1":{"id":"texas_tech","name":"Texas Tech","seed":5,"region":"Midwest","archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":8.5,"free_throw_gen":1.6,"off_efficiency":7.7,"ball_security":5.2,"off_rebounding":5.4,"def_efficiency":6.6,"opp_3pt_allowed":6.9,"rim_protection":3.7,"pressure_defense":3.7,"experience":7.2,"pace_label":"Slow","avg_height":77.1,"barthag":0.944,"rr":18.3,"em_rank":"29","kenpom_rank":20},"team2":{"id":"akron","name":"Akron","seed":12,"region":"Midwest","archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":7.6,"free_throw_gen":2.6,"off_efficiency":5.6,"ball_security":5.7,"off_rebounding":5.5,"def_efficiency":4.6,"opp_3pt_allowed":2.7,"rim_protection":2.9,"pressure_defense":5.3,"experience":5.2,"pace_label":"Fast","avg_height":75.9,"barthag":0.773,"rr":11.2,"em_rank":"62","kenpom_rank":64}},{"round":"First Round","region":"Midwest","date":"2026-03-20","time":"15:15","site":"Tampa, FL","is_ff":false,"team1_name":"Alabama","team2_name":"Hofstra","team1":{"id":"alabama","name":"Alabama","seed":4,"region":"Midwest","archetype":"offensive_juggernaut","is_veteran":false,"is_length":false,"three_pt_prowess":7.9,"free_throw_gen":6.3,"off_efficiency":9.1,"ball_security":9.1,"off_rebounding":4.8,"def_efficiency":5.4,"opp_3pt_allowed":4.6,"rim_protection":5.1,"pressure_defense":3.8,"experience":6.9,"pace_label":"Fast","avg_height":78.2,"barthag":0.934,"rr":23.2,"em_rank":"17","kenpom_rank":18},"team2":{"id":"hofstra","name":"Hofstra","seed":13,"region":"Midwest","archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":6.6,"free_throw_gen":4.2,"off_efficiency":4.1,"ball_security":4.8,"off_rebounding":6.0,"def_efficiency":4.9,"opp_3pt_allowed":6.0,"rim_protection":4.4,"pressure_defense":2.6,"experience":4.6,"pace_label":"Slow","avg_height":77.4,"barthag":0.705,"rr":10.0,"em_rank":"74","kenpom_rank":87}},{"round":"First Round","region":"Midwest","date":"2026-03-20","time":"16:25","site":"Philadelphia, PA","is_ff":false,"team1_name":"Tennessee","team2_name":"Miami (Ohio)","team1":{"id":"tennessee","name":"Tennessee","seed":6,"region":"Midwest","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":3.2,"free_throw_gen":7.0,"off_efficiency":6.4,"ball_security":3.6,"off_rebounding":10.0,"def_efficiency":8.1,"opp_3pt_allowed":8.0,"rim_protection":5.1,"pressure_defense":6.0,"experience":5.0,"pace_label":"Slow","avg_height":78.4,"barthag":0.941,"rr":23.5,"em_rank":"16","kenpom_rank":16},"team2":{"id":"miami_ohio","name":"Miami (Ohio)","seed":11,"region":"Midwest","archetype":"gunslinger","is_veteran":false,"is_length":false,"three_pt_prowess":7.2,"free_throw_gen":7.7,"off_efficiency":4.9,"ball_security":7.0,"off_rebounding":2.3,"def_efficiency":3.8,"opp_3pt_allowed":5.1,"rim_protection":2.6,"pressure_defense":4.8,"experience":6.5,"pace_label":"Moderate","avg_height":77.5,"barthag":0.718,"rr":8.1,"em_rank":"84","kenpom_rank":93}},{"round":"First Round","region":"Midwest","date":"2026-03-20","time":"13:50","site":"Philadelphia, PA","is_ff":false,"team1_name":"Virginia","team2_name":"Wright State","team1":{"id":"virginia","name":"Virginia","seed":3,"region":"Midwest","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":4.4,"off_efficiency":6.9,"ball_security":5.0,"off_rebounding":7.2,"def_efficiency":7.8,"opp_3pt_allowed":7.6,"rim_protection":10.0,"pressure_defense":4.6,"experience":6.8,"pace_label":"Slow","avg_height":78.2,"barthag":0.943,"rr":24.1,"em_rank":"13","kenpom_rank":13},"team2":{"id":"wright_state","name":"Wright State","seed":14,"region":"Midwest","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":4.7,"free_throw_gen":6.7,"off_efficiency":3.2,"ball_security":4.6,"off_rebounding":5.4,"def_efficiency":3.3,"opp_3pt_allowed":4.4,"rim_protection":5.2,"pressure_defense":5.3,"experience":3.1,"pace_label":"Moderate","avg_height":77.0,"barthag":0.586,"rr":1.3,"em_rank":"148","kenpom_rank":140}},{"round":"First Round","region":"Midwest","date":"2026-03-20","time":"12:15","site":"St. Louis, MO","is_ff":false,"team1_name":"Kentucky","team2_name":"Santa Clara","team1":{"id":"kentucky","name":"Kentucky","seed":7,"region":"Midwest","archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":4.7,"free_throw_gen":6.5,"off_efficiency":6.2,"ball_security":6.4,"off_rebounding":5.6,"def_efficiency":6.8,"opp_3pt_allowed":6.8,"rim_protection":5.9,"pressure_defense":5.2,"experience":4.4,"pace_label":"Moderate","avg_height":78.8,"barthag":0.89,"rr":20.2,"em_rank":"25","kenpom_rank":28},"team2":{"id":"santa_clara","name":"Santa Clara","seed":10,"region":"Midwest","archetype":"offensive_engine","is_veteran":false,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":1.0,"off_efficiency":7.2,"ball_security":5.6,"off_rebounding":6.7,"def_efficiency":5.1,"opp_3pt_allowed":5.1,"rim_protection":4.5,"pressure_defense":7.5,"experience":1.8,"pace_label":"Moderate","avg_height":78.5,"barthag":0.895,"rr":16.9,"em_rank":"36","kenpom_rank":35}},{"round":"First Round","region":"Midwest","date":"2026-03-20","time":"14:50","site":"St. Louis, MO","is_ff":false,"team1_name":"Iowa State","team2_name":"Tennessee State","team1":{"id":"iowa_state","name":"Iowa State","seed":2,"region":"Midwest","archetype":"two_way_machine","is_veteran":true,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":4.9,"off_efficiency":7.3,"ball_security":6.2,"off_rebounding":6.2,"def_efficiency":9.2,"opp_3pt_allowed":6.2,"rim_protection":3.0,"pressure_defense":8.1,"experience":9.3,"pace_label":"Slow","avg_height":78.1,"barthag":0.966,"rr":29.5,"em_rank":"7","kenpom_rank":6},"team2":{"id":"tennessee_state","name":"Tennessee State","seed":15,"region":"Midwest","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.1,"free_throw_gen":4.6,"off_efficiency":2.2,"ball_security":4.4,"off_rebounding":6.0,"def_efficiency":3.0,"opp_3pt_allowed":4.6,"rim_protection":4.2,"pressure_defense":7.6,"experience":5.3,"pace_label":"Fast","avg_height":77.0,"barthag":0.395,"rr":0.4,"em_rank":"160","kenpom_rank":187}},{"round":"Round of 32","region":"Midwest","date":"2026-03-21","time":"12:10","site":"Oklahoma City, OK","is_ff":false,"team1_name":"Michigan","team2_name":"Saint Louis","team1":{"id":"michigan","name":"Michigan","seed":1,"region":"Midwest","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":6.0,"free_throw_gen":6.6,"off_efficiency":8.3,"ball_security":4.1,"off_rebounding":6.2,"def_efficiency":10.0,"opp_3pt_allowed":8.5,"rim_protection":8.7,"pressure_defense":3.2,"experience":7.2,"pace_label":"Fast","avg_height":78.7,"barthag":0.98,"rr":34.5,"em_rank":"2","kenpom_rank":3},"team2":{"id":"saint_louis","name":"Saint Louis","seed":9,"region":"Midwest","archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":8.6,"free_throw_gen":5.2,"off_efficiency":5.8,"ball_security":3.1,"off_rebounding":4.5,"def_efficiency":6.1,"opp_3pt_allowed":8.7,"rim_protection":3.7,"pressure_defense":4.9,"experience":8.0,"pace_label":"Fast","avg_height":77.5,"barthag":0.873,"rr":17.7,"em_rank":"31","kenpom_rank":41}},{"round":"Round of 32","region":"East","date":"2026-03-21","time":"14:45","site":"Oklahoma City, OK","is_ff":false,"team1_name":"Michigan State","team2_name":"Louisville","team1":{"id":"michigan_state","name":"Michigan State","seed":3,"region":"East","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":5.1,"free_throw_gen":5.9,"off_efficiency":7.0,"ball_security":3.6,"off_rebounding":7.4,"def_efficiency":8.2,"opp_3pt_allowed":5.3,"rim_protection":6.7,"pressure_defense":2.9,"experience":4.0,"pace_label":"Slow","avg_height":78.7,"barthag":0.944,"rr":24.6,"em_rank":"12","kenpom_rank":9},"team2":{"id":"louisville","name":"Louisville","seed":6,"region":"East","archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":7.7,"free_throw_gen":4.6,"off_efficiency":7.4,"ball_security":4.5,"off_rebounding":5.2,"def_efficiency":6.9,"opp_3pt_allowed":5.5,"rim_protection":3.5,"pressure_defense":4.8,"experience":8.9,"pace_label":"Moderate","avg_height":78.4,"barthag":0.936,"rr":21.8,"em_rank":"20","kenpom_rank":19}},{"round":"Round of 32","region":"East","date":"2026-03-21","time":"17:15","site":"Greenville, SC","is_ff":false,"team1_name":"Duke","team2_name":"TCU","team1":{"id":"duke","name":"Duke","seed":1,"region":"East","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":6.1,"free_throw_gen":6.6,"off_efficiency":8.8,"ball_security":5.4,"off_rebounding":7.3,"def_efficiency":10.0,"opp_3pt_allowed":8.2,"rim_protection":4.4,"pressure_defense":6.5,"experience":1.6,"pace_label":"Slow","avg_height":79.3,"barthag":0.981,"rr":34.8,"em_rank":"1","kenpom_rank":1},"team2":{"id":"tcu","name":"TCU","seed":9,"region":"East","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":3.9,"free_throw_gen":7.0,"off_efficiency":4.4,"ball_security":5.7,"off_rebounding":5.8,"def_efficiency":7.2,"opp_3pt_allowed":4.3,"rim_protection":6.2,"pressure_defense":5.9,"experience":5.7,"pace_label":"Moderate","avg_height":76.4,"barthag":0.837,"rr":16.0,"em_rank":"43","kenpom_rank":43}},{"round":"Round of 32","region":"South","date":"2026-03-21","time":"18:10","site":"Oklahoma City, OK","is_ff":false,"team1_name":"Houston","team2_name":"Texas A&M","team1":{"id":"houston","name":"Houston","seed":2,"region":"South","archetype":"two_way_machine","is_veteran":false,"is_length":false,"three_pt_prowess":5.3,"free_throw_gen":1.6,"off_efficiency":7.7,"ball_security":9.1,"off_rebounding":6.4,"def_efficiency":9.2,"opp_3pt_allowed":6.2,"rim_protection":6.0,"pressure_defense":6.8,"experience":5.9,"pace_label":"Slow","avg_height":77.8,"barthag":0.97,"rr":31.0,"em_rank":"5","kenpom_rank":5},"team2":{"id":"texas_am","name":"Texas A&M","seed":10,"region":"South","archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":6.4,"off_efficiency":5.9,"ball_security":6.9,"off_rebounding":5.0,"def_efficiency":6.2,"opp_3pt_allowed":6.7,"rim_protection":3.3,"pressure_defense":5.9,"experience":9.5,"pace_label":"Fast","avg_height":77.2,"barthag":0.872,"rr":16.4,"em_rank":"41","kenpom_rank":39}},{"round":"Round of 32","region":"West","date":"2026-03-21","time":"19:10","site":"Portland, OR","is_ff":false,"team1_name":"Gonzaga","team2_name":"Texas","team1":{"id":"gonzaga","name":"Gonzaga","seed":3,"region":"West","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":3.3,"free_throw_gen":3.5,"off_efficiency":6.7,"ball_security":8.1,"off_rebounding":6.0,"def_efficiency":8.4,"opp_3pt_allowed":7.7,"rim_protection":5.2,"pressure_defense":6.9,"experience":10.0,"pace_label":"Moderate","avg_height":78.0,"barthag":0.95,"rr":27.7,"em_rank":"10","kenpom_rank":10},"team2":{"id":"texas","name":"Texas","seed":11,"region":"West","archetype":"foul_line_bully","is_veteran":true,"is_length":false,"three_pt_prowess":4.5,"free_throw_gen":10.0,"off_efficiency":7.7,"ball_security":6.0,"off_rebounding":6.3,"def_efficiency":4.6,"opp_3pt_allowed":1.6,"rim_protection":2.1,"pressure_defense":3.3,"experience":10.0,"pace_label":"Slow","avg_height":78.1,"barthag":0.854,"rr":17.1,"em_rank":"34","kenpom_rank":37}},{"round":"Round of 32","region":"South","date":"2026-03-21","time":"19:50","site":"Greenville, SC","is_ff":false,"team1_name":"Illinois","team2_name":"VCU","team1":{"id":"illinois","name":"Illinois","seed":3,"region":"South","archetype":"offensive_juggernaut","is_veteran":false,"is_length":true,"three_pt_prowess":6.9,"free_throw_gen":4.3,"off_efficiency":9.9,"ball_security":8.8,"off_rebounding":7.5,"def_efficiency":6.8,"opp_3pt_allowed":7.0,"rim_protection":6.2,"pressure_defense":1.0,"experience":5.0,"pace_label":"Slow","avg_height":80.0,"barthag":0.968,"rr":28.9,"em_rank":"9","kenpom_rank":7},"team2":{"id":"vcu","name":"VCU","seed":11,"region":"South","archetype":"gunslinger","is_veteran":false,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":9.4,"off_efficiency":6.0,"ball_security":6.1,"off_rebounding":5.0,"def_efficiency":5.6,"opp_3pt_allowed":5.0,"rim_protection":5.1,"pressure_defense":5.6,"experience":5.0,"pace_label":"Moderate","avg_height":77.8,"barthag":0.843,"rr":16.1,"em_rank":"42","kenpom_rank":45}},{"round":"Round of 32","region":"South","date":"2026-03-21","time":"20:45","site":"Oklahoma City, OK","is_ff":false,"team1_name":"Nebraska","team2_name":"Vanderbilt","team1":{"id":"nebraska","name":"Nebraska","seed":4,"region":"South","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":7.2,"free_throw_gen":1.7,"off_efficiency":5.5,"ball_security":7.2,"off_rebounding":2.7,"def_efficiency":8.9,"opp_3pt_allowed":8.8,"rim_protection":3.1,"pressure_defense":5.7,"experience":8.4,"pace_label":"Slow","avg_height":77.8,"barthag":0.931,"rr":22.3,"em_rank":"18","kenpom_rank":14},"team2":{"id":"vanderbilt","name":"Vanderbilt","seed":5,"region":"South","archetype":"offensive_juggernaut","is_veteran":true,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":6.8,"off_efficiency":8.3,"ball_security":8.7,"off_rebounding":4.6,"def_efficiency":6.7,"opp_3pt_allowed":6.1,"rim_protection":6.2,"pressure_defense":6.4,"experience":8.8,"pace_label":"Moderate","avg_height":77.2,"barthag":0.946,"rr":24.0,"em_rank":"14","kenpom_rank":12}},{"round":"Round of 32","region":"West","date":"2026-03-21","time":"21:45","site":"Portland, OR","is_ff":false,"team1_name":"Arkansas","team2_name":"High Point","team1":{"id":"arkansas","name":"Arkansas","seed":4,"region":"West","archetype":"offensive_juggernaut","is_veteran":false,"is_length":false,"three_pt_prowess":5.9,"free_throw_gen":6.0,"off_efficiency":8.7,"ball_security":10.0,"off_rebounding":5.0,"def_efficiency":6.0,"opp_3pt_allowed":6.7,"rim_protection":6.4,"pressure_defense":5.0,"experience":4.9,"pace_label":"Fast","avg_height":78.5,"barthag":0.936,"rr":23.8,"em_rank":"15","kenpom_rank":15},"team2":{"id":"high_point","name":"High Point","seed":12,"region":"West","archetype":"foul_line_bully","is_veteran":true,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":9.0,"off_efficiency":4.9,"ball_security":9.1,"off_rebounding":4.9,"def_efficiency":3.7,"opp_3pt_allowed":6.4,"rim_protection":4.9,"pressure_defense":9.3,"experience":7.8,"pace_label":"Moderate","avg_height":76.3,"barthag":0.699,"rr":8.6,"em_rank":"79","kenpom_rank":92}},{"round":"Round of 32","region":"East","date":"2026-03-22","time":"20:45","site":"Buffalo, NY","is_ff":false,"team1_name":"UConn","team2_name":"UCLA","team1":{"id":"uconn","name":"UConn","seed":2,"region":"East","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":5.4,"free_throw_gen":3.0,"off_efficiency":6.7,"ball_security":4.0,"off_rebounding":6.3,"def_efficiency":8.4,"opp_3pt_allowed":8.3,"rim_protection":8.2,"pressure_defense":5.4,"experience":8.6,"pace_label":"Slow","avg_height":78.6,"barthag":0.965,"rr":30.5,"em_rank":"8","kenpom_rank":11},"team2":{"id":"ucla","name":"UCLA","seed":7,"region":"East","archetype":"offensive_engine","is_veteran":true,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":4.4,"off_efficiency":7.3,"ball_security":8.5,"off_rebounding":4.5,"def_efficiency":5.8,"opp_3pt_allowed":6.6,"rim_protection":3.7,"pressure_defense":5.0,"experience":9.1,"pace_label":"Slow","avg_height":78.0,"barthag":0.911,"rr":20.3,"em_rank":"24","kenpom_rank":27}},{"round":"Round of 32","region":"West","date":"2026-03-22","time":"12:10","site":"St. Louis, MO","is_ff":false,"team1_name":"Purdue","team2_name":"Miami (FL)","team1":{"id":"purdue","name":"Purdue","seed":2,"region":"West","archetype":"offensive_juggernaut","is_veteran":true,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":2.3,"off_efficiency":10.0,"ball_security":8.4,"off_rebounding":6.6,"def_efficiency":6.4,"opp_3pt_allowed":3.7,"rim_protection":3.3,"pressure_defense":3.7,"experience":9.0,"pace_label":"Slow","avg_height":77.8,"barthag":0.964,"rr":30.3,"em_rank":"6","kenpom_rank":8},"team2":{"id":"miami_fl","name":"Miami (FL)","seed":7,"region":"West","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.7,"free_throw_gen":6.5,"off_efficiency":6.5,"ball_security":4.8,"off_rebounding":6.8,"def_efficiency":6.3,"opp_3pt_allowed":2.3,"rim_protection":4.1,"pressure_defense":6.4,"experience":5.6,"pace_label":"Moderate","avg_height":78.4,"barthag":0.887,"rr":18.6,"em_rank":"28","kenpom_rank":31}},{"round":"Round of 32","region":"Midwest","date":"2026-03-22","time":"14:45","site":"St. Louis, MO","is_ff":false,"team1_name":"Iowa State","team2_name":"Kentucky","team1":{"id":"iowa_state","name":"Iowa State","seed":2,"region":"Midwest","archetype":"two_way_machine","is_veteran":true,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":4.9,"off_efficiency":7.3,"ball_security":6.2,"off_rebounding":6.2,"def_efficiency":9.2,"opp_3pt_allowed":6.2,"rim_protection":3.0,"pressure_defense":8.1,"experience":9.3,"pace_label":"Slow","avg_height":78.1,"barthag":0.966,"rr":29.5,"em_rank":"7","kenpom_rank":6},"team2":{"id":"kentucky","name":"Kentucky","seed":7,"region":"Midwest","archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":4.7,"free_throw_gen":6.5,"off_efficiency":6.2,"ball_security":6.4,"off_rebounding":5.6,"def_efficiency":6.8,"opp_3pt_allowed":6.8,"rim_protection":5.9,"pressure_defense":5.2,"experience":4.4,"pace_label":"Moderate","avg_height":78.8,"barthag":0.89,"rr":20.2,"em_rank":"25","kenpom_rank":28}},{"round":"Round of 32","region":"East","date":"2026-03-22","time":"17:15","site":"San Diego, CA","is_ff":false,"team1_name":"Kansas","team2_name":"St. John's","team1":{"id":"kansas","name":"Kansas","seed":4,"region":"East","archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":4.5,"free_throw_gen":4.2,"off_efficiency":5.4,"ball_security":5.7,"off_rebounding":3.9,"def_efficiency":8.4,"opp_3pt_allowed":7.9,"rim_protection":8.5,"pressure_defense":3.2,"experience":5.6,"pace_label":"Moderate","avg_height":78.7,"barthag":0.928,"rr":21.9,"em_rank":"19","kenpom_rank":21},"team2":{"id":"st_johns","name":"St. John's","seed":5,"region":"East","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":3.4,"free_throw_gen":8.5,"off_efficiency":6.0,"ball_security":6.8,"off_rebounding":6.4,"def_efficiency":8.3,"opp_3pt_allowed":7.2,"rim_protection":6.0,"pressure_defense":6.1,"experience":7.9,"pace_label":"Moderate","avg_height":78.2,"barthag":0.942,"rr":25.5,"em_rank":"11","kenpom_rank":17}},{"round":"Round of 32","region":"Midwest","date":"2026-03-22","time":"18:10","site":"Philadelphia, PA","is_ff":false,"team1_name":"Virginia","team2_name":"Tennessee","team1":{"id":"virginia","name":"Virginia","seed":3,"region":"Midwest","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":4.4,"off_efficiency":6.9,"ball_security":5.0,"off_rebounding":7.2,"def_efficiency":7.8,"opp_3pt_allowed":7.6,"rim_protection":10.0,"pressure_defense":4.6,"experience":6.8,"pace_label":"Slow","avg_height":78.2,"barthag":0.943,"rr":24.1,"em_rank":"13","kenpom_rank":13},"team2":{"id":"tennessee","name":"Tennessee","seed":6,"region":"Midwest","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":3.2,"free_throw_gen":7.0,"off_efficiency":6.4,"ball_security":3.6,"off_rebounding":10.0,"def_efficiency":8.1,"opp_3pt_allowed":8.0,"rim_protection":5.1,"pressure_defense":6.0,"experience":5.0,"pace_label":"Slow","avg_height":78.4,"barthag":0.941,"rr":23.5,"em_rank":"16","kenpom_rank":16}},{"round":"Round of 32","region":"South","date":"2026-03-22","time":"19:10","site":"Tampa, FL","is_ff":false,"team1_name":"Florida","team2_name":"Iowa","team1":{"id":"florida","name":"Florida","seed":1,"region":"South","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":2.9,"free_throw_gen":7.2,"off_efficiency":7.9,"ball_security":4.4,"off_rebounding":9.2,"def_efficiency":9.1,"opp_3pt_allowed":5.9,"rim_protection":6.0,"pressure_defense":4.3,"experience":6.5,"pace_label":"Fast","avg_height":78.9,"barthag":0.973,"rr":31.4,"em_rank":"4","kenpom_rank":4},"team2":{"id":"iowa","name":"Iowa","seed":9,"region":"South","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":5.8,"free_throw_gen":5.1,"off_efficiency":6.6,"ball_security":6.1,"off_rebounding":4.2,"def_efficiency":6.7,"opp_3pt_allowed":4.4,"rim_protection":1.5,"pressure_defense":6.2,"experience":4.2,"pace_label":"Slow","avg_height":78.5,"barthag":0.907,"rr":20.1,"em_rank":"26","kenpom_rank":25}},{"round":"Round of 32","region":"West","date":"2026-03-22","time":"19:50","site":"San Diego, CA","is_ff":false,"team1_name":"Arizona","team2_name":"Utah State","team1":{"id":"arizona","name":"Arizona","seed":1,"region":"West","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":3.5,"free_throw_gen":9.0,"off_efficiency":8.7,"ball_security":6.1,"off_rebounding":7.3,"def_efficiency":9.7,"opp_3pt_allowed":7.0,"rim_protection":4.8,"pressure_defense":5.9,"experience":4.8,"pace_label":"Moderate","avg_height":79.0,"barthag":0.978,"rr":32.0,"em_rank":"3","kenpom_rank":2},"team2":{"id":"utah_state","name":"Utah State","seed":9,"region":"West","archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":7.0,"off_efficiency":6.7,"ball_security":5.8,"off_rebounding":5.3,"def_efficiency":6.0,"opp_3pt_allowed":4.1,"rim_protection":3.2,"pressure_defense":7.5,"experience":8.7,"pace_label":"Moderate","avg_height":77.7,"barthag":0.895,"rr":17.6,"em_rank":"32","kenpom_rank":30}},{"round":"Round of 32","region":"Midwest","date":"2026-03-22","time":"21:45","site":"Tampa, FL","is_ff":false,"team1_name":"Alabama","team2_name":"Texas Tech","team1":{"id":"alabama","name":"Alabama","seed":4,"region":"Midwest","archetype":"offensive_juggernaut","is_veteran":false,"is_length":false,"three_pt_prowess":7.9,"free_throw_gen":6.3,"off_efficiency":9.1,"ball_security":9.1,"off_rebounding":4.8,"def_efficiency":5.4,"opp_3pt_allowed":4.6,"rim_protection":5.1,"pressure_defense":3.8,"experience":6.9,"pace_label":"Fast","avg_height":78.2,"barthag":0.934,"rr":23.2,"em_rank":"17","kenpom_rank":18},"team2":{"id":"texas_tech","name":"Texas Tech","seed":5,"region":"Midwest","archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":8.5,"free_throw_gen":1.6,"off_efficiency":7.7,"ball_security":5.2,"off_rebounding":5.4,"def_efficiency":6.6,"opp_3pt_allowed":6.9,"rim_protection":3.7,"pressure_defense":3.7,"experience":7.2,"pace_label":"Slow","avg_height":77.1,"barthag":0.944,"rr":18.3,"em_rank":"29","kenpom_rank":20}},{"round":"Sweet 16","region":"West","date":"2026-03-26","time":"19:10","site":"San Jose, CA","is_ff":false,"team1_name":"Purdue","team2_name":"Texas","team1":{"id":"purdue","name":"Purdue","seed":2,"region":"West","archetype":"offensive_juggernaut","is_veteran":true,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":2.3,"off_efficiency":10.0,"ball_security":8.4,"off_rebounding":6.6,"def_efficiency":6.4,"opp_3pt_allowed":3.7,"rim_protection":3.3,"pressure_defense":3.7,"experience":9.0,"pace_label":"Slow","avg_height":77.8,"barthag":0.964,"rr":30.3,"em_rank":"6","kenpom_rank":8},"team2":{"id":"texas","name":"Texas","seed":11,"region":"West","archetype":"foul_line_bully","is_veteran":true,"is_length":false,"three_pt_prowess":4.5,"free_throw_gen":10.0,"off_efficiency":7.7,"ball_security":6.0,"off_rebounding":6.3,"def_efficiency":4.6,"opp_3pt_allowed":1.6,"rim_protection":2.1,"pressure_defense":3.3,"experience":10.0,"pace_label":"Slow","avg_height":78.1,"barthag":0.854,"rr":17.1,"em_rank":"34","kenpom_rank":37}},{"round":"Sweet 16","region":"South","date":"2026-03-26","time":"19:30","site":"Houston, TX","is_ff":false,"team1_name":"Nebraska","team2_name":"Iowa","team1":{"id":"nebraska","name":"Nebraska","seed":4,"region":"South","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":7.2,"free_throw_gen":1.7,"off_efficiency":5.5,"ball_security":7.2,"off_rebounding":2.7,"def_efficiency":8.9,"opp_3pt_allowed":8.8,"rim_protection":3.1,"pressure_defense":5.7,"experience":8.4,"pace_label":"Slow","avg_height":77.8,"barthag":0.931,"rr":22.3,"em_rank":"18","kenpom_rank":14},"team2":{"id":"iowa","name":"Iowa","seed":9,"region":"South","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":5.8,"free_throw_gen":5.1,"off_efficiency":6.6,"ball_security":6.1,"off_rebounding":4.2,"def_efficiency":6.7,"opp_3pt_allowed":4.4,"rim_protection":1.5,"pressure_defense":6.2,"experience":4.2,"pace_label":"Slow","avg_height":78.5,"barthag":0.907,"rr":20.1,"em_rank":"26","kenpom_rank":25}},{"round":"Sweet 16","region":"West","date":"2026-03-26","time":"21:45","site":"San Jose, CA","is_ff":false,"team1_name":"Arizona","team2_name":"Arkansas","team1":{"id":"arizona","name":"Arizona","seed":1,"region":"West","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":3.5,"free_throw_gen":9.0,"off_efficiency":8.7,"ball_security":6.1,"off_rebounding":7.3,"def_efficiency":9.7,"opp_3pt_allowed":7.0,"rim_protection":4.8,"pressure_defense":5.9,"experience":4.8,"pace_label":"Moderate","avg_height":79.0,"barthag":0.978,"rr":32.0,"em_rank":"3","kenpom_rank":2},"team2":{"id":"arkansas","name":"Arkansas","seed":4,"region":"West","archetype":"offensive_juggernaut","is_veteran":false,"is_length":false,"three_pt_prowess":5.9,"free_throw_gen":6.0,"off_efficiency":8.7,"ball_security":10.0,"off_rebounding":5.0,"def_efficiency":6.0,"opp_3pt_allowed":6.7,"rim_protection":6.4,"pressure_defense":5.0,"experience":4.9,"pace_label":"Fast","avg_height":78.5,"barthag":0.936,"rr":23.8,"em_rank":"15","kenpom_rank":15}},{"round":"Sweet 16","region":"South","date":"2026-03-26","time":"22:05","site":"Houston, TX","is_ff":false,"team1_name":"Houston","team2_name":"Illinois","team1":{"id":"houston","name":"Houston","seed":2,"region":"South","archetype":"two_way_machine","is_veteran":false,"is_length":false,"three_pt_prowess":5.3,"free_throw_gen":1.6,"off_efficiency":7.7,"ball_security":9.1,"off_rebounding":6.4,"def_efficiency":9.2,"opp_3pt_allowed":6.2,"rim_protection":6.0,"pressure_defense":6.8,"experience":5.9,"pace_label":"Slow","avg_height":77.8,"barthag":0.97,"rr":31.0,"em_rank":"5","kenpom_rank":5},"team2":{"id":"illinois","name":"Illinois","seed":3,"region":"South","archetype":"offensive_juggernaut","is_veteran":false,"is_length":true,"three_pt_prowess":6.9,"free_throw_gen":4.3,"off_efficiency":9.9,"ball_security":8.8,"off_rebounding":7.5,"def_efficiency":6.8,"opp_3pt_allowed":7.0,"rim_protection":6.2,"pressure_defense":1.0,"experience":5.0,"pace_label":"Slow","avg_height":80.0,"barthag":0.968,"rr":28.9,"em_rank":"9","kenpom_rank":7}},{"round":"Sweet 16","region":"East","date":"2026-03-27","time":"19:10","site":"Washington, DC","is_ff":false,"team1_name":"Duke","team2_name":"St. John's","team1":{"id":"duke","name":"Duke","seed":1,"region":"East","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":6.1,"free_throw_gen":6.6,"off_efficiency":8.8,"ball_security":5.4,"off_rebounding":7.3,"def_efficiency":10.0,"opp_3pt_allowed":8.2,"rim_protection":4.4,"pressure_defense":6.5,"experience":1.6,"pace_label":"Slow","avg_height":79.3,"barthag":0.981,"rr":34.8,"em_rank":"1","kenpom_rank":1},"team2":{"id":"st_johns","name":"St. John's","seed":5,"region":"East","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":3.4,"free_throw_gen":8.5,"off_efficiency":6.0,"ball_security":6.8,"off_rebounding":6.4,"def_efficiency":8.3,"opp_3pt_allowed":7.2,"rim_protection":6.0,"pressure_defense":6.1,"experience":7.9,"pace_label":"Moderate","avg_height":78.2,"barthag":0.942,"rr":25.5,"em_rank":"11","kenpom_rank":17}},{"round":"Sweet 16","region":"Midwest","date":"2026-03-27","time":"19:35","site":"Chicago, IL","is_ff":false,"team1_name":"Michigan","team2_name":"Alabama","team1":{"id":"michigan","name":"Michigan","seed":1,"region":"Midwest","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":6.0,"free_throw_gen":6.6,"off_efficiency":8.3,"ball_security":4.1,"off_rebounding":6.2,"def_efficiency":10.0,"opp_3pt_allowed":8.5,"rim_protection":8.7,"pressure_defense":3.2,"experience":7.2,"pace_label":"Fast","avg_height":78.7,"barthag":0.98,"rr":34.5,"em_rank":"2","kenpom_rank":3},"team2":{"id":"alabama","name":"Alabama","seed":4,"region":"Midwest","archetype":"offensive_juggernaut","is_veteran":false,"is_length":false,"three_pt_prowess":7.9,"free_throw_gen":6.3,"off_efficiency":9.1,"ball_security":9.1,"off_rebounding":4.8,"def_efficiency":5.4,"opp_3pt_allowed":4.6,"rim_protection":5.1,"pressure_defense":3.8,"experience":6.9,"pace_label":"Fast","avg_height":78.2,"barthag":0.934,"rr":23.2,"em_rank":"17","kenpom_rank":18}},{"round":"Sweet 16","region":"East","date":"2026-03-27","time":"21:45","site":"Washington, DC","is_ff":false,"team1_name":"Michigan State","team2_name":"UConn","team1":{"id":"michigan_state","name":"Michigan State","seed":3,"region":"East","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":5.1,"free_throw_gen":5.9,"off_efficiency":7.0,"ball_security":3.6,"off_rebounding":7.4,"def_efficiency":8.2,"opp_3pt_allowed":5.3,"rim_protection":6.7,"pressure_defense":2.9,"experience":4.0,"pace_label":"Slow","avg_height":78.7,"barthag":0.944,"rr":24.6,"em_rank":"12","kenpom_rank":9},"team2":{"id":"uconn","name":"UConn","seed":2,"region":"East","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":5.4,"free_throw_gen":3.0,"off_efficiency":6.7,"ball_security":4.0,"off_rebounding":6.3,"def_efficiency":8.4,"opp_3pt_allowed":8.3,"rim_protection":8.2,"pressure_defense":5.4,"experience":8.6,"pace_label":"Slow","avg_height":78.6,"barthag":0.965,"rr":30.5,"em_rank":"8","kenpom_rank":11}},{"round":"Sweet 16","region":"Midwest","date":"2026-03-27","time":"22:10","site":"Chicago, IL","is_ff":false,"team1_name":"Iowa State","team2_name":"Tennessee","team1":{"id":"iowa_state","name":"Iowa State","seed":2,"region":"Midwest","archetype":"two_way_machine","is_veteran":true,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":4.9,"off_efficiency":7.3,"ball_security":6.2,"off_rebounding":6.2,"def_efficiency":9.2,"opp_3pt_allowed":6.2,"rim_protection":3.0,"pressure_defense":8.1,"experience":9.3,"pace_label":"Slow","avg_height":78.1,"barthag":0.966,"rr":29.5,"em_rank":"7","kenpom_rank":6},"team2":{"id":"tennessee","name":"Tennessee","seed":6,"region":"Midwest","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":3.2,"free_throw_gen":7.0,"off_efficiency":6.4,"ball_security":3.6,"off_rebounding":10.0,"def_efficiency":8.1,"opp_3pt_allowed":8.0,"rim_protection":5.1,"pressure_defense":6.0,"experience":5.0,"pace_label":"Slow","avg_height":78.4,"barthag":0.941,"rr":23.5,"em_rank":"16","kenpom_rank":16}}];


// ── Live scores hook ──────────────────────────────────────────────────────────
function useScores() {
  const [scores, setScores]         = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError]           = useState(null);
  const fetchingRef                 = useRef(false); // in-flight guard

  // Frontend name normalization — catches any ESPN variants that slipped through the scraper
  const ESPN_NAME_MAP = {
    "Pennsylvania": "Penn", "Pennsylvania Quakers": "Penn", "Penn Quakers": "Penn",
    "Queens (NC)": "Queens", "Queens (NC) Royals": "Queens", "Queens Royals": "Queens",
    "Long Island Univ.": "Long Island University", "LIU Sharks": "Long Island University",
    "Long Island University Sharks": "Long Island University",
    "North Dakota St.": "North Dakota State", "North Dakota State Bison": "North Dakota State",
    "Kennesaw St.": "Kennesaw State", "Kennesaw State Owls": "Kennesaw State",
    "Wright St.": "Wright State", "Wright State Raiders": "Wright State",
    "Tennessee St.": "Tennessee State", "Tennessee State Tigers": "Tennessee State",
    "Miami (OH)": "Miami (Ohio)", "Miami (OH) RedHawks": "Miami (Ohio)", "Miami RedHawks": "Miami (Ohio)",
    "Connecticut": "UConn", "Connecticut Huskies": "UConn", "UConn Huskies": "UConn",
    "Saint Mary's (CA)": "Saint Mary's", "Saint Mary's Gaels": "Saint Mary's",
    "California Baptist": "Cal Baptist", "California Baptist Lancers": "Cal Baptist", "Cal Baptist Lancers": "Cal Baptist",
    "Hawai'i Rainbow Warriors": "Hawai'i", "Hawaii Rainbow Warriors": "Hawai'i",
    "Prairie View A&M Panthers": "Prairie View A&M", "Prairie View": "Prairie View A&M",
    "Northern Iowa Panthers": "Northern Iowa",
  };
  function normalizeName(n) { return ESPN_NAME_MAP[n] ?? n; }

  function buildLookup(games) {
    // Store as array of results per team — a team can appear multiple times
    // (e.g. Howard in First Four AND First Round)
    const map = {};
    for (const g of games) {
      if (g.state === "pre") continue;
      const t1 = normalizeName(g.t1_name);
      const t2 = normalizeName(g.t2_name);
      const entry1 = { score:g.t1_score, opp:g.t2_score, winner:g.t1_winner, detail:g.detail, state:g.state, date:g.date };
      const entry2 = { score:g.t2_score, opp:g.t1_score, winner:g.t2_winner, detail:g.detail, state:g.state, date:g.date };
      if (!map[t1]) map[t1] = [];
      if (!map[t2]) map[t2] = [];
      map[t1].push(entry1);
      map[t2].push(entry2);
    }
    return map;
  }

  useEffect(() => {
    const controller = new AbortController();

    async function fetchScores() {
      if (fetchingRef.current) return; // skip if previous fetch still running
      fetchingRef.current = true;
      try {
        const r = await fetch(
          "https://storage.googleapis.com/cbb-scores-490420/scores.json",
          { cache: "no-store", signal: controller.signal }
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!data || !Array.isArray(data.games)) {
          throw new Error("scores.json missing games array");
        }
        setScores(buildLookup(data.games));
        setLastUpdate(data.updated || null);
        setError(null);
      } catch(e) {
        if (e.name === "AbortError") return; // unmount cleanup, not a real error
        console.warn("[scores] fetch error:", e.message);
        setError(e.message);
      } finally {
        fetchingRef.current = false;
      }
    }

    fetchScores();
    const interval = setInterval(fetchScores, 2 * 60 * 1000); // 2 min for live tournament scores
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return { scores, lastUpdate, error };
}


// ── Live odds hook ────────────────────────────────────────────────────────────
// Fetches odds.json from GCS once on load (odds don't change mid-game)
function useOdds() {
  const [odds, setOdds] = useState({});

  useEffect(() => {
    fetch("https://storage.googleapis.com/cbb-scores-490420/odds.json", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (
          data &&
          data.odds &&
          typeof data.odds === "object" &&
          !Array.isArray(data.odds) &&
          Object.keys(data.odds).length > 0
        ) {
          setOdds(data.odds);
        } else {
          console.warn("[odds] unexpected payload shape:", data);
        }
      })
      .catch(e => console.warn("[odds] fetch error:", e.message));
  }, []);

  return odds;
}

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

// ── Round date ranges (shared by MatchupsTab and PicksTab) ────────────────────
const ROUND_DATES = {
  "First Four":   ["2026-03-17","2026-03-18"],
  "First Round":  ["2026-03-19","2026-03-20"],
  "Round of 32":  ["2026-03-21","2026-03-22"],
  "Sweet 16":     ["2026-03-26","2026-03-27","2026-03-28"],
  "Elite 8":      ["2026-03-29","2026-03-30"],
  "Final Four":   ["2026-04-03"],
  "Championship": ["2026-04-05"],
  // PicksTab short-form keys
  "R64":  ["2026-03-19","2026-03-20"],
  "R32":  ["2026-03-21","2026-03-22"],
  "S16":  ["2026-03-26","2026-03-27","2026-03-28"],
  "E8":   ["2026-03-29","2026-03-30"],
  "F4":   ["2026-04-03"],
  "NCG":  ["2026-04-05"],
};
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
const fmt12h = t => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,"0")} ${ampm}`;
};
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

function MatchupCard({ matchup, onTeamClick }) {
  const { scores, liveOdds } = useTournament();
  const odds = liveOdds;
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
            {o1?.ml && (() => { const f = formatML(o1.ml); return f ? <span style={{ fontSize:11, color:"var(--color-text-tertiary)", marginLeft:6 }}>{f.display} <span style={{ color:"var(--color-text-tertiary)", fontSize:10 }}>({f.prob}%)</span></span> : null; })()}
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"var(--color-text-tertiary)", borderLeft:"0.5px solid var(--color-border-tertiary)", borderRight:"0.5px solid var(--color-border-tertiary)", textAlign:"center", lineHeight:1.3 }}>
            {o1?.ou ? <>O/U<br/>{o1.ou}</> : "—"}
          </div>
          <div style={{ padding:"5px 12px", textAlign:"right" }}>
            {o2?.ml && (() => { const f = formatML(o2.ml); return f ? <span style={{ fontSize:11, color:"var(--color-text-tertiary)", marginRight:6 }}><span style={{ color:"var(--color-text-tertiary)", fontSize:10 }}>({f.prob}%)</span> {f.display}</span> : null; })()}
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
function MatchupsTab() {
  const { scores, lastUpdate, liveOdds, setSelectedTeam } = useTournament();
  const onTeamClick = setSelectedTeam;
  const odds = liveOdds;
  const [filterRegion,  setFilterRegion]  = useState("All");
  const [filterRound,   setFilterRound]   = useState("All");
  const [sortBy,        setSortBy]        = useState("time");
  const [hideFinished,  setHideFinished]  = useState(true);

  const matchups = useMemo(() => {
    let filtered = MATCHUP_DATA.filter(m => {
      if (filterRegion !== "All" && m.region !== filterRegion) return false;
      if (filterRound  !== "All") {
        const dates = ROUND_DATES[filterRound] || [];
        if (!dates.includes(m.date)) return false;
      }
      return true;
    });
    // Hide games where either team has a completed result on that date
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
          <option value="Sweet 16">Sweet 16</option>
          <option value="Elite 8">Elite 8</option>
          <option value="Final Four">Final Four</option>
          <option value="Championship">Championship</option>
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
            ? (() => {
                const diff = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 1000);
                const rel = diff < 60 ? `${diff}s ago` : diff < 3600 ? `${Math.floor(diff/60)}m ago` : `${Math.floor(diff/3600)}h ago`;
                return `Scores updated ${rel}`;
              })()
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
              {games.map((m, i) => <MatchupCard key={i} matchup={m} onTeamClick={onTeamClick}/>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Classifier Tab ────────────────────────────────────────────────────────────
function ClassifierTab() {
  const { scores, setSelectedTeam } = useTournament();
  const onTeamClick = setSelectedTeam;
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

// ── Tournament Context ────────────────────────────────────────────────────────
// ── BracketTab ────────────────────────────────────────────────────────────────
// Self-contained bracket view. Uses MATCHUP_DATA + scores context.
// No new modules — insert this block into App.jsx before AppShell.

// Helper: resolve winner for a given game from scores lookup
// Returns the winner's display name, or null if not yet decided.
function resolveWinner(team1Name, team2Name, gameDate, scores) {
  const all1 = scores?.[team1Name];
  if (!all1) return null;
  const entry = gameDate
    ? all1.find(r => r.date === gameDate)
    : all1[all1.length - 1];
  if (!entry || entry.state === "pre") return null;
  if (entry.state === "in") return null; // live — no winner yet
  return entry.winner ? team1Name : team2Name;
}

// Helper: get score entry for a team on a given date
function getScoreEntry(teamName, gameDate, scores) {
  const all = scores?.[teamName];
  if (!all) return null;
  return gameDate ? all.find(r => r.date === gameDate) ?? null : (all[all.length - 1] ?? null);
}

// Build the region bracket structure from MATCHUP_DATA
// Returns { r64Games, r32Games } for a given region
// Each game: { team1, team2, date, round }
// team1/team2 are { name, seed } objects or null (TBD)
function buildRegionBracket(region, scores) {
  const r64 = MATCHUP_DATA.filter(g => g.region === region && g.round === "First Round");
  const r32raw = MATCHUP_DATA.filter(g => g.region === region && g.round === "Round of 32");

  // Standard bracket seeding order for display (top to bottom):
  // Slot A: 1 vs 16
  // Slot B: 8 vs 9
  // Slot C: 5 vs 12
  // Slot D: 4 vs 13
  // Slot E: 6 vs 11
  // Slot F: 3 vs 14
  // Slot G: 7 vs 10
  // Slot H: 2 vs 15
  const seedOrder = [
    [1, 16], [8, 9], [5, 12], [4, 13],
    [6, 11], [3, 14], [7, 10], [2, 15],
  ];

  const findR64Game = (s1, s2) =>
    r64.find(g =>
      (g.team1.seed === s1 && g.team2.seed === s2) ||
      (g.team1.seed === s2 && g.team2.seed === s1)
    ) ?? null;

  const r64Games = seedOrder.map(([s1, s2]) => {
    const g = findR64Game(s1, s2);
    if (!g) return { team1: { name: "TBD", seed: s1 }, team2: { name: "TBD", seed: s2 }, date: null };
    return {
      team1: { name: g.team1_name, seed: g.team1.seed },
      team2: { name: g.team2_name, seed: g.team2.seed },
      date: g.date,
    };
  });

  // R32 games: 4 games. Pairing by bracket half:
  // Top half:    slot 0+1 winners, slot 2+3 winners
  // Bottom half: slot 4+5 winners, slot 6+7 winners
  // We need to find R32 games in MATCHUP_DATA by matching the actual winners
  // OR by seed pairs (1/8/9/16 bracket, etc.)

  // Get R64 winners
  const r64Winners = r64Games.map(g =>
    resolveWinner(g.team1.name, g.team2.name, g.date, scores)
  );

  // R32 slot pairs: [r64SlotA, r64SlotB] → one R32 game
  const r32Pairs = [
    [0, 1], // 1/16 winner vs 8/9 winner
    [2, 3], // 5/12 winner vs 4/13 winner
    [4, 5], // 6/11 winner vs 3/14 winner
    [6, 7], // 7/10 winner vs 2/15 winner
  ];

  const r32Games = r32Pairs.map(([a, b]) => {
    const winA = r64Winners[a];
    const winB = r64Winners[b];
    const seedA = winA
      ? (r64Games[a].team1.name === winA ? r64Games[a].team1.seed : r64Games[a].team2.seed)
      : null;
    const seedB = winB
      ? (r64Games[b].team1.name === winB ? r64Games[b].team1.seed : r64Games[b].team2.seed)
      : null;

    // Find matching game in MATCHUP_DATA r32 by checking if both teams appear
    const actual = winA && winB
      ? r32raw.find(g =>
          (g.team1_name === winA && g.team2_name === winB) ||
          (g.team1_name === winB && g.team2_name === winA)
        ) ?? null
      : null;

    const date = actual?.date ?? null;

    return {
      team1: winA ? { name: winA, seed: seedA } : { name: "TBD", seed: seedA },
      team2: winB ? { name: winB, seed: seedB } : { name: "TBD", seed: seedB },
      date,
    };
  });

  // S16 games: 2 games
  const r32Winners = r32Games.map(g =>
    g.team1.name !== "TBD" && g.team2.name !== "TBD"
      ? resolveWinner(g.team1.name, g.team2.name, g.date, scores)
      : null
  );

  const s16Pairs = [[0, 1], [2, 3]];
  const s16Games = s16Pairs.map(([a, b]) => {
    const winA = r32Winners[a];
    const winB = r32Winners[b];
    const seedA = winA
      ? (r32Games[a].team1.name === winA ? r32Games[a].team1.seed : r32Games[a].team2.seed)
      : null;
    const seedB = winB
      ? (r32Games[b].team1.name === winB ? r32Games[b].team1.seed : r32Games[b].team2.seed)
      : null;
    return {
      team1: winA ? { name: winA, seed: seedA } : { name: "TBD", seed: seedA },
      team2: winB ? { name: winB, seed: seedB } : { name: "TBD", seed: seedB },
      date: null,
    };
  });

  // E8: 1 game
  const s16Winners = s16Games.map(g =>
    g.team1.name !== "TBD" && g.team2.name !== "TBD"
      ? resolveWinner(g.team1.name, g.team2.name, g.date, scores)
      : null
  );

  const e8Game = {
    team1: s16Winners[0] ? { name: s16Winners[0], seed: s16Winners[0] === s16Games[0].team1.name ? s16Games[0].team1.seed : s16Games[0].team2.seed } : { name: "TBD", seed: null },
    team2: s16Winners[1] ? { name: s16Winners[1], seed: s16Winners[1] === s16Games[1].team1.name ? s16Games[1].team1.seed : s16Games[1].team2.seed } : { name: "TBD", seed: null },
    date: null,
  };

  const e8Winner = e8Game.team1.name !== "TBD" && e8Game.team2.name !== "TBD"
    ? resolveWinner(e8Game.team1.name, e8Game.team2.name, e8Game.date, scores)
    : null;
  const e8WinnerSeed = e8Winner
    ? (e8Game.team1.name === e8Winner ? e8Game.team1.seed : e8Game.team2.seed)
    : null;

  return {
    r64Games,
    r32Games,
    s16Games,
    e8Game,
    f4Team: e8Winner ? { name: e8Winner, seed: e8WinnerSeed } : { name: "TBD", seed: null },
    region,
  };
}

// Single team slot in the bracket
function BracketTeamSlot({ team, isWinner, gameState, scores, gameDate, onClick }) {
  if (!team) return <div style={{ height: 28 }} />;

  const isTbd = team.name === "TBD";
  const entry = !isTbd && gameDate ? getScoreEntry(team.name, gameDate, scores) : null;
  const isLive = entry?.state === "in";
  const didWin = entry?.winner === true;
  const didLose = entry && !entry.winner && entry.state !== "in" && entry.state !== "pre";

  let bg = "var(--color-background-primary)";
  let borderColor = "var(--color-border-tertiary)";
  let textColor = "var(--color-text-primary)";
  let opacity = 1;

  if (isTbd) {
    bg = "var(--color-background-secondary)";
    textColor = "var(--color-text-tertiary)";
  } else if (isLive) {
    borderColor = "#0891b2";
    bg = "#0891b211";
  } else if (didWin) {
    bg = "#dcfce7";
    borderColor = "#86efac";
  } else if (didLose) {
    opacity = 0.45;
    textColor = "var(--color-text-tertiary)";
  }

  const scoreStr = entry && !isTbd && entry.state !== "pre"
    ? `${entry.score}-${entry.opp}`
    : null;

  return (
    <div
      onClick={!isTbd && onClick ? () => {
        const t = TEAMS_WITH_CP.find(x => x.name === team.name);
        if (t) onClick(t);
      } : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "4px 7px", borderRadius: 5,
        background: bg, border: `1px solid ${borderColor}`,
        cursor: isTbd ? "default" : "pointer",
        opacity, transition: "opacity 0.15s",
        minHeight: 28,
      }}
    >
      {/* Seed */}
      {team.seed != null && (
        <span style={{
          fontSize: 9, fontWeight: 600, width: 14, textAlign: "center", flexShrink: 0,
          color: "var(--color-text-tertiary)",
        }}>
          {team.seed}
        </span>
      )}
      {/* Name */}
      <span style={{
        fontSize: 11, fontWeight: didWin ? 600 : 400,
        color: textColor, flex: 1, overflow: "hidden",
        whiteSpace: "nowrap", textOverflow: "ellipsis",
      }}>
        {isTbd ? "TBD" : team.name}
      </span>
      {/* Score + state */}
      {scoreStr && (
        <span style={{
          fontSize: 10, fontWeight: 500, flexShrink: 0,
          color: didWin ? "#166534" : isLive ? "#0891b2" : "var(--color-text-tertiary)",
        }}>
          {isLive && <span style={{ marginRight: 3, color: "#0891b2" }}>●</span>}
          {scoreStr}
        </span>
      )}
      {didWin && !isLive && (
        <span style={{ fontSize: 9, color: "#16a34a", flexShrink: 0 }}>✓</span>
      )}
    </div>
  );
}

// A single matchup (two team slots with a connector)
function BracketGame({ team1, team2, date, scores, onTeamClick, showRoundLabel, roundLabel }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {showRoundLabel && (
        <div style={{ fontSize: 9, fontWeight: 600, color: "var(--color-text-tertiary)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 2 }}>
          {roundLabel}
        </div>
      )}
      <BracketTeamSlot team={team1} scores={scores} gameDate={date} onClick={onTeamClick} />
      <BracketTeamSlot team={team2} scores={scores} gameDate={date} onClick={onTeamClick} />
    </div>
  );
}

// One region's bracket column
function RegionBracket({ regionData, scores, onTeamClick }) {
  const { r64Games, r32Games, s16Games, e8Game, f4Team, region } = regionData;
  const regionColor = REGION_COLORS[region] || "#374151";

  const colStyle = {
    display: "flex", flexDirection: "column", gap: 0,
  };

  const roundHeaderStyle = (color) => ({
    fontSize: 10, fontWeight: 700, color, letterSpacing: "0.05em",
    textTransform: "uppercase", padding: "4px 6px",
    borderBottom: `1px solid ${color}33`, marginBottom: 4,
    background: color + "0d", borderRadius: "4px 4px 0 0",
  });

  const roundWrapStyle = {
    display: "flex", flexDirection: "column", gap: 6,
    padding: "6px",
    background: "var(--color-background-secondary)",
    border: "0.5px solid var(--color-border-tertiary)",
    borderRadius: 6,
    minWidth: 160,
  };

  const sectionStyle = {
    display: "flex", gap: 8, alignItems: "flex-start",
  };

  // Layout: R64 | R32 | S16 | E8 | F4
  // Each column stacks games; R64 has 8, R32 has 4, S16 has 2, E8 has 1, F4 has 1 slot

  const gameGap = 6; // px between games within a column

  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 820 }}>
      {/* Region header */}
      <div style={{
        fontSize: 12, fontWeight: 700, color: regionColor,
        padding: "6px 8px", marginBottom: 8,
        borderBottom: `2px solid ${regionColor}`,
        letterSpacing: "0.04em", textTransform: "uppercase",
      }}>
        {region} Region
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", overflowX: "auto" }}>
        {/* R64 — 8 games */}
        <div style={{ ...roundWrapStyle, minWidth: 170 }}>
          <div style={roundHeaderStyle(regionColor)}>R64</div>
          <div style={{ display: "flex", flexDirection: "column", gap: gameGap }}>
            {r64Games.map((g, i) => (
              <BracketGame key={i} team1={g.team1} team2={g.team2} date={g.date}
                scores={scores} onTeamClick={onTeamClick} />
            ))}
          </div>
        </div>

        {/* R32 — 4 games */}
        <div style={{ ...roundWrapStyle, minWidth: 162 }}>
          <div style={roundHeaderStyle(regionColor)}>R32</div>
          <div style={{ display: "flex", flexDirection: "column", gap: gameGap }}>
            {r32Games.map((g, i) => {
              // Find the actual r32 game date from MATCHUP_DATA
              const actualDate = (() => {
                if (g.team1.name === "TBD" || g.team2.name === "TBD") return null;
                const match = MATCHUP_DATA.find(m =>
                  m.round === "Round of 32" && m.region === region &&
                  ((m.team1_name === g.team1.name && m.team2_name === g.team2.name) ||
                   (m.team1_name === g.team2.name && m.team2_name === g.team1.name))
                );
                return match?.date ?? null;
              })();
              return (
                <BracketGame key={i} team1={g.team1} team2={g.team2}
                  date={actualDate} scores={scores} onTeamClick={onTeamClick} />
              );
            })}
          </div>
        </div>

        {/* S16 — 2 games */}
        <div style={{ ...roundWrapStyle, minWidth: 154 }}>
          <div style={roundHeaderStyle(regionColor)}>Sweet 16</div>
          <div style={{ display: "flex", flexDirection: "column", gap: gameGap * 4 }}>
            {s16Games.map((g, i) => (
              <BracketGame key={i} team1={g.team1} team2={g.team2}
                date={null} scores={scores} onTeamClick={onTeamClick} />
            ))}
          </div>
        </div>

        {/* E8 — 1 game */}
        <div style={{ ...roundWrapStyle, minWidth: 148 }}>
          <div style={roundHeaderStyle(regionColor)}>Elite 8</div>
          <div style={{ paddingTop: 16 }}>
            <BracketGame team1={e8Game.team1} team2={e8Game.team2}
              date={null} scores={scores} onTeamClick={onTeamClick} />
          </div>
        </div>

        {/* F4 team (who advances) */}
        <div style={{ ...roundWrapStyle, minWidth: 140 }}>
          <div style={roundHeaderStyle("#7c3aed")}>Final Four</div>
          <div style={{ paddingTop: 32 }}>
            <BracketTeamSlot
              team={f4Team}
              scores={scores}
              gameDate={null}
              onClick={onTeamClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BracketTab({ onTeamClick }) {
  const { scores } = useTournament();

  const regionData = useMemo(() => {
    return ["East", "South", "West", "Midwest"].map(region =>
      buildRegionBracket(region, scores)
    );
  }, [scores]);

  // Derive Final Four + Championship
  const f4Teams = regionData.map(r => r.f4Team);

  // F4 games: East vs West (left side), South vs Midwest (right side)
  // Standard bracket: East vs South, Midwest vs West
  // NCAA 2026: East vs South in one game, Midwest vs West in other
  // Actual order: (East champ) vs (South champ), (Midwest champ) vs (West champ)
  const f4Game1 = { team1: f4Teams[0], team2: f4Teams[1], date: "2026-04-03" }; // East vs South
  const f4Game2 = { team1: f4Teams[2], team2: f4Teams[3], date: "2026-04-03" }; // West vs Midwest

  const ncgTeam1 = resolveWinner(f4Game1.team1.name, f4Game1.team2.name, f4Game1.date, scores);
  const ncgTeam2 = resolveWinner(f4Game2.team1.name, f4Game2.team2.name, f4Game2.date, scores);

  const ncgGame = {
    team1: ncgTeam1 ? { name: ncgTeam1 } : { name: "TBD" },
    team2: ncgTeam2 ? { name: ncgTeam2 } : { name: "TBD" },
    date: "2026-04-05",
  };

  const champion = resolveWinner(ncgGame.team1.name, ncgGame.team2.name, ncgGame.date, scores);

  return (
    <div style={{ paddingBottom: "2rem" }}>
      {/* Header note */}
      <div style={{
        marginBottom: "1rem", padding: "0.6rem 0.9rem",
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-md)",
        fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5,
      }}>
        Live bracket — winners update automatically. Click any team to view their full profile.
        R64 and R32 results shown from live scores. S16+ updates as games complete.
      </div>

      {/* Four regions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", overflowX: "auto" }}>
        {regionData.map(rd => (
          <RegionBracket key={rd.region} regionData={rd} scores={scores} onTeamClick={onTeamClick} />
        ))}
      </div>

      {/* Final Four + Championship */}
      <div style={{
        marginTop: "1.5rem", padding: "1rem",
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-secondary)",
        borderRadius: "var(--border-radius-lg)",
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, letterSpacing: "0.05em",
          textTransform: "uppercase", color: "#7c3aed",
          borderBottom: "2px solid #7c3aed44", paddingBottom: 6, marginBottom: 12,
        }}>
          Final Four &amp; Championship — Houston, TX
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* Semifinal 1: East vs South */}
          <div style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 8, padding: "10px 12px", minWidth: 200,
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Semifinal 1 · Apr 3
            </div>
            <BracketGame team1={f4Game1.team1} team2={f4Game1.team2}
              date={f4Game1.date} scores={scores} onTeamClick={onTeamClick} />
          </div>

          {/* Semifinal 2: Midwest vs West */}
          <div style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 8, padding: "10px 12px", minWidth: 200,
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Semifinal 2 · Apr 3
            </div>
            <BracketGame team1={f4Game2.team1} team2={f4Game2.team2}
              date={f4Game2.date} scores={scores} onTeamClick={onTeamClick} />
          </div>

          {/* Championship */}
          <div style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 8, padding: "10px 12px", minWidth: 200,
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Championship · Apr 5
            </div>
            <BracketGame team1={ncgGame.team1} team2={ncgGame.team2}
              date={ncgGame.date} scores={scores} onTeamClick={onTeamClick} />
          </div>

          {/* Champion */}
          {champion && (
            <div style={{
              background: "linear-gradient(135deg, #fef9c3, #fef08a)",
              border: "1.5px solid #ca8a04",
              borderRadius: 8, padding: "10px 14px", minWidth: 160,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                🏆 Champion
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#78350f" }}>{champion}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


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


function PicksTab({ onTeamClick, scores, odds }) {
  const [sortBy,       setSortBy]      = useState("time");
  const [hideFinished, setHideFinished] = useState(true);
  const [filterRegion, setFilterRegion] = useState("All");
  const [filterTier, setFilterTier]   = useState("All");
  const [filterRound,  setFilterRound]  = useState("All");

  // ROUND_DATES, gapColor, gapLabel — all defined at module scope

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

      {/* jbScore vs KenPom analysis — shown at top, changes with round filter */}
      {(() => {
        const S = {
          card: { background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)", padding:"1rem 1.25rem", marginBottom:"1rem" },
          metric: { background:"var(--color-background-secondary)", borderRadius:"var(--border-radius-md)", padding:"12px 14px" },
          metricLabel: { fontSize:11, color:"var(--color-text-secondary)", marginBottom:3 },
          metricValue: { fontSize:22, fontWeight:500, color:"var(--color-text-primary)", lineHeight:1.2 },
          metricSub: { fontSize:11, color:"var(--color-text-tertiary)", marginTop:2 },
          sectionTitle: { fontSize:11, fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10, paddingBottom:6, borderBottom:"0.5px solid var(--color-border-tertiary)" },
        };
        if (filterRound === "R32") return <div style={{ marginBottom:"1.5rem" }}><KenPomR32Compare S={S}/></div>;
        if (filterRound === "S16") return <div style={{ marginBottom:"1.5rem" }}><KenPomS16Note S={S}/></div>;
        if (filterRound === "All" || filterRound === "R64") return <div style={{ marginBottom:"1.5rem" }}><KenPomR64Compare S={S}/></div>;
        return null;
      })()}

      {/* Matchup cards */}
      {filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:"3rem 1rem", color:"var(--color-text-tertiary)", fontSize:13, border:"0.5px solid var(--color-border-tertiary)", borderRadius:"var(--border-radius-lg)" }}>
          No matchups match the current filters.{hideFinished && " Try turning off \"Hide finished\" to see completed games."}
        </div>
      )}
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
                        {oFav.s&&<span style={{ fontWeight:600, color:parseFloat(oFav.s)<0?"#1a6b3a":"var(--color-text-secondary)", marginRight:6 }}>{parseFloat(oFav.s)>0?"+":""}{String(oFav.s).replace(/^\+/,"")}</span>}
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
                        {oDog.s&&<span style={{ fontWeight:600, marginRight:6 }}>{parseFloat(oDog.s)>0?"+":""}{String(oDog.s).replace(/^\+/,"")}</span>}
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
    { fav:"(8) Clemson",          dog:"(9) Iowa",              delta:-4.6, uScore:-0.8,  winner:"Iowa",          score:"67-61" },
    { fav:"(8) Villanova",        dog:"(9) Utah State",        delta:-3.5, uScore:6.7,   winner:"Utah State",    score:"86-76" },
    { fav:"(6) North Carolina",   dog:"(11) VCU",              delta:-1.9, uScore:11.6,  winner:"VCU",           score:"82-78" },
    { fav:"(8) Georgia",          dog:"(9) Saint Louis",       delta:0.3,  uScore:-3.5,  winner:"Saint Louis",   score:"102-77" },
    { fav:"(7) Saint Mary\'s",   dog:"(10) Texas A&M",        delta:1.1,  uScore:12.3,  winner:"Texas A&M",     score:"63-50" },
    { fav:"(7) Kentucky",         dog:"(10) Santa Clara",      delta:2.9,  uScore:1.1,   winner:"Kentucky",      score:"89-84" },
    { fav:"(7) Miami (FL)",       dog:"(10) Missouri",         delta:5.5,  uScore:-4.4,  winner:"Miami (FL)",    score:"80-66" },
    { fav:"(8) Ohio State",       dog:"(9) TCU",               delta:8.9,  uScore:5.7,   winner:"TCU",           score:"66-64" },
    { fav:"(6) Louisville",       dog:"(11) South Florida",    delta:10.6, uScore:8.8,   winner:"Louisville",    score:"83-79" },
    { fav:"(5) Texas Tech",       dog:"(12) Akron",            delta:13.9, uScore:2.0,   winner:"Texas Tech",    score:"91-71" },
    { fav:"(7) UCLA",             dog:"(10) UCF",              delta:15.8, uScore:-6.0,  winner:"UCLA",          score:"75-71" },
    { fav:"(5) Wisconsin",        dog:"(12) High Point",       delta:17.0, uScore:16.1,  winner:"High Point",    score:"83-82" },
    { fav:"(3) Michigan State",   dog:"(14) N Dakota State",   delta:19.4, uScore:3.7,   winner:"Michigan State",score:"92-67" },
    { fav:"(5) St. John\'s",     dog:"(12) Northern Iowa",    delta:21.6, uScore:-23.9, winner:"St. John\'s",  score:"79-53" },
    { fav:"(5) Vanderbilt",       dog:"(12) McNeese",          delta:24.2, uScore:-0.8,  winner:"Vanderbilt",    score:"78-68" },
    { fav:"(4) Alabama",          dog:"(13) Hofstra",          delta:28.4, uScore:-18.6, winner:"Alabama",       score:"90-70" },
    { fav:"(4) Kansas",           dog:"(13) Cal Baptist",      delta:28.6, uScore:2.2,   winner:"Kansas",        score:"68-60" },
    { fav:"(4) Nebraska",         dog:"(13) Troy",             delta:33.8, uScore:0.7,   winner:"Nebraska",      score:"76-47" },
    { fav:"(3) Gonzaga",          dog:"(14) Kennesaw State",   delta:34.6, uScore:3.6,   winner:"Gonzaga",       score:"73-64" },
    { fav:"(2) UConn",            dog:"(15) Furman",           delta:34.9, uScore:-10.4, winner:"UConn",         score:"82-71" },
    { fav:"(3) Virginia",         dog:"(14) Wright State",     delta:35.1, uScore:-9.0,  winner:"Virginia",      score:"82-73" },
    { fav:"(4) Arkansas",         dog:"(13) Hawai\'i",        delta:39.8, uScore:-10.2, winner:"Arkansas",      score:"97-78" },
    { fav:"(3) Illinois",         dog:"(14) Penn",             delta:41.6, uScore:-6.1,  winner:"Illinois",      score:"105-70" },
    { fav:"(2) Houston",          dog:"(15) Idaho",            delta:42.3, uScore:-7.6,  winner:"Houston",       score:"78-47" },
    { fav:"(2) Purdue",           dog:"(15) Queens",           delta:45.7, uScore:1.4,   winner:"Purdue",        score:"104-71" },
    { fav:"(2) Iowa State",       dog:"(15) Tenn. State",      delta:54.9, uScore:-8.9,  winner:"Iowa State",    score:"108-74" },
    { fav:"(1) Arizona",          dog:"(16) Long Island",      delta:62.1, uScore:-15.0, winner:"Arizona",       score:"92-58" },
    { fav:"(1) Duke",             dog:"(16) Siena",            delta:63.1, uScore:-24.3, winner:"Duke",          score:"71-65" },
  ].map(g => {
    // Upset = higher seed number (worse seed) won. fav is defined as the lower seed / betting favorite.
    const favSeed = parseInt(g.fav.match(/\((\d+)\)/)?.[1] ?? "0");
    const dogSeed = parseInt(g.dog.match(/\((\d+)\)/)?.[1] ?? "99");
    // Extract team name after "(N) "
    const favName = g.fav.replace(/^\(\d+\) /, "");
    const upset = favSeed < dogSeed
      ? g.winner !== favName   // normal case: fav is lower seed, upset if dog won
      : g.winner === g.dog.replace(/^\(\d+\) /, ""); // inverted: dog is actually lower seed
    return { ...g, upset };
  });

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

// ── R32ResultsTable ───────────────────────────────────────────────────────────
function R32ResultsTable({ S, scores }) {
  // All 16 R32 matchups — winner derived from live scores prop
  const MATCHUPS = [
    // Saturday March 21
    { fav:"Michigan",    fav_seed:1, dog:"Saint Louis", dog_seed:9,  jb_delta:14.6, date:"2026-03-21" },
    { fav:"Louisville",  fav_seed:6, dog:"Michigan State",dog_seed:3, jb_delta:2.2,  date:"2026-03-21" },
    { fav:"Duke",        fav_seed:1, dog:"TCU",          dog_seed:9,  jb_delta:26.5, date:"2026-03-21" },
    { fav:"Houston",     fav_seed:2, dog:"Texas A&M",    dog_seed:10, jb_delta:11.6, date:"2026-03-21" },
    { fav:"Gonzaga",     fav_seed:3, dog:"Texas",        dog_seed:11, jb_delta:5.7,  date:"2026-03-21" },
    { fav:"Illinois",    fav_seed:3, dog:"VCU",          dog_seed:11, jb_delta:12.4, date:"2026-03-21" },
    { fav:"Vanderbilt",  fav_seed:5, dog:"Nebraska",     dog_seed:4,  jb_delta:6.5,  date:"2026-03-21" },
    { fav:"Arkansas",    fav_seed:4, dog:"High Point",   dog_seed:12, jb_delta:20.7, date:"2026-03-21" },
    // Sunday March 22
    { fav:"Purdue",      fav_seed:2, dog:"Miami (FL)",   dog_seed:7,  jb_delta:16.1, date:"2026-03-22" },
    { fav:"Iowa State",  fav_seed:2, dog:"Kentucky",     dog_seed:7,  jb_delta:15.7, date:"2026-03-22" },
    { fav:"St. John's",  fav_seed:5, dog:"Kansas",       dog_seed:4,  jb_delta:5.7,  date:"2026-03-22" },
    { fav:"Virginia",    fav_seed:3, dog:"Tennessee",    dog_seed:6,  jb_delta:5.6,  date:"2026-03-22" },
    { fav:"Florida",     fav_seed:1, dog:"Iowa",         dog_seed:9,  jb_delta:5.1,  date:"2026-03-22" },
    { fav:"Arizona",     fav_seed:1, dog:"Utah State",   dog_seed:9,  jb_delta:14.6, date:"2026-03-22" },
    { fav:"Alabama",     fav_seed:4, dog:"Texas Tech",   dog_seed:5,  jb_delta:6.5,  date:"2026-03-22" },
    { fav:"UCLA",        fav_seed:7, dog:"UConn",        dog_seed:2,  jb_delta:9.0,  date:"2026-03-22" },
  ];

  // Derive result from scores prop
  function getResult(m) {
    const favScores = scores?.[m.fav] ?? [];
    const dogScores = scores?.[m.dog] ?? [];
    const favGame = favScores.find(r => r.date === m.date && r.state === "post");
    const dogGame = dogScores.find(r => r.date === m.date && r.state === "post");
    if (!favGame && !dogGame) return null; // not played yet
    const game = favGame || dogGame;
    if (game.winner === true) {
      // the team we looked up won
      const winner = favGame ? m.fav : m.dog;
      const score = favGame ? `${game.score}-${game.opp}` : `${game.opp}-${game.score}`;
      return { winner, score, upset: winner === m.dog };
    } else if (game.winner === false) {
      const winner = favGame ? m.dog : m.fav;
      const score = favGame ? `${game.opp}-${game.score}` : `${game.score}-${game.opp}`;
      return { winner, score, upset: winner === m.dog };
    }
    return null;
  }

  const played = MATCHUPS.map(m => ({ ...m, result: getResult(m) })).filter(m => m.result);
  const pending = MATCHUPS.filter(m => !getResult(m));
  const upsets = played.filter(m => m.result.upset);

  if (played.length === 0) {
    return (
      <div style={S.card}>
        <div style={{ padding:"2rem", textAlign:"center", color:"var(--color-text-tertiary)", fontSize:13 }}>
          Round of 32 games start Saturday, March 21. Results will appear here automatically as games finish.
        </div>
      </div>
    );
  }

  return (
    <div style={S.card}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div style={S.sectionTitle}>
          {played.length} of 16 R32 results · {upsets.length} upset{upsets.length !== 1 ? "s" : ""}
          {pending.length > 0 && <span style={{ color:"var(--color-text-tertiary)", fontWeight:400 }}> · {pending.length} pending</span>}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto auto", gap:"0 10px", alignItems:"baseline" }}>
        {["Winner · Loser", "Score", "Margin", "jbGap", "Upset?"].map(h => (
          <div key={h} style={{ fontSize:11, fontWeight:500, color:"var(--color-text-secondary)", paddingBottom:6, borderBottom:"0.5px solid var(--color-border-secondary)" }}>{h}</div>
        ))}
        {played.sort((a,b) => (a.date+a.fav).localeCompare(b.date+b.fav)).map((m, i) => {
          const { winner, score, upset } = m.result;
          const loser = winner === m.fav ? m.dog : m.fav;
          const [w, l] = score.split("-").map(Number);
          const last = i === played.length - 1;
          const rowStyle = { padding:"6px 0", borderBottom: last ? "none" : "0.5px solid var(--color-border-tertiary)" };
          return [
            <div key={`t${i}`} style={{ ...rowStyle, fontSize:13 }}>
              <span style={{ fontWeight:500, color: upset ? "#166534" : "var(--color-text-primary)" }}>{winner}</span>
              <span style={{ color:"var(--color-text-tertiary)", fontSize:11 }}> · {loser}</span>
              {upset && <span style={{ fontSize:9, fontWeight:600, marginLeft:5, padding:"1px 5px", borderRadius:4, background:"rgba(22,101,52,0.1)", color:"#166534" }}>UPSET</span>}
            </div>,
            <div key={`s${i}`} style={{ ...rowStyle, ...S.mono }}>{score}</div>,
            <div key={`m${i}`} style={{ ...rowStyle, ...S.mono, color:"var(--color-text-tertiary)" }}>+{w - l}</div>,
            <div key={`d${i}`} style={{ ...rowStyle, ...S.mono, color: m.jb_delta < 5 ? "#dc2626" : m.jb_delta < 17 ? "#b45309" : "var(--color-text-secondary)" }}>+{m.jb_delta}</div>,
            <div key={`u${i}`} style={{ ...rowStyle, ...S.mono, color: upset ? "#166534" : "var(--color-text-tertiary)" }}>{upset ? "Yes" : "—"}</div>,
          ];
        })}
      </div>
      {pending.length > 0 && (
        <div style={{ marginTop:12, paddingTop:10, borderTop:"0.5px solid var(--color-border-tertiary)", fontSize:11, color:"var(--color-text-tertiary)" }}>
          Still to play: {pending.map(m => `${m.fav} vs ${m.dog}`).join(" · ")}
        </div>
      )}
    </div>
  );
}

// ── S16ProjectionsTable ──────────────────────────────────────────────────────
function S16ProjectionsTable({ S, scores }) {
  const MATCHUPS = [
    // Thursday March 26
    { fav:"Purdue",        fav_seed:2,  dog:"Texas",       dog_seed:11, jb_delta:14.0, kp_proj:"Purdue 82-74 (75%)",   date:"2026-03-26" },
    { fav:"Nebraska",      fav_seed:4,  dog:"Iowa",        dog_seed:9,  jb_delta:3.0,  kp_proj:"Nebraska 69-66 (58%)", date:"2026-03-26" },
    { fav:"Arizona",       fav_seed:1,  dog:"Arkansas",    dog_seed:4,  jb_delta:5.1,  kp_proj:"Arizona 87-79 (79%)",  date:"2026-03-26" },
    { fav:"Houston",       fav_seed:2,  dog:"Illinois",    dog_seed:3,  jb_delta:-0.6, kp_proj:"Houston 72-71 (53%)",  date:"2026-03-26" },
    // Friday March 27
    { fav:"Duke",          fav_seed:1,  dog:"St. John's",  dog_seed:5,  jb_delta:14.5, kp_proj:"Duke 75-68 (75%)",     date:"2026-03-27" },
    { fav:"Michigan",      fav_seed:1,  dog:"Alabama",     dog_seed:4,  jb_delta:3.8,  kp_proj:"Michigan 90-83 (76%)", date:"2026-03-27" },
    { fav:"Michigan State",fav_seed:3,  dog:"UConn",       dog_seed:2,  jb_delta:9.3,  kp_proj:"Michigan St. 70-69 (51%)", date:"2026-03-27" },
    { fav:"Iowa State",    fav_seed:2,  dog:"Tennessee",   dog_seed:6,  jb_delta:14.7, kp_proj:"Iowa St. 71-67 (64%)", date:"2026-03-27" },
  ];

  function getResult(m) {
    const favScores = scores?.[m.fav] ?? [];
    const dogScores = scores?.[m.dog] ?? [];
    const favGame = favScores.find(r => r.date === m.date && r.state === "post");
    const dogGame = dogScores.find(r => r.date === m.date && r.state === "post");
    if (!favGame && !dogGame) return null;
    const game = favGame || dogGame;
    if (game.winner === true) {
      const winner = favGame ? m.fav : m.dog;
      const score = favGame ? `${game.score}-${game.opp}` : `${game.opp}-${game.score}`;
      return { winner, score, upset: winner === m.dog };
    } else if (game.winner === false) {
      const winner = favGame ? m.dog : m.fav;
      const score = favGame ? `${game.opp}-${game.score}` : `${game.score}-${game.opp}`;
      return { winner, score, upset: winner === m.dog };
    }
    return null;
  }

  const withResults = MATCHUPS.map(m => ({ ...m, result: getResult(m) }));
  const played = withResults.filter(m => m.result);
  const pending = withResults.filter(m => !m.result);
  const upsets  = played.filter(m => m.result.upset);

  // Group into days
  const thu = withResults.filter(m => m.date === "2026-03-26");
  const fri = withResults.filter(m => m.date === "2026-03-27");

  const GameRow = ({ m }) => {
    const r = m.result;
    const gc = gapColor(m.jb_delta);
    return (
      <div style={{ display:"grid", gridTemplateColumns:"28px 1fr 1fr auto auto", gap:"0 10px",
        padding:"8px 0", borderBottom:"0.5px solid var(--color-border-tertiary)",
        alignItems:"center", fontSize:13 }}>
        {/* jbGap chip */}
        <div style={{ fontSize:9, fontWeight:700, padding:"2px 4px", borderRadius:4,
          background:gc.bg, color:gc.text, textAlign:"center", lineHeight:1.3 }}>
          {m.jb_delta > 0 ? "+" : ""}{m.jb_delta.toFixed(1)}
        </div>
        {/* Fav */}
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ fontSize:10, color:"var(--color-text-tertiary)", width:14 }}>{m.fav_seed}</span>
          <span style={{ fontWeight: r?.winner===m.fav ? 600 : 400,
            color: r?.winner===m.fav ? "var(--color-text-primary)" : r ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
            opacity: r?.winner===m.dog ? 0.5 : 1 }}>
            {m.fav}
          </span>
          {r?.winner===m.fav && <span style={{ fontSize:9, color:"#16a34a" }}>✓</span>}
        </div>
        {/* Dog */}
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ fontSize:10, color:"var(--color-text-tertiary)", width:14 }}>{m.dog_seed}</span>
          <span style={{ fontWeight: r?.winner===m.dog ? 600 : 400,
            color: r?.winner===m.dog ? "#166534" : r ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
            opacity: r?.winner===m.fav ? 0.5 : 1 }}>
            {m.dog}
          </span>
          {r?.upset && <span style={{ fontSize:9, fontWeight:600, padding:"1px 5px", borderRadius:4,
            background:"rgba(22,101,52,0.1)", color:"#166534", marginLeft:4 }}>UPSET</span>}
        </div>
        {/* Score or KenPom projection */}
        <div style={{ fontSize:11, color:"var(--color-text-secondary)", fontFamily:"monospace", textAlign:"right", whiteSpace:"nowrap" }}>
          {r ? r.score : <span style={{ color:"var(--color-text-tertiary)", fontSize:10 }}>{m.kp_proj}</span>}
        </div>
        {/* State */}
        <div style={{ fontSize:10, color:"var(--color-text-tertiary)", textAlign:"right", minWidth:36 }}>
          {r ? "Final" : "—"}
        </div>
      </div>
    );
  };

  const DaySection = ({ label, games }) => (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:600, color:"var(--color-text-secondary)",
        textTransform:"uppercase", letterSpacing:"0.05em",
        paddingBottom:6, marginBottom:4,
        borderBottom:"0.5px solid var(--color-border-secondary)" }}>
        {label}
      </div>
      {games.map((m, i) => <GameRow key={i} m={m} />)}
    </div>
  );

  return (
    <div style={S.card}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div style={S.sectionTitle}>
          Sweet 16 — {played.length} of 8 results
          {upsets.length > 0 && <span style={{ color:"#166534", fontWeight:600 }}> · {upsets.length} upset{upsets.length!==1?"s":""}</span>}
          {pending.length > 0 && <span style={{ color:"var(--color-text-tertiary)", fontWeight:400 }}> · {pending.length} pending</span>}
        </div>
        <span style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>KenPom projections shown until games complete</span>
      </div>
      <DaySection label="Thursday, March 26" games={thu} />
      <DaySection label="Friday, March 27" games={fri} />
      {played.length > 0 && (
        <div style={{ ...S.callout(upsets.length > 0 ? "warn" : "success"), marginTop:4 }}>
          {played.length} of 8 S16 games complete.
          {upsets.length > 0
            ? ` ${upsets.length} upset${upsets.length>1?"s":""}: ${upsets.map(m=>m.result.winner).join(", ")}.`
            : " KenPom favorites are holding serve so far."}
        </div>
      )}
    </div>
  );
}

// ── KenPomS16Note ─────────────────────────────────────────────────────────────
function KenPomS16Note({ S }) {
  return (
    <div style={S.card}>
      <div style={S.sectionTitle}>Sweet 16 — KenPom Projections</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        {[
          { day:"Thu Mar 26", games:[
            { fav:"Purdue",    fs:2,  dog:"Texas",    ds:11, proj:"Purdue 82-74",    pct:75 },
            { fav:"Nebraska",  fs:4,  dog:"Iowa",     ds:9,  proj:"Nebraska 69-66",  pct:58 },
            { fav:"Arizona",   fs:1,  dog:"Arkansas", ds:4,  proj:"Arizona 87-79",   pct:79 },
            { fav:"Houston",   fs:2,  dog:"Illinois", ds:3,  proj:"Houston 72-71",   pct:53 },
          ]},
          { day:"Fri Mar 27", games:[
            { fav:"Duke",          fs:1, dog:"St. John's",  ds:5, proj:"Duke 75-68",       pct:75 },
            { fav:"Michigan",      fs:1, dog:"Alabama",     ds:4, proj:"Michigan 90-83",   pct:76 },
            { fav:"Michigan State",fs:3, dog:"UConn",       ds:2, proj:"Mich St. 70-69",   pct:51 },
            { fav:"Iowa State",    fs:2, dog:"Tennessee",   ds:6, proj:"Iowa St. 71-67",   pct:64 },
          ]},
        ].map(({ day, games }) => (
          <div key={day}>
            <div style={{ fontSize:11, fontWeight:600, color:"var(--color-text-secondary)",
              textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>{day}</div>
            {games.map((g, i) => {
              const close = g.pct < 60;
              return (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"5px 0", borderBottom:"0.5px solid var(--color-border-tertiary)", fontSize:12 }}>
                  <span>
                    <span style={{ color:"var(--color-text-tertiary)", fontSize:10, marginRight:4 }}>{g.fs}</span>
                    <span style={{ fontWeight:500 }}>{g.fav}</span>
                    <span style={{ color:"var(--color-text-tertiary)", fontSize:10, margin:"0 4px" }}>vs</span>
                    <span style={{ color:"var(--color-text-tertiary)", fontSize:10, marginRight:4 }}>{g.ds}</span>
                    <span style={{ color: close ? "#b45309" : "var(--color-text-secondary)" }}>{g.dog}</span>
                  </span>
                  <span style={{ fontSize:11, color:"var(--color-text-tertiary)", fontFamily:"monospace", marginLeft:8, flexShrink:0 }}>
                    <span style={{ color: close ? "#b45309" : "#166534", fontWeight:600 }}>{g.pct}%</span>
                    {" "}{g.proj}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ ...S.callout("info"), marginTop:4 }}>
        KenPom projects 2 coin-flip games (Houston-Illinois 53%, Michigan St.-UConn 51%). Nebraska(4) over Iowa(9) at 58% is the other notable lean-underdog spot. Both #1 seeds (Duke, Michigan) are comfortable double-digit favorites.
      </div>
    </div>
  );
}

// ── KenPomR64Compare ─────────────────────────────────────────────────────────
function KenPomR64Compare({ S }) {
  const [day, setDay] = useState("thu");
  const [collapsed, setCollapsed] = useState(true);

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
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: collapsed ? 0 : 14, cursor:"pointer" }} onClick={() => setCollapsed(c => !c)}>
          <span style={{ padding:"2px 9px", borderRadius:10, fontSize:11, fontWeight:500, background:"rgba(124,58,237,0.1)", color:"#7c3aed" }}>vs KenPom</span>
          <span style={{ fontSize:14, fontWeight:500, color:"var(--color-text-primary)" }}>R64 — jbScore vs KenPom predictions</span>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>{collapsed ? "▶ show" : "▼ hide"}</span>
          </div>
        </div>
        {!collapsed && <div onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
          <div style={{ display:"flex", gap:4 }}>
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
        </div>}
      </div>
    </div>
  );
}

// ── KenPomR32Compare ─────────────────────────────────────────────────────────
function KenPomR32Compare({ S }) {
  const [day, setDay] = useState("sat");
  const [collapsed, setCollapsed] = useState(true);

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
  ];

  const SUN = [
    // Sunday March 22 — from FanMatch
    { dog:"(5) Texas Tech",   fav:"(4) Alabama",     kp_winner:"Alabama",     kp_pct:51, jb_delta:6.5,  jb_tier:"Danger zone"  },
    { dog:"(6) Tennessee",    fav:"(3) Virginia",    kp_winner:"Tennessee",   kp_pct:51, jb_delta:5.6,  jb_tier:"Danger zone", note:"KP favors dog" },
    { dog:"(4) Kansas",       fav:"(5) St. John\'s",kp_winner:"St. John\'s",kp_pct:56, jb_delta:5.7,  jb_tier:"Danger zone"  },
    { dog:"(7) Miami (FL)",   fav:"(2) Purdue",      kp_winner:"Purdue",      kp_pct:73, jb_delta:16.1, jb_tier:"Lean favorite"},
    { dog:"(9) Iowa",         fav:"(1) Florida",     kp_winner:"Florida",     kp_pct:75, jb_delta:5.1,  jb_tier:"Danger zone"  },
    { dog:"(7) Kentucky",     fav:"(2) Iowa State",  kp_winner:"Iowa State",  kp_pct:75, jb_delta:15.7, jb_tier:"Lean favorite"},
    { dog:"(2) UConn",        fav:"(7) UCLA",        kp_winner:"UConn",       kp_pct:63, jb_delta:9.0,  jb_tier:"Live underdog", note:"jbGap favors UCLA" },
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
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: collapsed ? 0 : 14, cursor:"pointer" }} onClick={() => setCollapsed(c => !c)}>
          <span style={{ padding:"2px 9px", borderRadius:10, fontSize:11, fontWeight:500, background:"rgba(124,58,237,0.1)", color:"#7c3aed" }}>vs KenPom</span>
          <span style={{ fontSize:14, fontWeight:500, color:"var(--color-text-primary)" }}>R32 — jbScore vs KenPom predictions</span>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>{collapsed ? "▶ show" : "▼ hide"}</span>
          </div>
        </div>
        {!collapsed && <div onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
          <div style={{ display:"flex", gap:4 }}>
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
            Key divergences: <strong style={{ color:"var(--color-text-secondary)" }}>Louisville vs Michigan St</strong> — KP favors MSU (59%), jbGap 2.2 calls it a coin flip. Three games under jbGap 8 — Gonzaga/Texas, Vanderbilt/Nebraska, and Louisville/MSU are Saturday's closest matchups on paper.
          </div>
        )}
        {day === "sun" && (
          <div style={{ marginTop:10, fontSize:11, color:"var(--color-text-tertiary)", lineHeight:1.6 }}>
            Key divergences: <strong style={{ color:"var(--color-text-secondary)" }}>Tennessee vs Virginia</strong> — KP favors Tennessee (51%) despite Virginia listed as jbGap fav (+5.6). Five games under jbGap 8 — Sunday is the more volatile day.
          </div>
        )}
        </div>}
      </div>
    </div>
  );
}



// ── FormulaResultsTab ────────────────────────────────────────────────────────
function FormulaResultsTab({ scores }) {
  const [round, setRound] = useState("r32");

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
  const S16_CONTENT = round === "s16";
  const PENDING_ROUND = ["e8","f4","ncg"].includes(round);
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

      {/* R32 content — live results from scores */}
      {R32_CONTENT && <div>
        <div style={{ marginBottom:"1rem", padding:"0.75rem 1rem", background:"var(--color-background-secondary)", borderRadius:"var(--border-radius-lg)", border:"0.5px solid var(--color-border-tertiary)", fontSize:12, color:"var(--color-text-secondary)", lineHeight:1.6 }}>
          Round of 32 results — 16 games (2026-03-21/22). Results populate automatically as games finish.
        </div>
        <R32ResultsTable S={S} scores={scores}/>
      </div>}

      {/* S16 content — KenPom projections */}
      {S16_CONTENT && <div>
        <div style={{ marginBottom:"1rem", padding:"0.75rem 1rem", background:"var(--color-background-secondary)", borderRadius:"var(--border-radius-lg)", border:"0.5px solid var(--color-border-tertiary)", fontSize:12, color:"var(--color-text-secondary)", lineHeight:1.6 }}>
          Sweet 16 — 8 games (2026-03-26/27). KenPom win probabilities shown. Results populate automatically as games finish.
        </div>
        <S16ProjectionsTable S={S} scores={scores}/>
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
    { id: "bracket",     label: "Bracket" },
  ];

  return (
    <div style={{ fontFamily:"var(--font-sans)", maxWidth:900, margin:"0 auto", padding:"0 0 2rem" }}>

      {/* Header */}
      <div style={{ padding:"1.25rem 0 0", marginBottom:"1rem" }}>
        <h1 style={{ margin:"0 0 0.75rem", fontSize:19, fontWeight:600, color:"var(--color-text-primary)" }}>
          2026 NCAA Tournament — Intelligence Suite
        </h1>

        {/* Tab bar */}
        <div style={{ display:"flex", gap:0, borderBottom:"0.5px solid var(--color-border-tertiary)", overflowX:"auto", whiteSpace:"nowrap" }}>
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

      {/* Tab content — tabs read scores/odds from context directly */}
      {tab==="classifier" && <ClassifierTab onTeamClick={setSelectedTeam} scores={scores}/>}
      {tab==="matchups"   && <MatchupsTab   onTeamClick={setSelectedTeam} scores={scores} lastUpdate={lastUpdate} odds={liveOdds}/>}
      {tab==="glossary"   && <GlossaryTab/>}
      {tab==="picks"      && <PicksTab onTeamClick={setSelectedTeam} scores={scores} odds={liveOdds}/>}
      {tab==="results"    && <FormulaResultsTab scores={scores}/>}
      {tab==="compare"    && <CompareTab onTeamClick={setSelectedTeam}/>}
      {tab==="bracket"    && <BracketTab onTeamClick={setSelectedTeam}/>}

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
