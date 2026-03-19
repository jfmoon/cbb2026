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

import { useState, useMemo, useEffect, useRef } from "react";

const _css = `
:root {
  --color-text-primary:        #111827;
  --color-text-secondary:      #374151;
  --color-text-tertiary:       #6b7280;
  --color-text-info:           #1d4ed8;
  --color-border-secondary:    rgba(0,0,0,0.18);
  --color-border-tertiary:     rgba(0,0,0,0.10);
  --color-background-primary:  #ffffff;
  --color-background-secondary:#f9fafb;
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
    --color-background-primary:  #111827;
    --color-background-secondary:#1f2937;
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

const UPSET_DATA = [{"region":"West","site":"Portland, OR","date":"2026-03-19","fav":"Wisconsin","fav_seed":5,"dog":"High Point","dog_seed":12,"jb_fav":70.3,"jb_dog":53.3,"jb_delta":17.0,"upset_score":16.1,"tier":"strong","to_edge":41.3,"threep_edge":-30.2,"orb_edge":11.7,"ftr_edge":44.0,"arc_edge":17.5,"tempo_edge":10.9},{"region":"South","site":"Oklahoma City, OK","date":"2026-03-19","fav":"Saint Mary's","fav_seed":7,"dog":"Texas A&M","dog_seed":10,"jb_fav":64.9,"jb_dog":63.8,"jb_delta":1.1,"upset_score":12.3,"tier":"moderate","to_edge":30.0,"threep_edge":20.2,"orb_edge":-22.2,"ftr_edge":6.0,"arc_edge":-5.0,"tempo_edge":48.2},{"region":"South","site":"Greenville, SC","date":"2026-03-19","fav":"North Carolina","fav_seed":6,"dog":"VCU","dog_seed":11,"jb_fav":61.7,"jb_dog":63.6,"jb_delta":-1.9,"upset_score":11.6,"tier":"moderate","to_edge":10.7,"threep_edge":10.6,"orb_edge":3.9,"ftr_edge":25.2,"arc_edge":17.5,"tempo_edge":5.5},{"region":"East","site":"Buffalo, NY","date":"2026-03-19","fav":"Louisville","fav_seed":6,"dog":"South Florida","dog_seed":11,"jb_fav":69.3,"jb_dog":58.7,"jb_delta":10.6,"upset_score":8.8,"tier":"moderate","to_edge":22.7,"threep_edge":-31.1,"orb_edge":23.0,"ftr_edge":30.4,"arc_edge":-15.0,"tempo_edge":17.3},{"region":"West","site":"San Diego, CA","date":"2026-03-20","fav":"Villanova","fav_seed":8,"dog":"Utah State","dog_seed":9,"jb_fav":61.0,"jb_dog":64.5,"jb_delta":-3.5,"upset_score":6.7,"tier":"moderate","to_edge":8.0,"threep_edge":-13.2,"orb_edge":3.0,"ftr_edge":29.6,"arc_edge":0.0,"tempo_edge":22.7},{"region":"East","site":"Greenville, SC","date":"2026-03-19","fav":"Ohio State","fav_seed":8,"dog":"TCU","dog_seed":9,"jb_fav":64.7,"jb_dog":55.8,"jb_delta":8.9,"upset_score":5.7,"tier":"moderate","to_edge":25.3,"threep_edge":-15.9,"orb_edge":16.1,"ftr_edge":3.6,"arc_edge":-26.3,"tempo_edge":14.5},{"region":"East","site":"Buffalo, NY","date":"2026-03-19","fav":"Michigan State","fav_seed":3,"dog":"North Dakota State","dog_seed":14,"jb_fav":67.1,"jb_dog":47.7,"jb_delta":19.4,"upset_score":3.7,"tier":"low","to_edge":34.0,"threep_edge":15.5,"orb_edge":-20.9,"ftr_edge":-22.0,"arc_edge":-7.5,"tempo_edge":2.7},{"region":"West","site":"Portland, OR","date":"2026-03-19","fav":"Gonzaga","fav_seed":3,"dog":"Kennesaw State","dog_seed":14,"jb_fav":67.9,"jb_dog":33.3,"jb_delta":34.6,"upset_score":3.6,"tier":"low","to_edge":-38.0,"threep_edge":28.0,"orb_edge":3.0,"ftr_edge":56.0,"arc_edge":-38.7,"tempo_edge":23.6},{"region":"East","site":"San Diego, CA","date":"2026-03-20","fav":"Kansas","fav_seed":4,"dog":"Cal Baptist","dog_seed":13,"jb_fav":62.1,"jb_dog":33.5,"jb_delta":28.6,"upset_score":2.2,"tier":"low","to_edge":-17.3,"threep_edge":-12.0,"orb_edge":36.1,"ftr_edge":14.0,"arc_edge":12.5,"tempo_edge":-16.4},{"region":"Midwest","site":"Tampa, FL","date":"2026-03-20","fav":"Texas Tech","fav_seed":5,"dog":"Akron","dog_seed":12,"jb_fav":68.3,"jb_dog":54.4,"jb_delta":13.9,"upset_score":2.0,"tier":"low","to_edge":14.0,"threep_edge":-10.7,"orb_edge":0.9,"ftr_edge":8.0,"arc_edge":-45.0,"tempo_edge":37.3},{"region":"West","site":"St. Louis, MO","date":"2026-03-20","fav":"Purdue","fav_seed":2,"dog":"Queens","dog_seed":15,"jb_fav":76.2,"jb_dog":30.5,"jb_delta":45.7,"upset_score":1.4,"tier":"low","to_edge":-10.7,"threep_edge":9.3,"orb_edge":-25.7,"ftr_edge":30.8,"arc_edge":-20.0,"tempo_edge":47.3},{"region":"Midwest","site":"St. Louis, MO","date":"2026-03-20","fav":"Kentucky","fav_seed":7,"dog":"Santa Clara","dog_seed":10,"jb_fav":62.8,"jb_dog":59.9,"jb_delta":2.9,"upset_score":1.1,"tier":"low","to_edge":12.7,"threep_edge":16.7,"orb_edge":12.6,"ftr_edge":-46.8,"arc_edge":-17.5,"tempo_edge":8.2},{"region":"South","site":"Oklahoma City, OK","date":"2026-03-19","fav":"Nebraska","fav_seed":4,"dog":"Troy","dog_seed":13,"jb_fav":68.2,"jb_dog":34.4,"jb_delta":33.8,"upset_score":0.7,"tier":"low","to_edge":-19.3,"threep_edge":-19.7,"orb_edge":37.0,"ftr_edge":36.4,"arc_edge":-17.5,"tempo_edge":-16.4},{"region":"South","site":"Tampa, FL","date":"2026-03-20","fav":"Clemson","fav_seed":8,"dog":"Iowa","dog_seed":9,"jb_fav":60.6,"jb_dog":65.2,"jb_delta":-4.6,"upset_score":-0.8,"tier":"low","to_edge":4.7,"threep_edge":1.5,"orb_edge":8.3,"ftr_edge":-10.4,"arc_edge":-12.5,"tempo_edge":-10.9},{"region":"South","site":"Oklahoma City, OK","date":"2026-03-19","fav":"Vanderbilt","fav_seed":5,"dog":"McNeese","dog_seed":12,"jb_fav":74.7,"jb_dog":50.5,"jb_delta":24.2,"upset_score":-0.8,"tier":"low","to_edge":19.3,"threep_edge":-31.3,"orb_edge":16.5,"ftr_edge":0.4,"arc_edge":-3.7,"tempo_edge":-23.6},{"region":"Midwest","site":"Buffalo, NY","date":"2026-03-19","fav":"Georgia","fav_seed":8,"dog":"Saint Louis","dog_seed":9,"jb_fav":64.3,"jb_dog":64.0,"jb_delta":0.3,"upset_score":-3.5,"tier":"low","to_edge":-30.0,"threep_edge":23.5,"orb_edge":-17.8,"ftr_edge":-9.2,"arc_edge":46.3,"tempo_edge":-3.6},{"region":"West","site":"St. Louis, MO","date":"2026-03-20","fav":"Miami (FL)","fav_seed":7,"dog":"Missouri","dog_seed":10,"jb_fav":60.1,"jb_dog":54.6,"jb_delta":5.5,"upset_score":-4.4,"tier":"low","to_edge":-23.3,"threep_edge":11.7,"orb_edge":-6.5,"ftr_edge":20.0,"arc_edge":-13.8,"tempo_edge":-12.7},{"region":"East","site":"Philadelphia, PA","date":"2026-03-20","fav":"UCLA","fav_seed":7,"dog":"UCF","dog_seed":10,"jb_fav":66.8,"jb_dog":51.0,"jb_delta":15.8,"upset_score":-6.0,"tier":"low","to_edge":-28.7,"threep_edge":-9.0,"orb_edge":14.3,"ftr_edge":-9.2,"arc_edge":-27.5,"tempo_edge":41.8},{"region":"South","site":"Greenville, SC","date":"2026-03-19","fav":"Illinois","fav_seed":3,"dog":"Penn","dog_seed":14,"jb_fav":76.0,"jb_dog":34.4,"jb_delta":41.6,"upset_score":-6.1,"tier":"low","to_edge":11.3,"threep_edge":-28.9,"orb_edge":-36.5,"ftr_edge":9.2,"arc_edge":-3.8,"tempo_edge":31.8},{"region":"South","site":"Oklahoma City, OK","date":"2026-03-19","fav":"Houston","fav_seed":2,"dog":"Idaho","dog_seed":15,"jb_fav":75.4,"jb_dog":33.1,"jb_delta":42.3,"upset_score":-7.6,"tier":"low","to_edge":-38.7,"threep_edge":13.6,"orb_edge":-30.0,"ftr_edge":31.6,"arc_edge":-33.7,"tempo_edge":40.0},{"region":"Midwest","site":"St. Louis, MO","date":"2026-03-20","fav":"Iowa State","fav_seed":2,"dog":"Tennessee State","dog_seed":15,"jb_fav":78.5,"jb_dog":23.6,"jb_delta":54.9,"upset_score":-8.9,"tier":"low","to_edge":-12.7,"threep_edge":-33.4,"orb_edge":-1.7,"ftr_edge":-2.0,"arc_edge":-17.5,"tempo_edge":33.6},{"region":"Midwest","site":"Philadelphia, PA","date":"2026-03-20","fav":"Virginia","fav_seed":3,"dog":"Wright State","dog_seed":14,"jb_fav":69.4,"jb_dog":34.3,"jb_delta":35.1,"upset_score":-9.0,"tier":"low","to_edge":2.7,"threep_edge":-32.3,"orb_edge":-20.4,"ftr_edge":19.6,"arc_edge":-33.8,"tempo_edge":13.6},{"region":"West","site":"Portland, OR","date":"2026-03-19","fav":"Arkansas","fav_seed":4,"dog":"Hawai'i","dog_seed":13,"jb_fav":74.0,"jb_dog":34.2,"jb_delta":39.8,"upset_score":-10.2,"tier":"low","to_edge":-50.0,"threep_edge":-3.2,"orb_edge":-3.5,"ftr_edge":24.0,"arc_edge":12.5,"tempo_edge":-11.8},{"region":"East","site":"Philadelphia, PA","date":"2026-03-20","fav":"UConn","fav_seed":2,"dog":"Furman","dog_seed":15,"jb_fav":57.8,"jb_dog":22.9,"jb_delta":34.9,"upset_score":-10.4,"tier":"low","to_edge":-31.3,"threep_edge":8.8,"orb_edge":-20.4,"ftr_edge":8.4,"arc_edge":-28.8,"tempo_edge":13.6},{"region":"West","site":"San Diego, CA","date":"2026-03-20","fav":"Arizona","fav_seed":1,"dog":"Long Island University","dog_seed":16,"jb_fav":79.1,"jb_dog":17.0,"jb_delta":62.1,"upset_score":-15.0,"tier":"low","to_edge":-22.0,"threep_edge":5.9,"orb_edge":-16.5,"ftr_edge":-32.8,"arc_edge":-6.2,"tempo_edge":-18.2},{"region":"Midwest","site":"Tampa, FL","date":"2026-03-20","fav":"Alabama","fav_seed":4,"dog":"Hofstra","dog_seed":13,"jb_fav":74.8,"jb_dog":46.4,"jb_delta":28.4,"upset_score":-18.6,"tier":"low","to_edge":-30.0,"threep_edge":-24.0,"orb_edge":13.5,"ftr_edge":-18.8,"arc_edge":15.0,"tempo_edge":-76.4},{"region":"East","site":"San Diego, CA","date":"2026-03-20","fav":"St. John's","fav_seed":5,"dog":"Northern Iowa","dog_seed":12,"jb_fav":67.8,"jb_dog":46.2,"jb_delta":21.6,"upset_score":-23.9,"tier":"low","to_edge":-8.7,"threep_edge":18.6,"orb_edge":-60.4,"ftr_edge":-64.8,"arc_edge":30.0,"tempo_edge":-66.4},{"region":"East","site":"Greenville, SC","date":"2026-03-19","fav":"Duke","fav_seed":1,"dog":"Siena","dog_seed":16,"jb_fav":82.3,"jb_dog":19.2,"jb_delta":63.1,"upset_score":-24.3,"tier":"low","to_edge":-18.7,"threep_edge":-42.0,"orb_edge":-27.0,"ftr_edge":-14.4,"arc_edge":-30.0,"tempo_edge":-6.4}];


// ── Team data (pre-scored from KenPom + EvanMiya) ─────────────────────────────
const TEAM_DATA = {"teams":[{"id":"duke","name":"Duke","seed":1,"region":"East","record":"32-2","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":6.1,"free_throw_gen":6.6,"off_efficiency":8.8,"ball_security":5.4,"off_rebounding":7.3,"def_efficiency":10.0,"opp_3pt_allowed":8.2,"rim_protection":4.4,"pressure_defense":6.5,"experience":1.6,"pace_label":"Slow","pace_raw":65.3,"avg_height":79.3,"barthag":0.981,"rr":34.8,"em_rank":"1","kenpom_rank":1},{"id":"uconn","name":"UConn","seed":2,"region":"East","record":"29-5","is_ff":false,"archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":5.4,"free_throw_gen":3.0,"off_efficiency":6.7,"ball_security":4.0,"off_rebounding":6.3,"def_efficiency":8.4,"opp_3pt_allowed":8.3,"rim_protection":8.2,"pressure_defense":5.4,"experience":8.6,"pace_label":"Slow","pace_raw":64.4,"avg_height":78.6,"barthag":0.965,"rr":30.5,"em_rank":"8","kenpom_rank":11},{"id":"michigan_state","name":"Michigan State","seed":3,"region":"East","record":"25-7","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":5.1,"free_throw_gen":5.9,"off_efficiency":7.0,"ball_security":3.6,"off_rebounding":7.4,"def_efficiency":8.2,"opp_3pt_allowed":5.3,"rim_protection":6.7,"pressure_defense":2.9,"experience":4.0,"pace_label":"Slow","pace_raw":66.0,"avg_height":78.7,"barthag":0.944,"rr":24.6,"em_rank":"12","kenpom_rank":9},{"id":"kansas","name":"Kansas","seed":4,"region":"East","record":"23-10","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":4.5,"free_throw_gen":4.2,"off_efficiency":5.4,"ball_security":5.7,"off_rebounding":3.9,"def_efficiency":8.4,"opp_3pt_allowed":7.9,"rim_protection":8.5,"pressure_defense":3.2,"experience":5.6,"pace_label":"Moderate","pace_raw":67.6,"avg_height":78.7,"barthag":0.928,"rr":21.9,"em_rank":"19","kenpom_rank":21},{"id":"st_johns","name":"St. John's","seed":5,"region":"East","record":"28-6","is_ff":false,"archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":3.4,"free_throw_gen":8.5,"off_efficiency":6.0,"ball_security":6.8,"off_rebounding":6.4,"def_efficiency":8.3,"opp_3pt_allowed":7.2,"rim_protection":6.0,"pressure_defense":6.1,"experience":7.9,"pace_label":"Moderate","pace_raw":69.6,"avg_height":78.2,"barthag":0.942,"rr":25.5,"em_rank":"11","kenpom_rank":17},{"id":"louisville","name":"Louisville","seed":6,"region":"East","record":"23-10","is_ff":false,"archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":7.7,"free_throw_gen":4.6,"off_efficiency":7.4,"ball_security":4.5,"off_rebounding":5.2,"def_efficiency":6.9,"opp_3pt_allowed":5.5,"rim_protection":3.5,"pressure_defense":4.8,"experience":8.9,"pace_label":"Moderate","pace_raw":69.6,"avg_height":78.4,"barthag":0.936,"rr":21.8,"em_rank":"20","kenpom_rank":19},{"id":"ucla","name":"UCLA","seed":7,"region":"East","record":"23-11","is_ff":false,"archetype":"offensive_engine","is_veteran":true,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":4.4,"off_efficiency":7.3,"ball_security":8.5,"off_rebounding":4.5,"def_efficiency":5.8,"opp_3pt_allowed":6.6,"rim_protection":3.7,"pressure_defense":5.0,"experience":9.1,"pace_label":"Slow","pace_raw":64.6,"avg_height":78.0,"barthag":0.911,"rr":20.3,"em_rank":"24","kenpom_rank":27},{"id":"ohio_state","name":"Ohio State","seed":8,"region":"East","record":"21-12","is_ff":false,"archetype":"offensive_engine","is_veteran":true,"is_length":false,"three_pt_prowess":5.7,"free_throw_gen":6.6,"off_efficiency":7.5,"ball_security":5.7,"off_rebounding":4.4,"def_efficiency":5.8,"opp_3pt_allowed":6.8,"rim_protection":1.6,"pressure_defense":2.4,"experience":7.5,"pace_label":"Slow","pace_raw":66.1,"avg_height":77.9,"barthag":0.917,"rr":21.2,"em_rank":"22","kenpom_rank":26},{"id":"tcu","name":"TCU","seed":9,"region":"East","record":"22-11","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":3.9,"free_throw_gen":7.0,"off_efficiency":4.4,"ball_security":5.7,"off_rebounding":5.8,"def_efficiency":7.2,"opp_3pt_allowed":4.3,"rim_protection":6.2,"pressure_defense":5.9,"experience":5.7,"pace_label":"Moderate","pace_raw":67.7,"avg_height":76.4,"barthag":0.837,"rr":16.0,"em_rank":"43","kenpom_rank":43},{"id":"ucf","name":"UCF","seed":10,"region":"East","record":"21-11","is_ff":false,"archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":4.8,"free_throw_gen":3.4,"off_efficiency":6.2,"ball_security":5.4,"off_rebounding":5.8,"def_efficiency":4.8,"opp_3pt_allowed":4.0,"rim_protection":2.8,"pressure_defense":3.1,"experience":8.3,"pace_label":"Moderate","pace_raw":69.2,"avg_height":78.6,"barthag":0.812,"rr":11.3,"em_rank":"61","kenpom_rank":54},{"id":"south_florida","name":"South Florida","seed":11,"region":"East","record":"25-8","is_ff":false,"archetype":"foul_line_bully","is_veteran":false,"is_length":false,"three_pt_prowess":5.0,"free_throw_gen":8.1,"off_efficiency":5.1,"ball_security":6.1,"off_rebounding":7.3,"def_efficiency":6.2,"opp_3pt_allowed":4.1,"rim_protection":4.8,"pressure_defense":6.8,"experience":4.7,"pace_label":"Fast","pace_raw":71.5,"avg_height":77.1,"barthag":0.836,"rr":15.8,"em_rank":"44","kenpom_rank":47},{"id":"northern_iowa","name":"Northern Iowa","seed":12,"region":"East","record":"23-12","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":5.2,"free_throw_gen":1.0,"off_efficiency":2.5,"ball_security":6.9,"off_rebounding":1.0,"def_efficiency":7.1,"opp_3pt_allowed":10.0,"rim_protection":4.0,"pressure_defense":4.8,"experience":6.5,"pace_label":"Slow","pace_raw":62.3,"avg_height":77.6,"barthag":0.774,"rr":10.6,"em_rank":"67","kenpom_rank":72},{"id":"cal_baptist","name":"Cal Baptist","seed":13,"region":"East","record":"25-8","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.3,"free_throw_gen":5.8,"off_efficiency":1.8,"ball_security":2.2,"off_rebounding":7.2,"def_efficiency":5.9,"opp_3pt_allowed":9.1,"rim_protection":2.2,"pressure_defense":3.2,"experience":4.0,"pace_label":"Slow","pace_raw":65.8,"avg_height":76.5,"barthag":0.689,"rr":3.7,"em_rank":"118","kenpom_rank":106},{"id":"north_dakota_state","name":"North Dakota State","seed":14,"region":"East","record":"27-7","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":3.3,"off_efficiency":3.1,"ball_security":5.6,"off_rebounding":5.5,"def_efficiency":4.4,"opp_3pt_allowed":4.6,"rim_protection":3.3,"pressure_defense":6.2,"experience":3.7,"pace_label":"Slow","pace_raw":66.3,"avg_height":76.2,"barthag":0.904,"rr":14.7,"em_rank":"48","kenpom_rank":113},{"id":"furman","name":"Furman","seed":15,"region":"East","record":"22-12","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":true,"three_pt_prowess":5.5,"free_throw_gen":4.0,"off_efficiency":1.7,"ball_security":2.6,"off_rebounding":4.5,"def_efficiency":3.5,"opp_3pt_allowed":5.6,"rim_protection":3.7,"pressure_defense":1.9,"experience":3.0,"pace_label":"Slow","pace_raw":65.9,"avg_height":79.2,"barthag":0.444,"rr":0.9,"em_rank":"153","kenpom_rank":191},{"id":"siena","name":"Siena","seed":16,"region":"East","record":"23-11","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":1.9,"free_throw_gen":4.9,"off_efficiency":1.5,"ball_security":5.0,"off_rebounding":4.9,"def_efficiency":3.6,"opp_3pt_allowed":5.4,"rim_protection":3.4,"pressure_defense":4.2,"experience":2.9,"pace_label":"Slow","pace_raw":64.6,"avg_height":76.7,"barthag":0.455,"rr":-0.1,"em_rank":"166","kenpom_rank":192},{"id":"florida","name":"Florida","seed":1,"region":"South","record":"26-7","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":2.9,"free_throw_gen":7.2,"off_efficiency":7.9,"ball_security":4.4,"off_rebounding":9.2,"def_efficiency":9.1,"opp_3pt_allowed":5.9,"rim_protection":6.0,"pressure_defense":4.3,"experience":6.5,"pace_label":"Fast","pace_raw":70.5,"avg_height":78.9,"barthag":0.973,"rr":31.4,"em_rank":"4","kenpom_rank":4},{"id":"houston","name":"Houston","seed":2,"region":"South","record":"28-6","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":false,"three_pt_prowess":5.3,"free_throw_gen":1.6,"off_efficiency":7.7,"ball_security":9.1,"off_rebounding":6.4,"def_efficiency":9.2,"opp_3pt_allowed":6.2,"rim_protection":6.0,"pressure_defense":6.8,"experience":5.9,"pace_label":"Slow","pace_raw":63.3,"avg_height":77.8,"barthag":0.97,"rr":31.0,"em_rank":"5","kenpom_rank":5},{"id":"illinois","name":"Illinois","seed":3,"region":"South","record":"24-8","is_ff":false,"archetype":"offensive_juggernaut","is_veteran":false,"is_length":true,"three_pt_prowess":6.9,"free_throw_gen":4.3,"off_efficiency":9.9,"ball_security":8.8,"off_rebounding":7.5,"def_efficiency":6.8,"opp_3pt_allowed":7.0,"rim_protection":6.2,"pressure_defense":1.0,"experience":5.0,"pace_label":"Slow","pace_raw":65.5,"avg_height":80.0,"barthag":0.968,"rr":28.9,"em_rank":"9","kenpom_rank":7},{"id":"nebraska","name":"Nebraska","seed":4,"region":"South","record":"26-6","is_ff":false,"archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":7.2,"free_throw_gen":1.7,"off_efficiency":5.5,"ball_security":7.2,"off_rebounding":2.7,"def_efficiency":8.9,"opp_3pt_allowed":8.8,"rim_protection":3.1,"pressure_defense":5.7,"experience":8.4,"pace_label":"Slow","pace_raw":66.7,"avg_height":77.8,"barthag":0.931,"rr":22.3,"em_rank":"18","kenpom_rank":14},{"id":"vanderbilt","name":"Vanderbilt","seed":5,"region":"South","record":"26-8","is_ff":false,"archetype":"offensive_juggernaut","is_veteran":true,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":6.8,"off_efficiency":8.3,"ball_security":8.7,"off_rebounding":4.6,"def_efficiency":6.7,"opp_3pt_allowed":6.1,"rim_protection":6.2,"pressure_defense":6.4,"experience":8.8,"pace_label":"Moderate","pace_raw":68.8,"avg_height":77.2,"barthag":0.946,"rr":24.0,"em_rank":"14","kenpom_rank":12},{"id":"north_carolina","name":"North Carolina","seed":6,"region":"South","record":"24-8","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":true,"three_pt_prowess":5.5,"free_throw_gen":6.4,"off_efficiency":6.5,"ball_security":7.7,"off_rebounding":4.7,"def_efficiency":6.3,"opp_3pt_allowed":3.4,"rim_protection":3.0,"pressure_defense":3.0,"experience":3.5,"pace_label":"Moderate","pace_raw":67.9,"avg_height":79.2,"barthag":0.904,"rr":14.7,"em_rank":"48","kenpom_rank":29},{"id":"saint_marys","name":"Saint Mary's","seed":7,"region":"South","record":"27-5","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":6.2,"free_throw_gen":5.7,"off_efficiency":6.1,"ball_security":4.4,"off_rebounding":7.0,"def_efficiency":7.4,"opp_3pt_allowed":7.2,"rim_protection":3.9,"pressure_defense":3.5,"experience":1.0,"pace_label":"Slow","pace_raw":65.2,"avg_height":78.9,"barthag":0.911,"rr":20.4,"em_rank":"23","kenpom_rank":24},{"id":"clemson","name":"Clemson","seed":8,"region":"South","record":"24-10","is_ff":false,"archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":5.3,"free_throw_gen":6.3,"off_efficiency":4.8,"ball_security":7.4,"off_rebounding":3.4,"def_efficiency":7.4,"opp_3pt_allowed":5.6,"rim_protection":3.4,"pressure_defense":4.6,"experience":8.3,"pace_label":"Slow","pace_raw":64.2,"avg_height":77.8,"barthag":0.892,"rr":16.6,"em_rank":"38","kenpom_rank":36},{"id":"iowa","name":"Iowa","seed":9,"region":"South","record":"21-12","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":5.8,"free_throw_gen":5.1,"off_efficiency":6.6,"ball_security":6.1,"off_rebounding":4.2,"def_efficiency":6.7,"opp_3pt_allowed":4.4,"rim_protection":1.5,"pressure_defense":6.2,"experience":4.2,"pace_label":"Slow","pace_raw":63.0,"avg_height":78.5,"barthag":0.907,"rr":20.1,"em_rank":"26","kenpom_rank":25},{"id":"texas_am","name":"Texas A&M","seed":10,"region":"South","record":"21-11","is_ff":false,"archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":6.4,"off_efficiency":5.9,"ball_security":6.9,"off_rebounding":5.0,"def_efficiency":6.2,"opp_3pt_allowed":6.7,"rim_protection":3.3,"pressure_defense":5.9,"experience":9.5,"pace_label":"Fast","pace_raw":70.5,"avg_height":77.2,"barthag":0.872,"rr":16.4,"em_rank":"41","kenpom_rank":39},{"id":"vcu","name":"VCU","seed":11,"region":"South","record":"27-7","is_ff":false,"archetype":"gunslinger","is_veteran":false,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":9.4,"off_efficiency":6.0,"ball_security":6.1,"off_rebounding":5.0,"def_efficiency":5.6,"opp_3pt_allowed":5.0,"rim_protection":5.1,"pressure_defense":5.6,"experience":5.0,"pace_label":"Moderate","pace_raw":68.5,"avg_height":77.8,"barthag":0.843,"rr":16.1,"em_rank":"42","kenpom_rank":45},{"id":"mcneese","name":"McNeese","seed":12,"region":"South","record":"28-5","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.0,"free_throw_gen":6.8,"off_efficiency":4.0,"ball_security":7.3,"off_rebounding":6.1,"def_efficiency":5.9,"opp_3pt_allowed":5.7,"rim_protection":8.7,"pressure_defense":10.0,"experience":6.2,"pace_label":"Slow","pace_raw":66.2,"avg_height":77.1,"barthag":0.765,"rr":10.7,"em_rank":"65","kenpom_rank":68},{"id":"troy","name":"Troy","seed":13,"region":"South","record":"22-11","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.4,"free_throw_gen":5.9,"off_efficiency":2.8,"ball_security":3.7,"off_rebounding":6.0,"def_efficiency":3.6,"opp_3pt_allowed":7.2,"rim_protection":3.4,"pressure_defense":5.5,"experience":3.5,"pace_label":"Slow","pace_raw":64.9,"avg_height":77.4,"barthag":0.543,"rr":4.5,"em_rank":"109","kenpom_rank":143},{"id":"penn","name":"Penn","seed":14,"region":"South","record":"18-11","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.1,"free_throw_gen":5.4,"off_efficiency":1.6,"ball_security":5.8,"off_rebounding":4.2,"def_efficiency":4.6,"opp_3pt_allowed":6.7,"rim_protection":3.0,"pressure_defense":4.6,"experience":3.2,"pace_label":"Moderate","pace_raw":69.0,"avg_height":77.8,"barthag":0.532,"rr":0.9,"em_rank":"152","kenpom_rank":150},{"id":"idaho","name":"Idaho","seed":15,"region":"South","record":"21-14","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.2,"free_throw_gen":5.2,"off_efficiency":2.1,"ball_security":6.4,"off_rebounding":3.7,"def_efficiency":4.2,"opp_3pt_allowed":3.0,"rim_protection":1.2,"pressure_defense":3.3,"experience":4.8,"pace_label":"Moderate","pace_raw":67.7,"avg_height":77.2,"barthag":0.57,"rr":0.1,"em_rank":"163","kenpom_rank":145},{"id":"prairie_view_am","name":"Prairie View A&M","seed":16,"region":"South","record":"18-17","is_ff":true,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":null,"free_throw_gen":null,"off_efficiency":null,"ball_security":null,"off_rebounding":null,"def_efficiency":null,"opp_3pt_allowed":null,"rim_protection":null,"pressure_defense":null,"experience":null,"pace_label":"Slow","pace_raw":null,"avg_height":null,"barthag":0.255,"rr":-9.8,"em_rank":"288","kenpom_rank":999},{"id":"lehigh","name":"Lehigh","seed":16,"region":"South","record":"18-16","is_ff":true,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":null,"free_throw_gen":null,"off_efficiency":null,"ball_security":null,"off_rebounding":null,"def_efficiency":null,"opp_3pt_allowed":null,"rim_protection":null,"pressure_defense":null,"experience":null,"pace_label":"Slow","pace_raw":null,"avg_height":null,"barthag":0.252,"rr":-8.5,"em_rank":"275","kenpom_rank":999},{"id":"arizona","name":"Arizona","seed":1,"region":"West","record":"32-2","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":3.5,"free_throw_gen":9.0,"off_efficiency":8.7,"ball_security":6.1,"off_rebounding":7.3,"def_efficiency":9.7,"opp_3pt_allowed":7.0,"rim_protection":4.8,"pressure_defense":5.9,"experience":4.8,"pace_label":"Moderate","pace_raw":69.8,"avg_height":79.0,"barthag":0.978,"rr":32.0,"em_rank":"3","kenpom_rank":2},{"id":"purdue","name":"Purdue","seed":2,"region":"West","record":"27-8","is_ff":false,"archetype":"offensive_juggernaut","is_veteran":true,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":2.3,"off_efficiency":10.0,"ball_security":8.4,"off_rebounding":6.6,"def_efficiency":6.4,"opp_3pt_allowed":3.7,"rim_protection":3.3,"pressure_defense":3.7,"experience":9.0,"pace_label":"Slow","pace_raw":64.4,"avg_height":77.8,"barthag":0.964,"rr":30.3,"em_rank":"6","kenpom_rank":8},{"id":"gonzaga","name":"Gonzaga","seed":3,"region":"West","record":"30-3","is_ff":false,"archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":3.3,"free_throw_gen":3.5,"off_efficiency":6.7,"ball_security":8.1,"off_rebounding":6.0,"def_efficiency":8.4,"opp_3pt_allowed":7.7,"rim_protection":5.2,"pressure_defense":6.9,"experience":10.0,"pace_label":"Moderate","pace_raw":68.6,"avg_height":78.0,"barthag":0.95,"rr":27.7,"em_rank":"10","kenpom_rank":10},{"id":"arkansas","name":"Arkansas","seed":4,"region":"West","record":"26-8","is_ff":false,"archetype":"offensive_juggernaut","is_veteran":false,"is_length":false,"three_pt_prowess":5.9,"free_throw_gen":6.0,"off_efficiency":8.7,"ball_security":10.0,"off_rebounding":5.0,"def_efficiency":6.0,"opp_3pt_allowed":6.7,"rim_protection":6.4,"pressure_defense":5.0,"experience":4.9,"pace_label":"Fast","pace_raw":71.0,"avg_height":78.5,"barthag":0.936,"rr":23.8,"em_rank":"15","kenpom_rank":15},{"id":"wisconsin","name":"Wisconsin","seed":5,"region":"West","record":"24-10","is_ff":false,"archetype":"sniper_system","is_veteran":true,"is_length":true,"three_pt_prowess":7.8,"free_throw_gen":3.9,"off_efficiency":7.8,"ball_security":9.3,"off_rebounding":3.9,"def_efficiency":5.9,"opp_3pt_allowed":4.8,"rim_protection":3.0,"pressure_defense":3.3,"experience":8.3,"pace_label":"Moderate","pace_raw":68.7,"avg_height":78.8,"barthag":0.929,"rr":21.7,"em_rank":"21","kenpom_rank":22},{"id":"byu","name":"BYU","seed":6,"region":"West","record":"23-11","is_ff":false,"archetype":"offensive_engine","is_veteran":false,"is_length":false,"three_pt_prowess":5.2,"free_throw_gen":4.9,"off_efficiency":7.9,"ball_security":6.0,"off_rebounding":5.9,"def_efficiency":5.8,"opp_3pt_allowed":2.4,"rim_protection":5.6,"pressure_defense":5.3,"experience":5.0,"pace_label":"Moderate","pace_raw":69.9,"avg_height":78.3,"barthag":0.889,"rr":16.5,"em_rank":"39","kenpom_rank":23},{"id":"miami_fl","name":"Miami (FL)","seed":7,"region":"West","record":"25-8","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.7,"free_throw_gen":6.5,"off_efficiency":6.5,"ball_security":4.8,"off_rebounding":6.8,"def_efficiency":6.3,"opp_3pt_allowed":2.3,"rim_protection":4.1,"pressure_defense":6.4,"experience":5.6,"pace_label":"Moderate","pace_raw":67.6,"avg_height":78.4,"barthag":0.887,"rr":18.6,"em_rank":"28","kenpom_rank":31},{"id":"villanova","name":"Villanova","seed":8,"region":"West","record":"24-8","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.3,"free_throw_gen":3.6,"off_efficiency":6.1,"ball_security":6.2,"off_rebounding":5.1,"def_efficiency":6.4,"opp_3pt_allowed":4.1,"rim_protection":1.0,"pressure_defense":6.1,"experience":6.1,"pace_label":"Slow","pace_raw":65.2,"avg_height":77.6,"barthag":0.88,"rr":15.0,"em_rank":"47","kenpom_rank":33},{"id":"utah_state","name":"Utah State","seed":9,"region":"West","record":"28-6","is_ff":false,"archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":7.0,"off_efficiency":6.7,"ball_security":5.8,"off_rebounding":5.3,"def_efficiency":6.0,"opp_3pt_allowed":4.1,"rim_protection":3.2,"pressure_defense":7.5,"experience":8.7,"pace_label":"Moderate","pace_raw":67.7,"avg_height":77.7,"barthag":0.895,"rr":17.6,"em_rank":"32","kenpom_rank":30},{"id":"missouri","name":"Missouri","seed":10,"region":"West","record":"20-12","is_ff":false,"archetype":"foul_line_bully","is_veteran":true,"is_length":true,"three_pt_prowess":4.6,"free_throw_gen":8.8,"off_efficiency":5.8,"ball_security":2.3,"off_rebounding":6.3,"def_efficiency":5.2,"opp_3pt_allowed":1.0,"rim_protection":4.4,"pressure_defense":4.8,"experience":7.6,"pace_label":"Slow","pace_raw":66.2,"avg_height":79.3,"barthag":0.851,"rr":14.4,"em_rank":"49","kenpom_rank":52},{"id":"texas","name":"Texas","seed":11,"region":"West","record":"18-14","is_ff":true,"archetype":"foul_line_bully","is_veteran":true,"is_length":false,"three_pt_prowess":4.5,"free_throw_gen":10.0,"off_efficiency":7.7,"ball_security":6.0,"off_rebounding":6.3,"def_efficiency":4.6,"opp_3pt_allowed":1.6,"rim_protection":2.1,"pressure_defense":3.3,"experience":10.0,"pace_label":"Slow","pace_raw":66.9,"avg_height":78.1,"barthag":0.854,"rr":17.1,"em_rank":"34","kenpom_rank":37},{"id":"nc_state","name":"NC State","seed":11,"region":"West","record":"20-13","is_ff":true,"archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":7.6,"free_throw_gen":5.4,"off_efficiency":7.4,"ball_security":8.9,"off_rebounding":3.5,"def_efficiency":5.1,"opp_3pt_allowed":2.1,"rim_protection":4.6,"pressure_defense":6.5,"experience":7.6,"pace_label":"Moderate","pace_raw":69.1,"avg_height":77.9,"barthag":0.876,"rr":16.5,"em_rank":"40","kenpom_rank":34},{"id":"high_point","name":"High Point","seed":12,"region":"West","record":"30-4","is_ff":false,"archetype":"foul_line_bully","is_veteran":true,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":9.0,"off_efficiency":4.9,"ball_security":9.1,"off_rebounding":4.9,"def_efficiency":3.7,"opp_3pt_allowed":6.4,"rim_protection":4.9,"pressure_defense":9.3,"experience":7.8,"pace_label":"Moderate","pace_raw":69.9,"avg_height":76.3,"barthag":0.699,"rr":8.6,"em_rank":"79","kenpom_rank":92},{"id":"hawaii","name":"Hawai'i","seed":13,"region":"West","record":"24-8","is_ff":false,"archetype":"foul_line_bully","is_veteran":false,"is_length":true,"three_pt_prowess":3.7,"free_throw_gen":8.7,"off_efficiency":1.5,"ball_security":1.1,"off_rebounding":4.7,"def_efficiency":6.1,"opp_3pt_allowed":7.9,"rim_protection":4.1,"pressure_defense":4.2,"experience":5.6,"pace_label":"Moderate","pace_raw":69.7,"avg_height":78.7,"barthag":0.635,"rr":3.3,"em_rank":"120","kenpom_rank":108},{"id":"kennesaw_state","name":"Kennesaw State","seed":14,"region":"West","record":"21-13","is_ff":false,"archetype":"foul_line_bully","is_veteran":false,"is_length":false,"three_pt_prowess":5.2,"free_throw_gen":10.0,"off_efficiency":2.7,"ball_security":4.1,"off_rebounding":6.3,"def_efficiency":3.3,"opp_3pt_allowed":4.1,"rim_protection":7.8,"pressure_defense":4.4,"experience":3.2,"pace_label":"Fast","pace_raw":71.2,"avg_height":78.3,"barthag":0.534,"rr":1.0,"em_rank":"150","kenpom_rank":163},{"id":"queens","name":"Queens","seed":15,"region":"West","record":"21-13","is_ff":false,"archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":5.9,"off_efficiency":4.5,"ball_security":6.6,"off_rebounding":4.3,"def_efficiency":1.0,"opp_3pt_allowed":1.8,"rim_protection":2.6,"pressure_defense":3.4,"experience":3.6,"pace_label":"Moderate","pace_raw":69.6,"avg_height":78.3,"barthag":0.44,"rr":-2.1,"em_rank":"194","kenpom_rank":181},{"id":"long_island_university","name":"Long Island University","seed":16,"region":"West","record":"24-10","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.9,"free_throw_gen":5.2,"off_efficiency":1.0,"ball_security":1.0,"off_rebounding":5.8,"def_efficiency":3.4,"opp_3pt_allowed":6.4,"rim_protection":7.2,"pressure_defense":6.4,"experience":2.7,"pace_label":"Moderate","pace_raw":67.8,"avg_height":77.4,"barthag":0.34,"rr":-3.3,"em_rank":"207","kenpom_rank":216},{"id":"michigan","name":"Michigan","seed":1,"region":"Midwest","record":"31-3","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":6.0,"free_throw_gen":6.6,"off_efficiency":8.3,"ball_security":4.1,"off_rebounding":6.2,"def_efficiency":10.0,"opp_3pt_allowed":8.5,"rim_protection":8.7,"pressure_defense":3.2,"experience":7.2,"pace_label":"Fast","pace_raw":70.9,"avg_height":78.7,"barthag":0.98,"rr":34.5,"em_rank":"2","kenpom_rank":3},{"id":"iowa_state","name":"Iowa State","seed":2,"region":"Midwest","record":"27-7","is_ff":false,"archetype":"two_way_machine","is_veteran":true,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":4.9,"off_efficiency":7.3,"ball_security":6.2,"off_rebounding":6.2,"def_efficiency":9.2,"opp_3pt_allowed":6.2,"rim_protection":3.0,"pressure_defense":8.1,"experience":9.3,"pace_label":"Slow","pace_raw":66.5,"avg_height":78.1,"barthag":0.966,"rr":29.5,"em_rank":"7","kenpom_rank":6},{"id":"virginia","name":"Virginia","seed":3,"region":"Midwest","record":"29-5","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":4.4,"off_efficiency":6.9,"ball_security":5.0,"off_rebounding":7.2,"def_efficiency":7.8,"opp_3pt_allowed":7.6,"rim_protection":10.0,"pressure_defense":4.6,"experience":6.8,"pace_label":"Slow","pace_raw":65.7,"avg_height":78.2,"barthag":0.943,"rr":24.1,"em_rank":"13","kenpom_rank":13},{"id":"alabama","name":"Alabama","seed":4,"region":"Midwest","record":"23-9","is_ff":false,"archetype":"offensive_juggernaut","is_veteran":false,"is_length":false,"three_pt_prowess":7.9,"free_throw_gen":6.3,"off_efficiency":9.1,"ball_security":9.1,"off_rebounding":4.8,"def_efficiency":5.4,"opp_3pt_allowed":4.6,"rim_protection":5.1,"pressure_defense":3.8,"experience":6.9,"pace_label":"Fast","pace_raw":73.1,"avg_height":78.2,"barthag":0.934,"rr":23.2,"em_rank":"17","kenpom_rank":18},{"id":"texas_tech","name":"Texas Tech","seed":5,"region":"Midwest","record":"22-10","is_ff":false,"archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":8.5,"free_throw_gen":1.6,"off_efficiency":7.7,"ball_security":5.2,"off_rebounding":5.4,"def_efficiency":6.6,"opp_3pt_allowed":6.9,"rim_protection":3.7,"pressure_defense":3.7,"experience":7.2,"pace_label":"Slow","pace_raw":66.2,"avg_height":77.1,"barthag":0.944,"rr":18.3,"em_rank":"29","kenpom_rank":20},{"id":"tennessee","name":"Tennessee","seed":6,"region":"Midwest","record":"22-11","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":3.2,"free_throw_gen":7.0,"off_efficiency":6.4,"ball_security":3.6,"off_rebounding":10.0,"def_efficiency":8.1,"opp_3pt_allowed":8.0,"rim_protection":5.1,"pressure_defense":6.0,"experience":5.0,"pace_label":"Slow","pace_raw":65.0,"avg_height":78.4,"barthag":0.941,"rr":23.5,"em_rank":"16","kenpom_rank":16},{"id":"kentucky","name":"Kentucky","seed":7,"region":"Midwest","record":"21-13","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":4.7,"free_throw_gen":6.5,"off_efficiency":6.2,"ball_security":6.4,"off_rebounding":5.6,"def_efficiency":6.8,"opp_3pt_allowed":6.8,"rim_protection":5.9,"pressure_defense":5.2,"experience":4.4,"pace_label":"Moderate","pace_raw":68.3,"avg_height":78.8,"barthag":0.89,"rr":20.2,"em_rank":"25","kenpom_rank":28},{"id":"georgia","name":"Georgia","seed":8,"region":"Midwest","record":"22-10","is_ff":false,"archetype":"offensive_engine","is_veteran":false,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":6.2,"off_efficiency":7.6,"ball_security":7.3,"off_rebounding":6.1,"def_efficiency":5.1,"opp_3pt_allowed":4.3,"rim_protection":8.1,"pressure_defense":6.2,"experience":6.2,"pace_label":"Fast","pace_raw":71.4,"avg_height":77.4,"barthag":0.876,"rr":18.2,"em_rank":"30","kenpom_rank":32},{"id":"saint_louis","name":"Saint Louis","seed":9,"region":"Midwest","record":"28-5","is_ff":false,"archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":8.6,"free_throw_gen":5.2,"off_efficiency":5.8,"ball_security":3.1,"off_rebounding":4.5,"def_efficiency":6.1,"opp_3pt_allowed":8.7,"rim_protection":3.7,"pressure_defense":4.9,"experience":8.0,"pace_label":"Fast","pace_raw":71.0,"avg_height":77.5,"barthag":0.873,"rr":17.7,"em_rank":"31","kenpom_rank":41},{"id":"santa_clara","name":"Santa Clara","seed":10,"region":"Midwest","record":"26-8","is_ff":false,"archetype":"offensive_engine","is_veteran":false,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":1.0,"off_efficiency":7.2,"ball_security":5.6,"off_rebounding":6.7,"def_efficiency":5.1,"opp_3pt_allowed":5.1,"rim_protection":4.5,"pressure_defense":7.5,"experience":1.8,"pace_label":"Moderate","pace_raw":69.2,"avg_height":78.5,"barthag":0.895,"rr":16.9,"em_rank":"36","kenpom_rank":35},{"id":"miami_ohio","name":"Miami (Ohio)","seed":11,"region":"Midwest","record":"31-1","is_ff":true,"archetype":"gunslinger","is_veteran":false,"is_length":false,"three_pt_prowess":7.2,"free_throw_gen":7.7,"off_efficiency":4.9,"ball_security":7.0,"off_rebounding":2.3,"def_efficiency":3.8,"opp_3pt_allowed":5.1,"rim_protection":2.6,"pressure_defense":4.8,"experience":6.5,"pace_label":"Moderate","pace_raw":69.9,"avg_height":77.5,"barthag":0.718,"rr":8.1,"em_rank":"84","kenpom_rank":93},{"id":"smu","name":"SMU","seed":11,"region":"Midwest","record":"20-13","is_ff":true,"archetype":"offensive_engine","is_veteran":true,"is_length":false,"three_pt_prowess":5.7,"free_throw_gen":3.3,"off_efficiency":7.0,"ball_security":5.2,"off_rebounding":6.2,"def_efficiency":5.0,"opp_3pt_allowed":4.1,"rim_protection":5.1,"pressure_defense":5.1,"experience":10.0,"pace_label":"Moderate","pace_raw":68.5,"avg_height":78.0,"barthag":0.861,"rr":16.6,"em_rank":"37","kenpom_rank":42},{"id":"akron","name":"Akron","seed":12,"region":"Midwest","record":"29-5","is_ff":false,"archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":7.6,"free_throw_gen":2.6,"off_efficiency":5.6,"ball_security":5.7,"off_rebounding":5.5,"def_efficiency":4.6,"opp_3pt_allowed":2.7,"rim_protection":2.9,"pressure_defense":5.3,"experience":5.2,"pace_label":"Fast","pace_raw":70.3,"avg_height":75.9,"barthag":0.773,"rr":11.2,"em_rank":"62","kenpom_rank":64},{"id":"hofstra","name":"Hofstra","seed":13,"region":"Midwest","record":"24-10","is_ff":false,"archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":6.6,"free_throw_gen":4.2,"off_efficiency":4.1,"ball_security":4.8,"off_rebounding":6.0,"def_efficiency":4.9,"opp_3pt_allowed":6.0,"rim_protection":4.4,"pressure_defense":2.6,"experience":4.6,"pace_label":"Slow","pace_raw":64.7,"avg_height":77.4,"barthag":0.705,"rr":10.0,"em_rank":"74","kenpom_rank":87},{"id":"wright_state","name":"Wright State","seed":14,"region":"Midwest","record":"23-11","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":4.7,"free_throw_gen":6.7,"off_efficiency":3.2,"ball_security":4.6,"off_rebounding":5.4,"def_efficiency":3.3,"opp_3pt_allowed":4.4,"rim_protection":5.2,"pressure_defense":5.3,"experience":3.1,"pace_label":"Moderate","pace_raw":67.2,"avg_height":77.0,"barthag":0.586,"rr":1.3,"em_rank":"148","kenpom_rank":140},{"id":"tennessee_state","name":"Tennessee State","seed":15,"region":"Midwest","record":"23-9","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.1,"free_throw_gen":4.6,"off_efficiency":2.2,"ball_security":4.4,"off_rebounding":6.0,"def_efficiency":3.0,"opp_3pt_allowed":4.6,"rim_protection":4.2,"pressure_defense":7.6,"experience":5.3,"pace_label":"Fast","pace_raw":70.2,"avg_height":77.0,"barthag":0.395,"rr":0.4,"em_rank":"160","kenpom_rank":187},{"id":"howard","name":"Howard","seed":16,"region":"Midwest","record":"23-10","is_ff":true,"archetype":"foul_line_bully","is_veteran":false,"is_length":false,"three_pt_prowess":4.2,"free_throw_gen":9.6,"off_efficiency":1.0,"ball_security":1.0,"off_rebounding":6.7,"def_efficiency":4.5,"opp_3pt_allowed":8.2,"rim_protection":4.6,"pressure_defense":7.3,"experience":3.7,"pace_label":"Moderate","pace_raw":69.0,"avg_height":76.2,"barthag":0.425,"rr":-1.1,"em_rank":"181","kenpom_rank":207},{"id":"umbc","name":"UMBC","seed":16,"region":"Midwest","record":"24-8","is_ff":true,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":4.8,"off_efficiency":1.9,"ball_security":7.6,"off_rebounding":2.2,"def_efficiency":3.3,"opp_3pt_allowed":6.1,"rim_protection":1.4,"pressure_defense":2.5,"experience":3.0,"pace_label":"Slow","pace_raw":66.2,"avg_height":77.2,"barthag":0.456,"rr":-0.1,"em_rank":"165","kenpom_rank":185}],"archetypes":[{"id":"two_way_machine","name":"Two-Way Machine","color":"#1a6b3a","description":"Elite on both ends. No glaring weakness. Blue-blood tournament profile.","weights":{"off_efficiency":2.5,"def_efficiency":2.5,"ball_security":0.5,"rim_protection":0.5},"thresholds":{"off_efficiency":7.0,"def_efficiency":7.0}},{"id":"offensive_juggernaut","name":"Offensive Juggernaut","color":"#c2410c","description":"Historically elite offense scoring from everywhere. Defense is secondary.","weights":{"off_efficiency":4.0,"three_pt_prowess":1.0,"free_throw_gen":1.0,"ball_security":0.5},"thresholds":{"off_efficiency":8.0},"anti_thresholds":{"def_efficiency":7.0}},{"id":"defensive_fortress","name":"Defensive Fortress","color":"#0d3b6e","description":"Suffocating defense with rim protection and arc lockdown. Every game is a grind.","weights":{"def_efficiency":3.0,"rim_protection":1.5,"opp_3pt_allowed":1.0,"pressure_defense":1.0,"off_efficiency":0.5},"thresholds":{"def_efficiency":6.5},"anti_thresholds":{"off_efficiency":7.0}},{"id":"gunslinger","name":"Gunslinger","color":"#7c3aed","description":"High 3-point volume AND gets to the line relentlessly. Forces impossible defensive choices.","weights":{"three_pt_prowess":2.5,"free_throw_gen":2.5,"off_efficiency":1.0,"ball_security":0.5},"thresholds":{"three_pt_prowess":6.0,"free_throw_gen":7.0}},{"id":"sniper_system","name":"Sniper System","color":"#0891b2","description":"Lives and dies by the 3. High volume and efficiency from deep.","weights":{"three_pt_prowess":4.0,"off_efficiency":1.0,"ball_security":0.5},"thresholds":{"three_pt_prowess":6.5},"anti_thresholds":{"free_throw_gen":7.0}},{"id":"offensive_engine","name":"Offensive Engine","color":"#b45309","description":"Efficient offense without a dominant identity. Scores well but defense is a question mark.","weights":{"off_efficiency":3.0,"three_pt_prowess":1.0,"ball_security":1.0,"free_throw_gen":0.5},"thresholds":{"off_efficiency":7.0},"anti_thresholds":{"def_efficiency":7.0}},{"id":"foul_line_bully","name":"Foul-Line Bully","color":"#9f1239","description":"Gets to the line relentlessly. Physical, paint-dominant, aggressive style.","weights":{"free_throw_gen":3.5,"off_rebounding":1.5,"off_efficiency":1.0,"rim_protection":0.5},"thresholds":{"free_throw_gen":7.5},"anti_thresholds":{"def_efficiency":7.0,"three_pt_prowess":6.5}},{"id":"system_operator","name":"System Operator","color":"#475569","description":"Wins through execution \u2014 low turnovers, disciplined half-court, hard to put away.","weights":{"ball_security":2.0,"off_efficiency":1.5,"def_efficiency":1.0,"three_pt_prowess":0.5},"thresholds":{}}]};

// ── Matchup data (bracket structure + team profiles) ──────────────────────────
const MATCHUP_DATA = [{"round":"First Four","region":"Midwest","date":"2026-03-17","time":"18:40","site":"Dayton, OH","is_ff":true,"team1_name":"UMBC","team2_name":"Howard","team1":{"id":"umbc","name":"UMBC","seed":16,"region":"Midwest","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":4.8,"off_efficiency":1.9,"ball_security":7.6,"off_rebounding":2.2,"def_efficiency":3.3,"opp_3pt_allowed":6.1,"rim_protection":1.4,"pressure_defense":2.5,"experience":3.0,"pace_label":"Slow","avg_height":77.2,"barthag":0.456,"rr":-0.1,"em_rank":"165","kenpom_rank":185},"team2":{"id":"howard","name":"Howard","seed":16,"region":"Midwest","archetype":"foul_line_bully","is_veteran":false,"is_length":false,"three_pt_prowess":4.2,"free_throw_gen":9.6,"off_efficiency":1.0,"ball_security":1.0,"off_rebounding":6.7,"def_efficiency":4.5,"opp_3pt_allowed":8.2,"rim_protection":4.6,"pressure_defense":7.3,"experience":3.7,"pace_label":"Moderate","avg_height":76.2,"barthag":0.425,"rr":-1.1,"em_rank":"181","kenpom_rank":207}},{"round":"First Four","region":"West","date":"2026-03-17","time":"21:15","site":"Dayton, OH","is_ff":true,"team1_name":"Texas","team2_name":"NC State","team1":{"id":"texas","name":"Texas","seed":11,"region":"West","archetype":"foul_line_bully","is_veteran":true,"is_length":false,"three_pt_prowess":4.5,"free_throw_gen":10.0,"off_efficiency":7.7,"ball_security":6.0,"off_rebounding":6.3,"def_efficiency":4.6,"opp_3pt_allowed":1.6,"rim_protection":2.1,"pressure_defense":3.3,"experience":10.0,"pace_label":"Slow","avg_height":78.1,"barthag":0.854,"rr":17.1,"em_rank":"34","kenpom_rank":37},"team2":{"id":"nc_state","name":"NC State","seed":11,"region":"West","archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":7.6,"free_throw_gen":5.4,"off_efficiency":7.4,"ball_security":8.9,"off_rebounding":3.5,"def_efficiency":5.1,"opp_3pt_allowed":2.1,"rim_protection":4.6,"pressure_defense":6.5,"experience":7.6,"pace_label":"Moderate","avg_height":77.9,"barthag":0.876,"rr":16.5,"em_rank":"40","kenpom_rank":34}},{"round":"First Four","region":"South","date":"2026-03-18","time":"18:40","site":"Dayton, OH","is_ff":true,"team1_name":"Prairie View A&M","team2_name":"Lehigh","team1":{"id":"prairie_view_am","name":"Prairie View A&M","seed":16,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":null,"free_throw_gen":null,"off_efficiency":null,"ball_security":null,"off_rebounding":null,"def_efficiency":null,"opp_3pt_allowed":null,"rim_protection":null,"pressure_defense":null,"experience":null,"pace_label":"Slow","avg_height":null,"barthag":0.255,"rr":-9.8,"em_rank":"288","kenpom_rank":999},"team2":{"id":"lehigh","name":"Lehigh","seed":16,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":null,"free_throw_gen":null,"off_efficiency":null,"ball_security":null,"off_rebounding":null,"def_efficiency":null,"opp_3pt_allowed":null,"rim_protection":null,"pressure_defense":null,"experience":null,"pace_label":"Slow","avg_height":null,"barthag":0.252,"rr":-8.5,"em_rank":"275","kenpom_rank":999}},{"round":"First Four","region":"Midwest","date":"2026-03-18","time":"21:15","site":"Dayton, OH","is_ff":true,"team1_name":"Miami (Ohio)","team2_name":"SMU","team1":{"id":"miami_ohio","name":"Miami (Ohio)","seed":11,"region":"Midwest","archetype":"gunslinger","is_veteran":false,"is_length":false,"three_pt_prowess":7.2,"free_throw_gen":7.7,"off_efficiency":4.9,"ball_security":7.0,"off_rebounding":2.3,"def_efficiency":3.8,"opp_3pt_allowed":5.1,"rim_protection":2.6,"pressure_defense":4.8,"experience":6.5,"pace_label":"Moderate","avg_height":77.5,"barthag":0.718,"rr":8.1,"em_rank":"84","kenpom_rank":93},"team2":{"id":"smu","name":"SMU","seed":11,"region":"Midwest","archetype":"offensive_engine","is_veteran":true,"is_length":false,"three_pt_prowess":5.7,"free_throw_gen":3.3,"off_efficiency":7.0,"ball_security":5.2,"off_rebounding":6.2,"def_efficiency":5.0,"opp_3pt_allowed":4.1,"rim_protection":5.1,"pressure_defense":5.1,"experience":10.0,"pace_label":"Moderate","avg_height":78.0,"barthag":0.861,"rr":16.6,"em_rank":"37","kenpom_rank":42}},{"round":"First Round","region":"East","date":"2026-03-19","time":"","site":"Greenville, SC","is_ff":false,"team1_name":"Duke","team2_name":"Siena","team1":{"id":"duke","name":"Duke","seed":1,"region":"East","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":6.1,"free_throw_gen":6.6,"off_efficiency":8.8,"ball_security":5.4,"off_rebounding":7.3,"def_efficiency":10.0,"opp_3pt_allowed":8.2,"rim_protection":4.4,"pressure_defense":6.5,"experience":1.6,"pace_label":"Slow","avg_height":79.3,"barthag":0.981,"rr":34.8,"em_rank":"1","kenpom_rank":1},"team2":{"id":"siena","name":"Siena","seed":16,"region":"East","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":1.9,"free_throw_gen":4.9,"off_efficiency":1.5,"ball_security":5.0,"off_rebounding":4.9,"def_efficiency":3.6,"opp_3pt_allowed":5.4,"rim_protection":3.4,"pressure_defense":4.2,"experience":2.9,"pace_label":"Slow","avg_height":76.7,"barthag":0.455,"rr":-0.1,"em_rank":"166","kenpom_rank":192}},{"round":"First Round","region":"East","date":"2026-03-19","time":"","site":"Greenville, SC","is_ff":false,"team1_name":"Ohio State","team2_name":"TCU","team1":{"id":"ohio_state","name":"Ohio State","seed":8,"region":"East","archetype":"offensive_engine","is_veteran":true,"is_length":false,"three_pt_prowess":5.7,"free_throw_gen":6.6,"off_efficiency":7.5,"ball_security":5.7,"off_rebounding":4.4,"def_efficiency":5.8,"opp_3pt_allowed":6.8,"rim_protection":1.6,"pressure_defense":2.4,"experience":7.5,"pace_label":"Slow","avg_height":77.9,"barthag":0.917,"rr":21.2,"em_rank":"22","kenpom_rank":26},"team2":{"id":"tcu","name":"TCU","seed":9,"region":"East","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":3.9,"free_throw_gen":7.0,"off_efficiency":4.4,"ball_security":5.7,"off_rebounding":5.8,"def_efficiency":7.2,"opp_3pt_allowed":4.3,"rim_protection":6.2,"pressure_defense":5.9,"experience":5.7,"pace_label":"Moderate","avg_height":76.4,"barthag":0.837,"rr":16.0,"em_rank":"43","kenpom_rank":43}},{"round":"First Round","region":"East","date":"2026-03-20","time":"","site":"San Diego, CA","is_ff":false,"team1_name":"St. John's","team2_name":"Northern Iowa","team1":{"id":"st_johns","name":"St. John's","seed":5,"region":"East","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":3.4,"free_throw_gen":8.5,"off_efficiency":6.0,"ball_security":6.8,"off_rebounding":6.4,"def_efficiency":8.3,"opp_3pt_allowed":7.2,"rim_protection":6.0,"pressure_defense":6.1,"experience":7.9,"pace_label":"Moderate","avg_height":78.2,"barthag":0.942,"rr":25.5,"em_rank":"11","kenpom_rank":17},"team2":{"id":"northern_iowa","name":"Northern Iowa","seed":12,"region":"East","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":5.2,"free_throw_gen":1.0,"off_efficiency":2.5,"ball_security":6.9,"off_rebounding":1.0,"def_efficiency":7.1,"opp_3pt_allowed":10.0,"rim_protection":4.0,"pressure_defense":4.8,"experience":6.5,"pace_label":"Slow","avg_height":77.6,"barthag":0.774,"rr":10.6,"em_rank":"67","kenpom_rank":72}},{"round":"First Round","region":"East","date":"2026-03-20","time":"","site":"San Diego, CA","is_ff":false,"team1_name":"Kansas","team2_name":"Cal Baptist","team1":{"id":"kansas","name":"Kansas","seed":4,"region":"East","archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":4.5,"free_throw_gen":4.2,"off_efficiency":5.4,"ball_security":5.7,"off_rebounding":3.9,"def_efficiency":8.4,"opp_3pt_allowed":7.9,"rim_protection":8.5,"pressure_defense":3.2,"experience":5.6,"pace_label":"Moderate","avg_height":78.7,"barthag":0.928,"rr":21.9,"em_rank":"19","kenpom_rank":21},"team2":{"id":"cal_baptist","name":"Cal Baptist","seed":13,"region":"East","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.3,"free_throw_gen":5.8,"off_efficiency":1.8,"ball_security":2.2,"off_rebounding":7.2,"def_efficiency":5.9,"opp_3pt_allowed":9.1,"rim_protection":2.2,"pressure_defense":3.2,"experience":4.0,"pace_label":"Slow","avg_height":76.5,"barthag":0.689,"rr":3.7,"em_rank":"118","kenpom_rank":106}},{"round":"First Round","region":"East","date":"2026-03-19","time":"","site":"Buffalo, NY","is_ff":false,"team1_name":"Louisville","team2_name":"South Florida","team1":{"id":"louisville","name":"Louisville","seed":6,"region":"East","archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":7.7,"free_throw_gen":4.6,"off_efficiency":7.4,"ball_security":4.5,"off_rebounding":5.2,"def_efficiency":6.9,"opp_3pt_allowed":5.5,"rim_protection":3.5,"pressure_defense":4.8,"experience":8.9,"pace_label":"Moderate","avg_height":78.4,"barthag":0.936,"rr":21.8,"em_rank":"20","kenpom_rank":19},"team2":{"id":"south_florida","name":"South Florida","seed":11,"region":"East","archetype":"foul_line_bully","is_veteran":false,"is_length":false,"three_pt_prowess":5.0,"free_throw_gen":8.1,"off_efficiency":5.1,"ball_security":6.1,"off_rebounding":7.3,"def_efficiency":6.2,"opp_3pt_allowed":4.1,"rim_protection":4.8,"pressure_defense":6.8,"experience":4.7,"pace_label":"Fast","avg_height":77.1,"barthag":0.836,"rr":15.8,"em_rank":"44","kenpom_rank":47}},{"round":"First Round","region":"East","date":"2026-03-19","time":"","site":"Buffalo, NY","is_ff":false,"team1_name":"Michigan State","team2_name":"North Dakota State","team1":{"id":"michigan_state","name":"Michigan State","seed":3,"region":"East","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":5.1,"free_throw_gen":5.9,"off_efficiency":7.0,"ball_security":3.6,"off_rebounding":7.4,"def_efficiency":8.2,"opp_3pt_allowed":5.3,"rim_protection":6.7,"pressure_defense":2.9,"experience":4.0,"pace_label":"Slow","avg_height":78.7,"barthag":0.944,"rr":24.6,"em_rank":"12","kenpom_rank":9},"team2":{"id":"north_dakota_state","name":"North Dakota State","seed":14,"region":"East","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":3.3,"off_efficiency":3.1,"ball_security":5.6,"off_rebounding":5.5,"def_efficiency":4.4,"opp_3pt_allowed":4.6,"rim_protection":3.3,"pressure_defense":6.2,"experience":3.7,"pace_label":"Slow","avg_height":76.2,"barthag":0.904,"rr":14.7,"em_rank":"48","kenpom_rank":113}},{"round":"First Round","region":"East","date":"2026-03-20","time":"","site":"Philadelphia, PA","is_ff":false,"team1_name":"UCLA","team2_name":"UCF","team1":{"id":"ucla","name":"UCLA","seed":7,"region":"East","archetype":"offensive_engine","is_veteran":true,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":4.4,"off_efficiency":7.3,"ball_security":8.5,"off_rebounding":4.5,"def_efficiency":5.8,"opp_3pt_allowed":6.6,"rim_protection":3.7,"pressure_defense":5.0,"experience":9.1,"pace_label":"Slow","avg_height":78.0,"barthag":0.911,"rr":20.3,"em_rank":"24","kenpom_rank":27},"team2":{"id":"ucf","name":"UCF","seed":10,"region":"East","archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":4.8,"free_throw_gen":3.4,"off_efficiency":6.2,"ball_security":5.4,"off_rebounding":5.8,"def_efficiency":4.8,"opp_3pt_allowed":4.0,"rim_protection":2.8,"pressure_defense":3.1,"experience":8.3,"pace_label":"Moderate","avg_height":78.6,"barthag":0.812,"rr":11.3,"em_rank":"61","kenpom_rank":54}},{"round":"First Round","region":"East","date":"2026-03-20","time":"","site":"Philadelphia, PA","is_ff":false,"team1_name":"UConn","team2_name":"Furman","team1":{"id":"uconn","name":"UConn","seed":2,"region":"East","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":5.4,"free_throw_gen":3.0,"off_efficiency":6.7,"ball_security":4.0,"off_rebounding":6.3,"def_efficiency":8.4,"opp_3pt_allowed":8.3,"rim_protection":8.2,"pressure_defense":5.4,"experience":8.6,"pace_label":"Slow","avg_height":78.6,"barthag":0.965,"rr":30.5,"em_rank":"8","kenpom_rank":11},"team2":{"id":"furman","name":"Furman","seed":15,"region":"East","archetype":"system_operator","is_veteran":false,"is_length":true,"three_pt_prowess":5.5,"free_throw_gen":4.0,"off_efficiency":1.7,"ball_security":2.6,"off_rebounding":4.5,"def_efficiency":3.5,"opp_3pt_allowed":5.6,"rim_protection":3.7,"pressure_defense":1.9,"experience":3.0,"pace_label":"Slow","avg_height":79.2,"barthag":0.444,"rr":0.9,"em_rank":"153","kenpom_rank":191}},{"round":"First Round","region":"South","date":"2026-03-20","time":"","site":"Tampa, FL","is_ff":false,"team1_name":"Florida","team2_name":"Prairie View A&M / Lehigh (FF winner)","team1":{"id":"florida","name":"Florida","seed":1,"region":"South","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":2.9,"free_throw_gen":7.2,"off_efficiency":7.9,"ball_security":4.4,"off_rebounding":9.2,"def_efficiency":9.1,"opp_3pt_allowed":5.9,"rim_protection":6.0,"pressure_defense":4.3,"experience":6.5,"pace_label":"Fast","avg_height":78.9,"barthag":0.973,"rr":31.4,"em_rank":"4","kenpom_rank":4},"team2":null},{"round":"First Round","region":"South","date":"2026-03-20","time":"","site":"Tampa, FL","is_ff":false,"team1_name":"Clemson","team2_name":"Iowa","team1":{"id":"clemson","name":"Clemson","seed":8,"region":"South","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":5.3,"free_throw_gen":6.3,"off_efficiency":4.8,"ball_security":7.4,"off_rebounding":3.4,"def_efficiency":7.4,"opp_3pt_allowed":5.6,"rim_protection":3.4,"pressure_defense":4.6,"experience":8.3,"pace_label":"Slow","avg_height":77.8,"barthag":0.892,"rr":16.6,"em_rank":"38","kenpom_rank":36},"team2":{"id":"iowa","name":"Iowa","seed":9,"region":"South","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":5.8,"free_throw_gen":5.1,"off_efficiency":6.6,"ball_security":6.1,"off_rebounding":4.2,"def_efficiency":6.7,"opp_3pt_allowed":4.4,"rim_protection":1.5,"pressure_defense":6.2,"experience":4.2,"pace_label":"Slow","avg_height":78.5,"barthag":0.907,"rr":20.1,"em_rank":"26","kenpom_rank":25}},{"round":"First Round","region":"South","date":"2026-03-19","time":"","site":"Oklahoma City, OK","is_ff":false,"team1_name":"Vanderbilt","team2_name":"McNeese","team1":{"id":"vanderbilt","name":"Vanderbilt","seed":5,"region":"South","archetype":"offensive_juggernaut","is_veteran":true,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":6.8,"off_efficiency":8.3,"ball_security":8.7,"off_rebounding":4.6,"def_efficiency":6.7,"opp_3pt_allowed":6.1,"rim_protection":6.2,"pressure_defense":6.4,"experience":8.8,"pace_label":"Moderate","avg_height":77.2,"barthag":0.946,"rr":24.0,"em_rank":"14","kenpom_rank":12},"team2":{"id":"mcneese","name":"McNeese","seed":12,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.0,"free_throw_gen":6.8,"off_efficiency":4.0,"ball_security":7.3,"off_rebounding":6.1,"def_efficiency":5.9,"opp_3pt_allowed":5.7,"rim_protection":8.7,"pressure_defense":10.0,"experience":6.2,"pace_label":"Slow","avg_height":77.1,"barthag":0.765,"rr":10.7,"em_rank":"65","kenpom_rank":68}},{"round":"First Round","region":"South","date":"2026-03-19","time":"","site":"Oklahoma City, OK","is_ff":false,"team1_name":"Nebraska","team2_name":"Troy","team1":{"id":"nebraska","name":"Nebraska","seed":4,"region":"South","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":7.2,"free_throw_gen":1.7,"off_efficiency":5.5,"ball_security":7.2,"off_rebounding":2.7,"def_efficiency":8.9,"opp_3pt_allowed":8.8,"rim_protection":3.1,"pressure_defense":5.7,"experience":8.4,"pace_label":"Slow","avg_height":77.8,"barthag":0.931,"rr":22.3,"em_rank":"18","kenpom_rank":14},"team2":{"id":"troy","name":"Troy","seed":13,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.4,"free_throw_gen":5.9,"off_efficiency":2.8,"ball_security":3.7,"off_rebounding":6.0,"def_efficiency":3.6,"opp_3pt_allowed":7.2,"rim_protection":3.4,"pressure_defense":5.5,"experience":3.5,"pace_label":"Slow","avg_height":77.4,"barthag":0.543,"rr":4.5,"em_rank":"109","kenpom_rank":143}},{"round":"First Round","region":"South","date":"2026-03-19","time":"","site":"Greenville, SC","is_ff":false,"team1_name":"North Carolina","team2_name":"VCU","team1":{"id":"north_carolina","name":"North Carolina","seed":6,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":true,"three_pt_prowess":5.5,"free_throw_gen":6.4,"off_efficiency":6.5,"ball_security":7.7,"off_rebounding":4.7,"def_efficiency":6.3,"opp_3pt_allowed":3.4,"rim_protection":3.0,"pressure_defense":3.0,"experience":3.5,"pace_label":"Moderate","avg_height":79.2,"barthag":0.904,"rr":14.7,"em_rank":"48","kenpom_rank":29},"team2":{"id":"vcu","name":"VCU","seed":11,"region":"South","archetype":"gunslinger","is_veteran":false,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":9.4,"off_efficiency":6.0,"ball_security":6.1,"off_rebounding":5.0,"def_efficiency":5.6,"opp_3pt_allowed":5.0,"rim_protection":5.1,"pressure_defense":5.6,"experience":5.0,"pace_label":"Moderate","avg_height":77.8,"barthag":0.843,"rr":16.1,"em_rank":"42","kenpom_rank":45}},{"round":"First Round","region":"South","date":"2026-03-19","time":"","site":"Greenville, SC","is_ff":false,"team1_name":"Illinois","team2_name":"Penn","team1":{"id":"illinois","name":"Illinois","seed":3,"region":"South","archetype":"offensive_juggernaut","is_veteran":false,"is_length":true,"three_pt_prowess":6.9,"free_throw_gen":4.3,"off_efficiency":9.9,"ball_security":8.8,"off_rebounding":7.5,"def_efficiency":6.8,"opp_3pt_allowed":7.0,"rim_protection":6.2,"pressure_defense":1.0,"experience":5.0,"pace_label":"Slow","avg_height":80.0,"barthag":0.968,"rr":28.9,"em_rank":"9","kenpom_rank":7},"team2":{"id":"penn","name":"Penn","seed":14,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.1,"free_throw_gen":5.4,"off_efficiency":1.6,"ball_security":5.8,"off_rebounding":4.2,"def_efficiency":4.6,"opp_3pt_allowed":6.7,"rim_protection":3.0,"pressure_defense":4.6,"experience":3.2,"pace_label":"Moderate","avg_height":77.8,"barthag":0.532,"rr":0.9,"em_rank":"152","kenpom_rank":150}},{"round":"First Round","region":"South","date":"2026-03-19","time":"","site":"Oklahoma City, OK","is_ff":false,"team1_name":"Saint Mary's","team2_name":"Texas A&M","team1":{"id":"saint_marys","name":"Saint Mary's","seed":7,"region":"South","archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":6.2,"free_throw_gen":5.7,"off_efficiency":6.1,"ball_security":4.4,"off_rebounding":7.0,"def_efficiency":7.4,"opp_3pt_allowed":7.2,"rim_protection":3.9,"pressure_defense":3.5,"experience":1.0,"pace_label":"Slow","avg_height":78.9,"barthag":0.911,"rr":20.4,"em_rank":"23","kenpom_rank":24},"team2":{"id":"texas_am","name":"Texas A&M","seed":10,"region":"South","archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":6.4,"off_efficiency":5.9,"ball_security":6.9,"off_rebounding":5.0,"def_efficiency":6.2,"opp_3pt_allowed":6.7,"rim_protection":3.3,"pressure_defense":5.9,"experience":9.5,"pace_label":"Fast","avg_height":77.2,"barthag":0.872,"rr":16.4,"em_rank":"41","kenpom_rank":39}},{"round":"First Round","region":"South","date":"2026-03-19","time":"","site":"Oklahoma City, OK","is_ff":false,"team1_name":"Houston","team2_name":"Idaho","team1":{"id":"houston","name":"Houston","seed":2,"region":"South","archetype":"two_way_machine","is_veteran":false,"is_length":false,"three_pt_prowess":5.3,"free_throw_gen":1.6,"off_efficiency":7.7,"ball_security":9.1,"off_rebounding":6.4,"def_efficiency":9.2,"opp_3pt_allowed":6.2,"rim_protection":6.0,"pressure_defense":6.8,"experience":5.9,"pace_label":"Slow","avg_height":77.8,"barthag":0.97,"rr":31.0,"em_rank":"5","kenpom_rank":5},"team2":{"id":"idaho","name":"Idaho","seed":15,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.2,"free_throw_gen":5.2,"off_efficiency":2.1,"ball_security":6.4,"off_rebounding":3.7,"def_efficiency":4.2,"opp_3pt_allowed":3.0,"rim_protection":1.2,"pressure_defense":3.3,"experience":4.8,"pace_label":"Moderate","avg_height":77.2,"barthag":0.57,"rr":0.1,"em_rank":"163","kenpom_rank":145}},{"round":"First Round","region":"West","date":"2026-03-20","time":"","site":"San Diego, CA","is_ff":false,"team1_name":"Arizona","team2_name":"Long Island University","team1":{"id":"arizona","name":"Arizona","seed":1,"region":"West","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":3.5,"free_throw_gen":9.0,"off_efficiency":8.7,"ball_security":6.1,"off_rebounding":7.3,"def_efficiency":9.7,"opp_3pt_allowed":7.0,"rim_protection":4.8,"pressure_defense":5.9,"experience":4.8,"pace_label":"Moderate","avg_height":79.0,"barthag":0.978,"rr":32.0,"em_rank":"3","kenpom_rank":2},"team2":{"id":"long_island_university","name":"Long Island University","seed":16,"region":"West","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.9,"free_throw_gen":5.2,"off_efficiency":1.0,"ball_security":1.0,"off_rebounding":5.8,"def_efficiency":3.4,"opp_3pt_allowed":6.4,"rim_protection":7.2,"pressure_defense":6.4,"experience":2.7,"pace_label":"Moderate","avg_height":77.4,"barthag":0.34,"rr":-3.3,"em_rank":"207","kenpom_rank":216}},{"round":"First Round","region":"West","date":"2026-03-20","time":"","site":"San Diego, CA","is_ff":false,"team1_name":"Villanova","team2_name":"Utah State","team1":{"id":"villanova","name":"Villanova","seed":8,"region":"West","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.3,"free_throw_gen":3.6,"off_efficiency":6.1,"ball_security":6.2,"off_rebounding":5.1,"def_efficiency":6.4,"opp_3pt_allowed":4.1,"rim_protection":1.0,"pressure_defense":6.1,"experience":6.1,"pace_label":"Slow","avg_height":77.6,"barthag":0.88,"rr":15.0,"em_rank":"47","kenpom_rank":33},"team2":{"id":"utah_state","name":"Utah State","seed":9,"region":"West","archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":7.0,"off_efficiency":6.7,"ball_security":5.8,"off_rebounding":5.3,"def_efficiency":6.0,"opp_3pt_allowed":4.1,"rim_protection":3.2,"pressure_defense":7.5,"experience":8.7,"pace_label":"Moderate","avg_height":77.7,"barthag":0.895,"rr":17.6,"em_rank":"32","kenpom_rank":30}},{"round":"First Round","region":"West","date":"2026-03-19","time":"","site":"Portland, OR","is_ff":false,"team1_name":"Wisconsin","team2_name":"High Point","team1":{"id":"wisconsin","name":"Wisconsin","seed":5,"region":"West","archetype":"sniper_system","is_veteran":true,"is_length":true,"three_pt_prowess":7.8,"free_throw_gen":3.9,"off_efficiency":7.8,"ball_security":9.3,"off_rebounding":3.9,"def_efficiency":5.9,"opp_3pt_allowed":4.8,"rim_protection":3.0,"pressure_defense":3.3,"experience":8.3,"pace_label":"Moderate","avg_height":78.8,"barthag":0.929,"rr":21.7,"em_rank":"21","kenpom_rank":22},"team2":{"id":"high_point","name":"High Point","seed":12,"region":"West","archetype":"foul_line_bully","is_veteran":true,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":9.0,"off_efficiency":4.9,"ball_security":9.1,"off_rebounding":4.9,"def_efficiency":3.7,"opp_3pt_allowed":6.4,"rim_protection":4.9,"pressure_defense":9.3,"experience":7.8,"pace_label":"Moderate","avg_height":76.3,"barthag":0.699,"rr":8.6,"em_rank":"79","kenpom_rank":92}},{"round":"First Round","region":"West","date":"2026-03-19","time":"","site":"Portland, OR","is_ff":false,"team1_name":"Arkansas","team2_name":"Hawai'i","team1":{"id":"arkansas","name":"Arkansas","seed":4,"region":"West","archetype":"offensive_juggernaut","is_veteran":false,"is_length":false,"three_pt_prowess":5.9,"free_throw_gen":6.0,"off_efficiency":8.7,"ball_security":10.0,"off_rebounding":5.0,"def_efficiency":6.0,"opp_3pt_allowed":6.7,"rim_protection":6.4,"pressure_defense":5.0,"experience":4.9,"pace_label":"Fast","avg_height":78.5,"barthag":0.936,"rr":23.8,"em_rank":"15","kenpom_rank":15},"team2":{"id":"hawaii","name":"Hawai'i","seed":13,"region":"West","archetype":"foul_line_bully","is_veteran":false,"is_length":true,"three_pt_prowess":3.7,"free_throw_gen":8.7,"off_efficiency":1.5,"ball_security":1.1,"off_rebounding":4.7,"def_efficiency":6.1,"opp_3pt_allowed":7.9,"rim_protection":4.1,"pressure_defense":4.2,"experience":5.6,"pace_label":"Moderate","avg_height":78.7,"barthag":0.635,"rr":3.3,"em_rank":"120","kenpom_rank":108}},{"round":"First Round","region":"West","date":"2026-03-19","time":"","site":"Portland, OR","is_ff":false,"team1_name":"BYU","team2_name":"Texas","team1":{"id":"byu","name":"BYU","seed":6,"region":"West","archetype":"offensive_engine","is_veteran":false,"is_length":false,"three_pt_prowess":5.2,"free_throw_gen":4.9,"off_efficiency":7.9,"ball_security":6.0,"off_rebounding":5.9,"def_efficiency":5.8,"opp_3pt_allowed":2.4,"rim_protection":5.6,"pressure_defense":5.3,"experience":5.0,"pace_label":"Moderate","avg_height":78.3,"barthag":0.889,"rr":16.5,"em_rank":"39","kenpom_rank":23},"team2":{"id":"texas","name":"Texas","seed":11,"region":"West","archetype":"foul_line_bully","is_veteran":true,"is_length":false,"three_pt_prowess":4.5,"free_throw_gen":10.0,"off_efficiency":7.7,"ball_security":6.0,"off_rebounding":6.3,"def_efficiency":4.6,"opp_3pt_allowed":1.6,"rim_protection":2.1,"pressure_defense":3.3,"experience":10.0,"pace_label":"Slow","avg_height":78.1,"barthag":0.854,"rr":17.1,"em_rank":"34","kenpom_rank":37}},{"round":"First Round","region":"West","date":"2026-03-19","time":"","site":"Portland, OR","is_ff":false,"team1_name":"Gonzaga","team2_name":"Kennesaw State","team1":{"id":"gonzaga","name":"Gonzaga","seed":3,"region":"West","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":3.3,"free_throw_gen":3.5,"off_efficiency":6.7,"ball_security":8.1,"off_rebounding":6.0,"def_efficiency":8.4,"opp_3pt_allowed":7.7,"rim_protection":5.2,"pressure_defense":6.9,"experience":10.0,"pace_label":"Moderate","avg_height":78.0,"barthag":0.95,"rr":27.7,"em_rank":"10","kenpom_rank":10},"team2":{"id":"kennesaw_state","name":"Kennesaw State","seed":14,"region":"West","archetype":"foul_line_bully","is_veteran":false,"is_length":false,"three_pt_prowess":5.2,"free_throw_gen":10.0,"off_efficiency":2.7,"ball_security":4.1,"off_rebounding":6.3,"def_efficiency":3.3,"opp_3pt_allowed":4.1,"rim_protection":7.8,"pressure_defense":4.4,"experience":3.2,"pace_label":"Fast","avg_height":78.3,"barthag":0.534,"rr":1.0,"em_rank":"150","kenpom_rank":163}},{"round":"First Round","region":"West","date":"2026-03-20","time":"","site":"St. Louis, MO","is_ff":false,"team1_name":"Miami (FL)","team2_name":"Missouri","team1":{"id":"miami_fl","name":"Miami (FL)","seed":7,"region":"West","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.7,"free_throw_gen":6.5,"off_efficiency":6.5,"ball_security":4.8,"off_rebounding":6.8,"def_efficiency":6.3,"opp_3pt_allowed":2.3,"rim_protection":4.1,"pressure_defense":6.4,"experience":5.6,"pace_label":"Moderate","avg_height":78.4,"barthag":0.887,"rr":18.6,"em_rank":"28","kenpom_rank":31},"team2":{"id":"missouri","name":"Missouri","seed":10,"region":"West","archetype":"foul_line_bully","is_veteran":true,"is_length":true,"three_pt_prowess":4.6,"free_throw_gen":8.8,"off_efficiency":5.8,"ball_security":2.3,"off_rebounding":6.3,"def_efficiency":5.2,"opp_3pt_allowed":1.0,"rim_protection":4.4,"pressure_defense":4.8,"experience":7.6,"pace_label":"Slow","avg_height":79.3,"barthag":0.851,"rr":14.4,"em_rank":"49","kenpom_rank":52}},{"round":"First Round","region":"West","date":"2026-03-20","time":"","site":"St. Louis, MO","is_ff":false,"team1_name":"Purdue","team2_name":"Queens","team1":{"id":"purdue","name":"Purdue","seed":2,"region":"West","archetype":"offensive_juggernaut","is_veteran":true,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":2.3,"off_efficiency":10.0,"ball_security":8.4,"off_rebounding":6.6,"def_efficiency":6.4,"opp_3pt_allowed":3.7,"rim_protection":3.3,"pressure_defense":3.7,"experience":9.0,"pace_label":"Slow","avg_height":77.8,"barthag":0.964,"rr":30.3,"em_rank":"6","kenpom_rank":8},"team2":{"id":"queens","name":"Queens","seed":15,"region":"West","archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":5.9,"off_efficiency":4.5,"ball_security":6.6,"off_rebounding":4.3,"def_efficiency":1.0,"opp_3pt_allowed":1.8,"rim_protection":2.6,"pressure_defense":3.4,"experience":3.6,"pace_label":"Moderate","avg_height":78.3,"barthag":0.44,"rr":-2.1,"em_rank":"194","kenpom_rank":181}},{"round":"First Round","region":"Midwest","date":"2026-03-19","time":"","site":"Buffalo, NY","is_ff":false,"team1_name":"Michigan","team2_name":"Howard","team1":{"id":"michigan","name":"Michigan","seed":1,"region":"Midwest","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":6.0,"free_throw_gen":6.6,"off_efficiency":8.3,"ball_security":4.1,"off_rebounding":6.2,"def_efficiency":10.0,"opp_3pt_allowed":8.5,"rim_protection":8.7,"pressure_defense":3.2,"experience":7.2,"pace_label":"Fast","avg_height":78.7,"barthag":0.98,"rr":34.5,"em_rank":"2","kenpom_rank":3},"team2":{"id":"howard","name":"Howard","seed":16,"region":"Midwest","archetype":"foul_line_bully","is_veteran":false,"is_length":false,"three_pt_prowess":4.2,"free_throw_gen":9.6,"off_efficiency":1.0,"ball_security":1.0,"off_rebounding":6.7,"def_efficiency":4.5,"opp_3pt_allowed":8.2,"rim_protection":4.6,"pressure_defense":7.3,"experience":3.7,"pace_label":"Moderate","avg_height":76.2,"barthag":0.425,"rr":-1.1,"em_rank":"181","kenpom_rank":207}},{"round":"First Round","region":"Midwest","date":"2026-03-19","time":"","site":"Buffalo, NY","is_ff":false,"team1_name":"Georgia","team2_name":"Saint Louis","team1":{"id":"georgia","name":"Georgia","seed":8,"region":"Midwest","archetype":"offensive_engine","is_veteran":false,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":6.2,"off_efficiency":7.6,"ball_security":7.3,"off_rebounding":6.1,"def_efficiency":5.1,"opp_3pt_allowed":4.3,"rim_protection":8.1,"pressure_defense":6.2,"experience":6.2,"pace_label":"Fast","avg_height":77.4,"barthag":0.876,"rr":18.2,"em_rank":"30","kenpom_rank":32},"team2":{"id":"saint_louis","name":"Saint Louis","seed":9,"region":"Midwest","archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":8.6,"free_throw_gen":5.2,"off_efficiency":5.8,"ball_security":3.1,"off_rebounding":4.5,"def_efficiency":6.1,"opp_3pt_allowed":8.7,"rim_protection":3.7,"pressure_defense":4.9,"experience":8.0,"pace_label":"Fast","avg_height":77.5,"barthag":0.873,"rr":17.7,"em_rank":"31","kenpom_rank":41}},{"round":"First Round","region":"Midwest","date":"2026-03-20","time":"","site":"Tampa, FL","is_ff":false,"team1_name":"Texas Tech","team2_name":"Akron","team1":{"id":"texas_tech","name":"Texas Tech","seed":5,"region":"Midwest","archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":8.5,"free_throw_gen":1.6,"off_efficiency":7.7,"ball_security":5.2,"off_rebounding":5.4,"def_efficiency":6.6,"opp_3pt_allowed":6.9,"rim_protection":3.7,"pressure_defense":3.7,"experience":7.2,"pace_label":"Slow","avg_height":77.1,"barthag":0.944,"rr":18.3,"em_rank":"29","kenpom_rank":20},"team2":{"id":"akron","name":"Akron","seed":12,"region":"Midwest","archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":7.6,"free_throw_gen":2.6,"off_efficiency":5.6,"ball_security":5.7,"off_rebounding":5.5,"def_efficiency":4.6,"opp_3pt_allowed":2.7,"rim_protection":2.9,"pressure_defense":5.3,"experience":5.2,"pace_label":"Fast","avg_height":75.9,"barthag":0.773,"rr":11.2,"em_rank":"62","kenpom_rank":64}},{"round":"First Round","region":"Midwest","date":"2026-03-20","time":"","site":"Tampa, FL","is_ff":false,"team1_name":"Alabama","team2_name":"Hofstra","team1":{"id":"alabama","name":"Alabama","seed":4,"region":"Midwest","archetype":"offensive_juggernaut","is_veteran":false,"is_length":false,"three_pt_prowess":7.9,"free_throw_gen":6.3,"off_efficiency":9.1,"ball_security":9.1,"off_rebounding":4.8,"def_efficiency":5.4,"opp_3pt_allowed":4.6,"rim_protection":5.1,"pressure_defense":3.8,"experience":6.9,"pace_label":"Fast","avg_height":78.2,"barthag":0.934,"rr":23.2,"em_rank":"17","kenpom_rank":18},"team2":{"id":"hofstra","name":"Hofstra","seed":13,"region":"Midwest","archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":6.6,"free_throw_gen":4.2,"off_efficiency":4.1,"ball_security":4.8,"off_rebounding":6.0,"def_efficiency":4.9,"opp_3pt_allowed":6.0,"rim_protection":4.4,"pressure_defense":2.6,"experience":4.6,"pace_label":"Slow","avg_height":77.4,"barthag":0.705,"rr":10.0,"em_rank":"74","kenpom_rank":87}},{"round":"First Round","region":"Midwest","date":"2026-03-20","time":"","site":"Philadelphia, PA","is_ff":false,"team1_name":"Tennessee","team2_name":"Miami (Ohio) / SMU (FF winner)","team1":{"id":"tennessee","name":"Tennessee","seed":6,"region":"Midwest","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":3.2,"free_throw_gen":7.0,"off_efficiency":6.4,"ball_security":3.6,"off_rebounding":10.0,"def_efficiency":8.1,"opp_3pt_allowed":8.0,"rim_protection":5.1,"pressure_defense":6.0,"experience":5.0,"pace_label":"Slow","avg_height":78.4,"barthag":0.941,"rr":23.5,"em_rank":"16","kenpom_rank":16},"team2":null},{"round":"First Round","region":"Midwest","date":"2026-03-20","time":"","site":"Philadelphia, PA","is_ff":false,"team1_name":"Virginia","team2_name":"Wright State","team1":{"id":"virginia","name":"Virginia","seed":3,"region":"Midwest","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":4.4,"off_efficiency":6.9,"ball_security":5.0,"off_rebounding":7.2,"def_efficiency":7.8,"opp_3pt_allowed":7.6,"rim_protection":10.0,"pressure_defense":4.6,"experience":6.8,"pace_label":"Slow","avg_height":78.2,"barthag":0.943,"rr":24.1,"em_rank":"13","kenpom_rank":13},"team2":{"id":"wright_state","name":"Wright State","seed":14,"region":"Midwest","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":4.7,"free_throw_gen":6.7,"off_efficiency":3.2,"ball_security":4.6,"off_rebounding":5.4,"def_efficiency":3.3,"opp_3pt_allowed":4.4,"rim_protection":5.2,"pressure_defense":5.3,"experience":3.1,"pace_label":"Moderate","avg_height":77.0,"barthag":0.586,"rr":1.3,"em_rank":"148","kenpom_rank":140}},{"round":"First Round","region":"Midwest","date":"2026-03-20","time":"","site":"St. Louis, MO","is_ff":false,"team1_name":"Kentucky","team2_name":"Santa Clara","team1":{"id":"kentucky","name":"Kentucky","seed":7,"region":"Midwest","archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":4.7,"free_throw_gen":6.5,"off_efficiency":6.2,"ball_security":6.4,"off_rebounding":5.6,"def_efficiency":6.8,"opp_3pt_allowed":6.8,"rim_protection":5.9,"pressure_defense":5.2,"experience":4.4,"pace_label":"Moderate","avg_height":78.8,"barthag":0.89,"rr":20.2,"em_rank":"25","kenpom_rank":28},"team2":{"id":"santa_clara","name":"Santa Clara","seed":10,"region":"Midwest","archetype":"offensive_engine","is_veteran":false,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":1.0,"off_efficiency":7.2,"ball_security":5.6,"off_rebounding":6.7,"def_efficiency":5.1,"opp_3pt_allowed":5.1,"rim_protection":4.5,"pressure_defense":7.5,"experience":1.8,"pace_label":"Moderate","avg_height":78.5,"barthag":0.895,"rr":16.9,"em_rank":"36","kenpom_rank":35}},{"round":"First Round","region":"Midwest","date":"2026-03-20","time":"","site":"St. Louis, MO","is_ff":false,"team1_name":"Iowa State","team2_name":"Tennessee State","team1":{"id":"iowa_state","name":"Iowa State","seed":2,"region":"Midwest","archetype":"two_way_machine","is_veteran":true,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":4.9,"off_efficiency":7.3,"ball_security":6.2,"off_rebounding":6.2,"def_efficiency":9.2,"opp_3pt_allowed":6.2,"rim_protection":3.0,"pressure_defense":8.1,"experience":9.3,"pace_label":"Slow","avg_height":78.1,"barthag":0.966,"rr":29.5,"em_rank":"7","kenpom_rank":6},"team2":{"id":"tennessee_state","name":"Tennessee State","seed":15,"region":"Midwest","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.1,"free_throw_gen":4.6,"off_efficiency":2.2,"ball_security":4.4,"off_rebounding":6.0,"def_efficiency":3.0,"opp_3pt_allowed":4.6,"rim_protection":4.2,"pressure_defense":7.6,"experience":5.3,"pace_label":"Fast","avg_height":77.0,"barthag":0.395,"rr":0.4,"em_rank":"160","kenpom_rank":187}}];


// ── Live scores hook ──────────────────────────────────────────────────────────
function useScores() {
  const [scores, setScores] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const timerRef = useRef(null);

  function buildLookup(games) {
    // Store as array of results per team — a team can appear multiple times
    // (e.g. Howard in First Four AND First Round)
    const map = {};
    for (const g of games) {
      if (g.state === "pre") continue;
      const entry1 = { score:g.t1_score, opp:g.t2_score, winner:g.t1_winner, detail:g.detail, state:g.state, date:g.date };
      const entry2 = { score:g.t2_score, opp:g.t1_score, winner:g.t2_winner, detail:g.detail, state:g.state, date:g.date };
      if (!map[g.t1_name]) map[g.t1_name] = [];
      if (!map[g.t2_name]) map[g.t2_name] = [];
      map[g.t1_name].push(entry1);
      map[g.t2_name].push(entry2);
    }
    return map;
  }

  async function fetchScores() {
    try {
      const r = await fetch("/scores.json?t=" + Date.now());
      console.log("[scores] fetch status:", r.status, r.url);
      if (!r.ok) { console.warn("[scores] not ok:", r.status); return; }
      const data = await r.json();
      console.log("[scores] loaded", data.games?.length, "games:", data.games?.map(g=>g.t1_name+"/"+g.t2_name));
      setScores(buildLookup(data.games || []));
      setLastUpdate(data.updated || null);
    } catch(e) { console.warn("[scores] fetch error:", e.message); }
  }

  useEffect(() => {
    fetchScores();
    timerRef.current = setInterval(fetchScores, 2 * 60 * 60 * 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  return { scores, lastUpdate };
}


// ── Live odds hook ────────────────────────────────────────────────────────────
// Fetches odds.json from GCS once on load (odds don't change mid-game)
function useOdds() {
  const [odds, setOdds] = useState({});

  useEffect(() => {
    fetch("https://storage.googleapis.com/cbb-scores-490420/odds.json?t=" + Date.now())
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.odds && Object.keys(data.odds).length > 0) {
          setOdds(data.odds);
          console.log("[odds] loaded", Object.keys(data.odds).length, "teams from GCS");
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

// ── Helpers ───────────────────────────────────────────────────────────────────
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
        <span style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>{date}{time?" · "+time+" ET":""}</span>
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
  const [filterRegion, setFilterRegion] = useState("All");
  const [filterRound,  setFilterRound]  = useState("All");

  const matchups = useMemo(() => MATCHUP_DATA.filter(m => {
    if (filterRegion !== "All" && m.region !== filterRegion) return false;
    if (filterRound  !== "All" && m.round  !== filterRound)  return false;
    return true;
  }), [filterRegion, filterRound]);

  // Group by region
  const grouped = useMemo(() => {
    const g = {};
    for (const m of matchups) {
      const key = m.round === "First Four" ? "First Four" : m.region;
      if (!g[key]) g[key] = [];
      g[key].push(m);
    }
    return g;
  }, [matchups]);

  const sectionOrder = ["First Four", ...REGIONS];

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
        </select>
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
              {section !== "First Four" && <span style={{ width:8, height:8, borderRadius:"50%", background:REGION_COLORS[section]||"#888", display:"inline-block", flexShrink:0 }}/>}
              <span style={{ fontSize:13, fontWeight:600, color:section==="First Four"?"#b45309":REGION_COLORS[section]||"var(--color-text-primary)" }}>
                {section === "First Four" ? "First Four — Dayton, OH" : `${section} Region`}
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


// ── Compare Tab ───────────────────────────────────────────────────────────────
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

  const TeamPicker = ({ label, selected, search, setSearch, focused, setFocused, onSelect, onClear }) => (
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
                {jbA != null && label === "Team A" && <span>jbScore <b style={{ color:ARCH_MAP[selected.archetype]?.color }}>{jbA?.toFixed(1)}</b></span>}
                {jbB != null && label === "Team B" && <span>jbScore <b style={{ color:ARCH_MAP[selected.archetype]?.color }}>{jbB?.toFixed(1)}</b></span>}
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
              {(label === "Team A" ? filteredA : filteredB).map(t => (
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
              {(label === "Team A" ? filteredA : filteredB).length === 0 && (
                <div style={{ padding:"12px", fontSize:12, color:"var(--color-text-tertiary)", textAlign:"center" }}>No teams found</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Team pickers */}
      <div style={{ display:"flex", gap:12, marginBottom:"1.5rem", alignItems:"flex-start" }}>
        <TeamPicker label="Team A" selected={teamA} search={searchA} setSearch={setSearchA}
          focused={focusA} setFocused={setFocusA} onSelect={setTeamA} onClear={() => setTeamA(null)}/>
        <div style={{ display:"flex", alignItems:"center", paddingTop: teamA || teamB ? 44 : 30,
          fontSize:13, fontWeight:600, color:"var(--color-text-tertiary)", flexShrink:0 }}>vs</div>
        <TeamPicker label="Team B" selected={teamB} search={searchB} setSearch={setSearchB}
          focused={focusB} setFocused={setFocusB} onSelect={setTeamB} onClear={() => setTeamB(null)}/>
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

function PicksTab({ onTeamClick }) {
  const [sortBy, setSortBy]           = useState("upset");
  const [filterRegion, setFilterRegion] = useState("All");
  const [filterTier, setFilterTier]   = useState("All");

  // Heatmap: jbDelta -5 → 0 = deep red (hottest), 0→15 = orange, 15→30 = amber,
  //          30→45 = yellow-green, 45→65 = teal/blue (coolest)
  function gapColor(delta) {
    if (delta < -10) return { bg:"#7f1d1d", text:"#fca5a5", border:"#991b1b" }; // deep red
    if (delta < 0)   return { bg:"#b91c1c", text:"#fecaca", border:"#dc2626" }; // red
    if (delta < 5)   return { bg:"#c2410c", text:"#fed7aa", border:"#ea580c" }; // orange
    if (delta < 8)   return { bg:"#b45309", text:"#fde68a", border:"#d97706" }; // amber
    if (delta < 13)  return { bg:"#854d0e", text:"#fef08a", border:"#ca8a04" }; // dark amber
    if (delta < 17)  return { bg:"#3f6212", text:"#d9f99d", border:"#65a30d" }; // yellow-green
    if (delta < 23)  return { bg:"#166534", text:"#bbf7d0", border:"#16a34a" }; // green
    if (delta < 35)  return { bg:"#0f766e", text:"#99f6e4", border:"#0d9488" }; // teal
    return              { bg:"#1d4ed8", text:"#bfdbfe", border:"#3b82f6" };     // blue
  }

  function gapLabel(delta) {
    if (delta < -10) return "🔥 Upset city";
    if (delta < 0)   return "⚡ Upset potential";
    if (delta < 5)   return "Coin flip";
    if (delta < 8)   return "Razor thin";
    if (delta < 13)  return "Narrow gap";
    if (delta < 17)  return "Moderate gap";
    if (delta < 23)  return "Clear gap";
    if (delta < 35)  return "Blowout potential";
    return "Blowout city";
  }

  const TIER_META = {
    strong:   { label:"⚡ Strong upset candidate",  color:"#dc2626" },
    moderate: { label:"▲ Moderate upset potential", color:"#d97706" },
    low:      { label:"— Low upset probability",    color:"#475569" },
  };

  const filtered = useMemo(() => {
    let d = [...UPSET_DATA];
    if (filterRegion !== "All") d = d.filter(m => m.region === filterRegion);
    if (filterTier   !== "All") d = d.filter(m => m.tier   === filterTier);
    if (sortBy === "upset")      d.sort((a,b) => b.upset_score - a.upset_score);
    if (sortBy === "jb_delta")   d.sort((a,b) => a.jb_delta   - b.jb_delta);
    if (sortBy === "seed_gap")   d.sort((a,b) => (b.dog_seed - b.fav_seed) - (a.dog_seed - a.fav_seed));
    if (sortBy === "region")     d.sort((a,b) => a.region.localeCompare(b.region));
    return d;
  }, [sortBy, filterRegion, filterTier]);

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
        <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
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
          <div style={{ flex:1, minWidth:180 }}>
            <p style={{ margin:"0 0 3px", fontSize:12, fontWeight:500, color:"var(--color-text-primary)" }}>jbGap heatmap</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:4 }}>
              {[[-15,"Upset city"],[-5,"Upset potential"],[2,"Coin flip"],[6,"Razor thin"],[10,"Narrow"],[15,"Moderate"],[20,"Clear"],[28,"Blowout potential"],[40,"Blowout city"]].map(([d,l])=>{
                const c = gapColor(d);
                return <span key={l} style={{ fontSize:9, padding:"2px 6px", borderRadius:4, background:c.bg, color:c.text, border:`1px solid ${c.border}` }}>{l}</span>;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:"0.875rem", alignItems:"center" }}>
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
        </select>
        <span style={{ fontSize:11, color:"var(--color-text-tertiary)", marginLeft:"auto" }}>{filtered.length} matchup{filtered.length!==1?"s":""}</span>
      </div>

      {/* Matchup cards */}
      <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
        {filtered.map((m,i) => {
          const tm   = TIER_META[m.tier];
          const gc   = gapColor(m.jb_delta);
          const oFav = ODDS[m.fav] || {};
          const oDog = ODDS[m.dog] || {};
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
                  {m.region} · {m.site} · {m.date}
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
                        onClick={()=>{const t=TEAMS.find(t=>t.name===m.fav);if(t)onTeamClick(t);}}>
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
                        onClick={()=>{const t=TEAMS.find(t=>t.name===m.dog);if(t)onTeamClick(t);}}>
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


// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,      setTab]      = useState("classifier");
  const { scores, lastUpdate } = useScores();
  const liveOdds = useOdds();  // "classifier" | "matchups" | "glossary"
  const [selected, setSelected] = useState(null);

  const tabs = [
    { id: "classifier", label: "Team Classifier" },
    { id: "matchups",   label: "Matchups" },
    { id: "picks",     label: "Picks & Analysis" },
    { id: "compare",   label: "Compare" },
    { id: "glossary",   label: "Glossary" },
  ];

  return (
    <div style={{ fontFamily:"var(--font-sans)", maxWidth:900, margin:"0 auto", padding:"0 0 2rem" }}>

      {/* Header */}
      <div style={{ padding:"1.25rem 0 0", marginBottom:"1rem" }}>
        <h1 style={{ margin:"0 0 0.75rem", fontSize:19, fontWeight:600, color:"var(--color-text-primary)" }}>
          2026 NCAA Tournament — Intelligence Suite
        </h1>

        {/* Tab bar */}
        <div style={{ display:"flex", gap:0, borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              padding:"8px 16px", fontSize:13, fontWeight:tab===t.id?600:400,
              color:tab===t.id?"var(--color-text-primary)":"var(--color-text-tertiary)",
              background:"transparent", border:"none", cursor:"pointer",
              borderBottom:tab===t.id?"2px solid var(--color-text-primary)":"2px solid transparent",
              marginBottom:"-0.5px", transition:"all 0.1s",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab==="classifier" && <ClassifierTab onTeamClick={setSelected} scores={scores}/>}
      {tab==="matchups"   && <MatchupsTab   onTeamClick={setSelected} scores={scores} lastUpdate={lastUpdate} odds={liveOdds}/>}
      {tab==="glossary"   && <GlossaryTab/>}
      {tab==="picks"     && <PicksTab onTeamClick={setSelected} scores={scores} odds={liveOdds}/>}
      {tab==="compare"   && <CompareTab onTeamClick={setSelected}/>}

      {/* Team detail modal — available from both tabs */}
      {selected && <TeamModal team={selected} onClose={()=>setSelected(null)}/>}
    </div>
  );
}
