// ─────────────────────────────────────────────────────────────────────────────
// 2026 NCAA Tournament — Style Classifier + Matchup Explorer
//
// Two tabs:
//   1. Classifier  — All 68 teams, filterable by archetype/region/tempo/tag
//   2. Matchups    — First Round matchups side-by-side with style comparison
//
// Scoring: 10 attributes (1–10), normalized to 2026 tournament field.
// Archetypes: 6 (Two-Way Machine, Offensive Juggernaut, Defensive Fortress,
//             Gunslinger, Sniper System, System Operator)
// Tags: Veteran (experience ≥ 7.5), Length (avg height ≥ 78.7")
// Sources: KenPom (subscription), EvanMiya (subscription)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from "react";

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
  "Vanderbilt":     { score: 6.5, coach: "Jerry Stackhouse", note: "*" },
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

// ── Team data (pre-scored from KenPom + EvanMiya) ─────────────────────────────
const TEAM_DATA = {"teams":[{"id":"duke","name":"Duke","seed":1,"region":"East","record":"32-2","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":6.1,"free_throw_gen":6.6,"off_efficiency":8.8,"ball_security":5.4,"off_rebounding":7.3,"def_efficiency":10.0,"opp_3pt_allowed":8.2,"rim_protection":4.4,"pressure_defense":6.5,"experience":1.6,"pace_label":"Slow","pace_raw":65.3,"avg_height":79.3,"barthag":0.981,"rr":34.8,"em_rank":"1"},{"id":"uconn","name":"UConn","seed":2,"region":"East","record":"29-5","is_ff":false,"archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":5.4,"free_throw_gen":3.0,"off_efficiency":6.7,"ball_security":4.0,"off_rebounding":6.3,"def_efficiency":8.4,"opp_3pt_allowed":8.3,"rim_protection":8.2,"pressure_defense":5.4,"experience":8.6,"pace_label":"Slow","pace_raw":64.4,"avg_height":78.6,"barthag":null,"rr":null,"em_rank":""},{"id":"michigan_state","name":"Michigan State","seed":3,"region":"East","record":"25-7","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":5.1,"free_throw_gen":5.9,"off_efficiency":7.0,"ball_security":3.6,"off_rebounding":7.4,"def_efficiency":8.2,"opp_3pt_allowed":5.3,"rim_protection":6.7,"pressure_defense":2.9,"experience":4.0,"pace_label":"Slow","pace_raw":66.0,"avg_height":78.7,"barthag":0.944,"rr":24.6,"em_rank":"12"},{"id":"kansas","name":"Kansas","seed":4,"region":"East","record":"23-10","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":4.5,"free_throw_gen":4.2,"off_efficiency":5.4,"ball_security":5.7,"off_rebounding":3.9,"def_efficiency":8.4,"opp_3pt_allowed":7.9,"rim_protection":8.5,"pressure_defense":3.2,"experience":5.6,"pace_label":"Moderate","pace_raw":67.6,"avg_height":78.7,"barthag":0.928,"rr":21.9,"em_rank":"19"},{"id":"st_johns","name":"St. John's","seed":5,"region":"East","record":"28-6","is_ff":false,"archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":3.4,"free_throw_gen":8.5,"off_efficiency":6.0,"ball_security":6.8,"off_rebounding":6.4,"def_efficiency":8.3,"opp_3pt_allowed":7.2,"rim_protection":6.0,"pressure_defense":6.1,"experience":7.9,"pace_label":"Moderate","pace_raw":69.6,"avg_height":78.2,"barthag":0.942,"rr":25.5,"em_rank":"11"},{"id":"louisville","name":"Louisville","seed":6,"region":"East","record":"23-10","is_ff":false,"archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":7.7,"free_throw_gen":4.6,"off_efficiency":7.4,"ball_security":4.5,"off_rebounding":5.2,"def_efficiency":6.9,"opp_3pt_allowed":5.5,"rim_protection":3.5,"pressure_defense":4.8,"experience":8.9,"pace_label":"Moderate","pace_raw":69.6,"avg_height":78.4,"barthag":0.936,"rr":21.8,"em_rank":"20"},{"id":"ucla","name":"UCLA","seed":7,"region":"East","record":"23-11","is_ff":false,"archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":4.4,"off_efficiency":7.3,"ball_security":8.5,"off_rebounding":4.5,"def_efficiency":5.8,"opp_3pt_allowed":6.6,"rim_protection":3.7,"pressure_defense":5.0,"experience":9.1,"pace_label":"Slow","pace_raw":64.6,"avg_height":78.0,"barthag":0.911,"rr":20.3,"em_rank":"24"},{"id":"ohio_state","name":"Ohio State","seed":8,"region":"East","record":"21-12","is_ff":false,"archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":5.7,"free_throw_gen":6.6,"off_efficiency":7.5,"ball_security":5.7,"off_rebounding":4.4,"def_efficiency":5.8,"opp_3pt_allowed":6.8,"rim_protection":1.6,"pressure_defense":2.4,"experience":7.5,"pace_label":"Slow","pace_raw":66.1,"avg_height":77.9,"barthag":0.917,"rr":21.2,"em_rank":"22"},{"id":"tcu","name":"TCU","seed":9,"region":"East","record":"22-11","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":3.9,"free_throw_gen":7.0,"off_efficiency":4.4,"ball_security":5.7,"off_rebounding":5.8,"def_efficiency":7.2,"opp_3pt_allowed":4.3,"rim_protection":6.2,"pressure_defense":5.9,"experience":5.7,"pace_label":"Moderate","pace_raw":67.7,"avg_height":76.4,"barthag":0.837,"rr":16.0,"em_rank":"43"},{"id":"ucf","name":"UCF","seed":10,"region":"East","record":"21-11","is_ff":false,"archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":4.8,"free_throw_gen":3.4,"off_efficiency":6.2,"ball_security":5.4,"off_rebounding":5.8,"def_efficiency":4.8,"opp_3pt_allowed":4.0,"rim_protection":2.8,"pressure_defense":3.1,"experience":8.3,"pace_label":"Moderate","pace_raw":69.2,"avg_height":78.6,"barthag":0.812,"rr":11.3,"em_rank":"61"},{"id":"south_florida","name":"South Florida","seed":11,"region":"East","record":"25-8","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.0,"free_throw_gen":8.1,"off_efficiency":5.1,"ball_security":6.1,"off_rebounding":7.3,"def_efficiency":6.2,"opp_3pt_allowed":4.1,"rim_protection":4.8,"pressure_defense":6.8,"experience":4.7,"pace_label":"Fast","pace_raw":71.5,"avg_height":77.1,"barthag":0.836,"rr":15.8,"em_rank":"44"},{"id":"northern_iowa","name":"Northern Iowa","seed":12,"region":"East","record":"23-12","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":5.2,"free_throw_gen":1.0,"off_efficiency":2.5,"ball_security":6.9,"off_rebounding":1.0,"def_efficiency":7.1,"opp_3pt_allowed":10.0,"rim_protection":4.0,"pressure_defense":4.8,"experience":6.5,"pace_label":"Slow","pace_raw":62.3,"avg_height":77.6,"barthag":0.774,"rr":10.6,"em_rank":"67"},{"id":"cal_baptist","name":"Cal Baptist","seed":13,"region":"East","record":"25-8","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.3,"free_throw_gen":5.8,"off_efficiency":1.8,"ball_security":2.2,"off_rebounding":7.2,"def_efficiency":5.9,"opp_3pt_allowed":9.1,"rim_protection":2.2,"pressure_defense":3.2,"experience":4.0,"pace_label":"Slow","pace_raw":65.8,"avg_height":76.5,"barthag":0.689,"rr":3.7,"em_rank":"118"},{"id":"north_dakota_state","name":"North Dakota State","seed":14,"region":"East","record":"27-7","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":3.3,"off_efficiency":3.1,"ball_security":5.6,"off_rebounding":5.5,"def_efficiency":4.4,"opp_3pt_allowed":4.6,"rim_protection":3.3,"pressure_defense":6.2,"experience":3.7,"pace_label":"Slow","pace_raw":66.3,"avg_height":76.2,"barthag":0.904,"rr":14.7,"em_rank":"48"},{"id":"furman","name":"Furman","seed":15,"region":"East","record":"22-12","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":true,"three_pt_prowess":5.5,"free_throw_gen":4.0,"off_efficiency":1.7,"ball_security":2.6,"off_rebounding":4.5,"def_efficiency":3.5,"opp_3pt_allowed":5.6,"rim_protection":3.7,"pressure_defense":1.9,"experience":3.0,"pace_label":"Slow","pace_raw":65.9,"avg_height":79.2,"barthag":0.444,"rr":0.9,"em_rank":"153"},{"id":"siena","name":"Siena","seed":16,"region":"East","record":"23-11","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":1.9,"free_throw_gen":4.9,"off_efficiency":1.5,"ball_security":5.0,"off_rebounding":4.9,"def_efficiency":3.6,"opp_3pt_allowed":5.4,"rim_protection":3.4,"pressure_defense":4.2,"experience":2.9,"pace_label":"Slow","pace_raw":64.6,"avg_height":76.7,"barthag":0.455,"rr":-0.1,"em_rank":"166"},{"id":"florida","name":"Florida","seed":1,"region":"South","record":"26-7","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":2.9,"free_throw_gen":7.2,"off_efficiency":7.9,"ball_security":4.4,"off_rebounding":9.2,"def_efficiency":9.1,"opp_3pt_allowed":5.9,"rim_protection":6.0,"pressure_defense":4.3,"experience":6.5,"pace_label":"Fast","pace_raw":70.5,"avg_height":78.9,"barthag":0.973,"rr":31.4,"em_rank":"4"},{"id":"houston","name":"Houston","seed":2,"region":"South","record":"28-6","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":false,"three_pt_prowess":5.3,"free_throw_gen":1.6,"off_efficiency":7.7,"ball_security":9.1,"off_rebounding":6.4,"def_efficiency":9.2,"opp_3pt_allowed":6.2,"rim_protection":6.0,"pressure_defense":6.8,"experience":5.9,"pace_label":"Slow","pace_raw":63.3,"avg_height":77.5,"barthag":0.97,"rr":31.0,"em_rank":"5"},{"id":"illinois","name":"Illinois","seed":3,"region":"South","record":"24-8","is_ff":false,"archetype":"offensive_juggernaut","is_veteran":false,"is_length":true,"three_pt_prowess":6.9,"free_throw_gen":4.3,"off_efficiency":9.9,"ball_security":8.8,"off_rebounding":7.5,"def_efficiency":6.8,"opp_3pt_allowed":7.0,"rim_protection":6.2,"pressure_defense":1.0,"experience":5.0,"pace_label":"Slow","pace_raw":65.5,"avg_height":80.0,"barthag":0.968,"rr":28.9,"em_rank":"9"},{"id":"nebraska","name":"Nebraska","seed":4,"region":"South","record":"26-6","is_ff":false,"archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":7.2,"free_throw_gen":1.7,"off_efficiency":5.5,"ball_security":7.2,"off_rebounding":2.7,"def_efficiency":8.9,"opp_3pt_allowed":8.8,"rim_protection":3.1,"pressure_defense":5.7,"experience":8.4,"pace_label":"Slow","pace_raw":66.7,"avg_height":78.2,"barthag":0.931,"rr":22.3,"em_rank":"18"},{"id":"vanderbilt","name":"Vanderbilt","seed":5,"region":"South","record":"26-8","is_ff":false,"archetype":"offensive_juggernaut","is_veteran":true,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":6.8,"off_efficiency":8.3,"ball_security":8.7,"off_rebounding":4.6,"def_efficiency":6.7,"opp_3pt_allowed":6.1,"rim_protection":6.2,"pressure_defense":6.4,"experience":8.8,"pace_label":"Moderate","pace_raw":68.8,"avg_height":78.3,"barthag":0.946,"rr":24.0,"em_rank":"14"},{"id":"north_carolina","name":"North Carolina","seed":6,"region":"South","record":"24-8","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":true,"three_pt_prowess":5.5,"free_throw_gen":6.4,"off_efficiency":6.5,"ball_security":7.7,"off_rebounding":4.7,"def_efficiency":6.3,"opp_3pt_allowed":3.4,"rim_protection":3.0,"pressure_defense":3.0,"experience":3.5,"pace_label":"Moderate","pace_raw":67.9,"avg_height":79.2,"barthag":0.904,"rr":14.7,"em_rank":"48"},{"id":"saint_marys","name":"Saint Mary's","seed":7,"region":"South","record":"27-5","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":6.2,"free_throw_gen":5.7,"off_efficiency":6.1,"ball_security":4.4,"off_rebounding":7.0,"def_efficiency":7.4,"opp_3pt_allowed":7.2,"rim_protection":3.9,"pressure_defense":3.5,"experience":1.0,"pace_label":"Slow","pace_raw":65.2,"avg_height":78.9,"barthag":0.911,"rr":20.4,"em_rank":"23"},{"id":"clemson","name":"Clemson","seed":8,"region":"South","record":"24-10","is_ff":false,"archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":5.3,"free_throw_gen":6.3,"off_efficiency":4.8,"ball_security":7.4,"off_rebounding":3.4,"def_efficiency":7.4,"opp_3pt_allowed":5.6,"rim_protection":3.4,"pressure_defense":4.6,"experience":8.3,"pace_label":"Slow","pace_raw":64.2,"avg_height":77.6,"barthag":0.892,"rr":16.6,"em_rank":"38"},{"id":"iowa","name":"Iowa","seed":9,"region":"South","record":"21-12","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":5.8,"free_throw_gen":5.1,"off_efficiency":6.6,"ball_security":6.1,"off_rebounding":4.2,"def_efficiency":6.7,"opp_3pt_allowed":4.4,"rim_protection":1.5,"pressure_defense":6.2,"experience":4.2,"pace_label":"Slow","pace_raw":63.0,"avg_height":78.5,"barthag":0.907,"rr":20.1,"em_rank":"26"},{"id":"texas_am","name":"Texas A&M","seed":10,"region":"South","record":"21-11","is_ff":false,"archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":6.4,"off_efficiency":5.9,"ball_security":6.9,"off_rebounding":5.0,"def_efficiency":6.2,"opp_3pt_allowed":6.7,"rim_protection":3.3,"pressure_defense":5.9,"experience":9.5,"pace_label":"Fast","pace_raw":70.5,"avg_height":78.1,"barthag":0.872,"rr":16.4,"em_rank":"41"},{"id":"vcu","name":"VCU","seed":11,"region":"South","record":"27-7","is_ff":false,"archetype":"gunslinger","is_veteran":false,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":9.4,"off_efficiency":6.0,"ball_security":6.1,"off_rebounding":5.0,"def_efficiency":5.6,"opp_3pt_allowed":5.0,"rim_protection":5.1,"pressure_defense":5.6,"experience":5.0,"pace_label":"Moderate","pace_raw":68.5,"avg_height":77.8,"barthag":0.843,"rr":16.1,"em_rank":"42"},{"id":"mcneese","name":"McNeese","seed":12,"region":"South","record":"28-5","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.0,"free_throw_gen":6.8,"off_efficiency":4.0,"ball_security":7.3,"off_rebounding":6.1,"def_efficiency":5.9,"opp_3pt_allowed":5.7,"rim_protection":8.7,"pressure_defense":10.0,"experience":6.2,"pace_label":"Slow","pace_raw":66.2,"avg_height":76.8,"barthag":0.765,"rr":10.7,"em_rank":"65"},{"id":"troy","name":"Troy","seed":13,"region":"South","record":"22-11","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.4,"free_throw_gen":5.9,"off_efficiency":2.8,"ball_security":3.7,"off_rebounding":6.0,"def_efficiency":3.6,"opp_3pt_allowed":7.2,"rim_protection":3.4,"pressure_defense":5.5,"experience":3.5,"pace_label":"Slow","pace_raw":64.9,"avg_height":76.9,"barthag":0.543,"rr":4.5,"em_rank":"109"},{"id":"penn","name":"Penn","seed":14,"region":"South","record":"18-11","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.1,"free_throw_gen":5.4,"off_efficiency":1.6,"ball_security":5.8,"off_rebounding":4.2,"def_efficiency":4.6,"opp_3pt_allowed":6.7,"rim_protection":3.0,"pressure_defense":4.6,"experience":3.2,"pace_label":"Moderate","pace_raw":69.0,"avg_height":77.5,"barthag":0.532,"rr":0.9,"em_rank":"152"},{"id":"idaho","name":"Idaho","seed":15,"region":"South","record":"21-14","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.2,"free_throw_gen":5.2,"off_efficiency":2.1,"ball_security":6.4,"off_rebounding":3.7,"def_efficiency":4.2,"opp_3pt_allowed":3.0,"rim_protection":1.2,"pressure_defense":3.3,"experience":4.8,"pace_label":"Moderate","pace_raw":67.7,"avg_height":77.3,"barthag":0.57,"rr":0.1,"em_rank":"163"},{"id":"prairie_view_am","name":"Prairie View A&M","seed":16,"region":"South","record":"18-17","is_ff":true,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":null,"free_throw_gen":null,"off_efficiency":null,"ball_security":null,"off_rebounding":null,"def_efficiency":null,"opp_3pt_allowed":null,"rim_protection":null,"pressure_defense":null,"experience":null,"pace_label":"Slow","pace_raw":null,"avg_height":null,"barthag":0.255,"rr":-9.8,"em_rank":"288"},{"id":"lehigh","name":"Lehigh","seed":16,"region":"South","record":"18-16","is_ff":true,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":null,"free_throw_gen":null,"off_efficiency":null,"ball_security":null,"off_rebounding":null,"def_efficiency":null,"opp_3pt_allowed":null,"rim_protection":null,"pressure_defense":null,"experience":null,"pace_label":"Slow","pace_raw":null,"avg_height":null,"barthag":0.252,"rr":-8.5,"em_rank":"275"},{"id":"arizona","name":"Arizona","seed":1,"region":"West","record":"32-2","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":3.5,"free_throw_gen":9.0,"off_efficiency":8.7,"ball_security":6.1,"off_rebounding":7.3,"def_efficiency":9.7,"opp_3pt_allowed":7.0,"rim_protection":4.8,"pressure_defense":5.9,"experience":4.8,"pace_label":"Moderate","pace_raw":69.8,"avg_height":79.0,"barthag":0.978,"rr":32.0,"em_rank":"3"},{"id":"purdue","name":"Purdue","seed":2,"region":"West","record":"27-8","is_ff":false,"archetype":"offensive_juggernaut","is_veteran":true,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":2.3,"off_efficiency":10.0,"ball_security":8.4,"off_rebounding":6.6,"def_efficiency":6.4,"opp_3pt_allowed":3.7,"rim_protection":3.3,"pressure_defense":3.7,"experience":9.0,"pace_label":"Slow","pace_raw":64.4,"avg_height":78.5,"barthag":0.964,"rr":30.3,"em_rank":"6"},{"id":"gonzaga","name":"Gonzaga","seed":3,"region":"West","record":"30-3","is_ff":false,"archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":3.3,"free_throw_gen":3.5,"off_efficiency":6.7,"ball_security":8.1,"off_rebounding":6.0,"def_efficiency":8.4,"opp_3pt_allowed":7.7,"rim_protection":5.2,"pressure_defense":6.9,"experience":10.0,"pace_label":"Moderate","pace_raw":68.6,"avg_height":78.4,"barthag":0.95,"rr":27.7,"em_rank":"10"},{"id":"arkansas","name":"Arkansas","seed":4,"region":"West","record":"26-8","is_ff":false,"archetype":"offensive_juggernaut","is_veteran":false,"is_length":true,"three_pt_prowess":5.9,"free_throw_gen":6.0,"off_efficiency":8.7,"ball_security":10.0,"off_rebounding":5.0,"def_efficiency":6.0,"opp_3pt_allowed":6.7,"rim_protection":6.4,"pressure_defense":5.0,"experience":4.9,"pace_label":"Fast","pace_raw":71.0,"avg_height":78.5,"barthag":0.936,"rr":23.8,"em_rank":"15"},{"id":"wisconsin","name":"Wisconsin","seed":5,"region":"West","record":"24-10","is_ff":false,"archetype":"sniper_system","is_veteran":true,"is_length":true,"three_pt_prowess":7.8,"free_throw_gen":3.9,"off_efficiency":7.8,"ball_security":9.3,"off_rebounding":3.9,"def_efficiency":5.9,"opp_3pt_allowed":4.8,"rim_protection":3.0,"pressure_defense":3.3,"experience":8.3,"pace_label":"Moderate","pace_raw":68.7,"avg_height":78.8,"barthag":0.929,"rr":21.7,"em_rank":"21"},{"id":"byu","name":"BYU","seed":6,"region":"West","record":"23-11","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.2,"free_throw_gen":4.9,"off_efficiency":7.9,"ball_security":6.0,"off_rebounding":5.9,"def_efficiency":5.8,"opp_3pt_allowed":2.4,"rim_protection":5.6,"pressure_defense":5.3,"experience":5.0,"pace_label":"Moderate","pace_raw":69.9,"avg_height":78.4,"barthag":0.889,"rr":16.5,"em_rank":"39"},{"id":"miami_fl","name":"Miami (FL)","seed":7,"region":"West","record":"25-8","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.7,"free_throw_gen":6.5,"off_efficiency":6.5,"ball_security":4.8,"off_rebounding":6.8,"def_efficiency":6.3,"opp_3pt_allowed":2.3,"rim_protection":4.1,"pressure_defense":6.4,"experience":5.6,"pace_label":"Moderate","pace_raw":67.6,"avg_height":78.2,"barthag":0.887,"rr":18.6,"em_rank":"28"},{"id":"villanova","name":"Villanova","seed":8,"region":"West","record":"24-8","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.3,"free_throw_gen":3.6,"off_efficiency":6.1,"ball_security":6.2,"off_rebounding":5.1,"def_efficiency":6.4,"opp_3pt_allowed":4.1,"rim_protection":1.0,"pressure_defense":6.1,"experience":6.1,"pace_label":"Slow","pace_raw":65.2,"avg_height":77.8,"barthag":0.88,"rr":15.0,"em_rank":"47"},{"id":"utah_state","name":"Utah State","seed":9,"region":"West","record":"28-6","is_ff":false,"archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":7.0,"off_efficiency":6.7,"ball_security":5.8,"off_rebounding":5.3,"def_efficiency":6.0,"opp_3pt_allowed":4.1,"rim_protection":3.2,"pressure_defense":7.5,"experience":8.7,"pace_label":"Moderate","pace_raw":67.7,"avg_height":77.7,"barthag":0.895,"rr":17.6,"em_rank":"32"},{"id":"missouri","name":"Missouri","seed":10,"region":"West","record":"20-12","is_ff":false,"archetype":"system_operator","is_veteran":true,"is_length":true,"three_pt_prowess":4.6,"free_throw_gen":8.8,"off_efficiency":5.8,"ball_security":2.3,"off_rebounding":6.3,"def_efficiency":5.2,"opp_3pt_allowed":1.0,"rim_protection":4.4,"pressure_defense":4.8,"experience":7.6,"pace_label":"Slow","pace_raw":66.2,"avg_height":79.3,"barthag":0.851,"rr":14.4,"em_rank":"49"},{"id":"texas","name":"Texas","seed":11,"region":"West","record":"18-14","is_ff":true,"archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":4.5,"free_throw_gen":10.0,"off_efficiency":7.7,"ball_security":6.0,"off_rebounding":6.3,"def_efficiency":4.6,"opp_3pt_allowed":1.6,"rim_protection":2.1,"pressure_defense":3.3,"experience":10.0,"pace_label":"Slow","pace_raw":66.9,"avg_height":78.3,"barthag":0.854,"rr":17.1,"em_rank":"34"},{"id":"nc_state","name":"NC State","seed":11,"region":"West","record":"20-13","is_ff":true,"archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":7.6,"free_throw_gen":5.4,"off_efficiency":7.4,"ball_security":8.9,"off_rebounding":3.5,"def_efficiency":5.1,"opp_3pt_allowed":2.1,"rim_protection":4.6,"pressure_defense":6.5,"experience":7.6,"pace_label":"Moderate","pace_raw":69.1,"avg_height":77.7,"barthag":0.876,"rr":16.5,"em_rank":"40"},{"id":"high_point","name":"High Point","seed":12,"region":"West","record":"30-4","is_ff":false,"archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":9.0,"off_efficiency":4.9,"ball_security":9.1,"off_rebounding":4.9,"def_efficiency":3.7,"opp_3pt_allowed":6.4,"rim_protection":4.9,"pressure_defense":9.3,"experience":7.8,"pace_label":"Moderate","pace_raw":69.9,"avg_height":78.3,"barthag":0.699,"rr":8.6,"em_rank":"79"},{"id":"hawaii","name":"Hawai'i","seed":13,"region":"West","record":"24-8","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":true,"three_pt_prowess":3.7,"free_throw_gen":8.7,"off_efficiency":1.5,"ball_security":1.1,"off_rebounding":4.7,"def_efficiency":6.1,"opp_3pt_allowed":7.9,"rim_protection":4.1,"pressure_defense":4.2,"experience":5.6,"pace_label":"Moderate","pace_raw":69.7,"avg_height":78.7,"barthag":0.635,"rr":3.3,"em_rank":"120"},{"id":"kennesaw_state","name":"Kennesaw State","seed":14,"region":"West","record":"21-13","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.2,"free_throw_gen":10.0,"off_efficiency":2.7,"ball_security":4.1,"off_rebounding":6.3,"def_efficiency":3.3,"opp_3pt_allowed":4.1,"rim_protection":7.8,"pressure_defense":4.4,"experience":3.2,"pace_label":"Fast","pace_raw":71.2,"avg_height":78.2,"barthag":0.534,"rr":1.0,"em_rank":"150"},{"id":"queens","name":"Queens","seed":15,"region":"West","record":"21-13","is_ff":false,"archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":5.9,"off_efficiency":4.5,"ball_security":6.6,"off_rebounding":4.3,"def_efficiency":1.0,"opp_3pt_allowed":1.8,"rim_protection":2.6,"pressure_defense":3.4,"experience":3.6,"pace_label":"Moderate","pace_raw":69.6,"avg_height":77.4,"barthag":0.44,"rr":-2.1,"em_rank":"194"},{"id":"liu","name":"Long Island University","seed":16,"region":"West","record":"24-10","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.9,"free_throw_gen":5.2,"off_efficiency":1.0,"ball_security":1.0,"off_rebounding":5.8,"def_efficiency":3.4,"opp_3pt_allowed":6.4,"rim_protection":7.2,"pressure_defense":6.4,"experience":2.7,"pace_label":"Moderate","pace_raw":67.8,"avg_height":77.5,"barthag":0.34,"rr":-3.3,"em_rank":"207"},{"id":"michigan","name":"Michigan","seed":1,"region":"Midwest","record":"31-3","is_ff":false,"archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":6.0,"free_throw_gen":6.6,"off_efficiency":8.3,"ball_security":4.1,"off_rebounding":6.2,"def_efficiency":10.0,"opp_3pt_allowed":8.5,"rim_protection":8.7,"pressure_defense":3.2,"experience":7.2,"pace_label":"Fast","pace_raw":70.9,"avg_height":78.7,"barthag":0.98,"rr":34.5,"em_rank":"2"},{"id":"iowa_state","name":"Iowa State","seed":2,"region":"Midwest","record":"27-7","is_ff":false,"archetype":"two_way_machine","is_veteran":true,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":4.9,"off_efficiency":7.3,"ball_security":6.2,"off_rebounding":6.2,"def_efficiency":9.2,"opp_3pt_allowed":6.2,"rim_protection":3.0,"pressure_defense":8.1,"experience":9.3,"pace_label":"Slow","pace_raw":66.5,"avg_height":78.2,"barthag":0.966,"rr":29.5,"em_rank":"7"},{"id":"virginia","name":"Virginia","seed":3,"region":"Midwest","record":"29-5","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":4.4,"off_efficiency":6.9,"ball_security":5.0,"off_rebounding":7.2,"def_efficiency":7.8,"opp_3pt_allowed":7.6,"rim_protection":10.0,"pressure_defense":4.6,"experience":6.8,"pace_label":"Slow","pace_raw":65.7,"avg_height":78.4,"barthag":0.943,"rr":24.1,"em_rank":"13"},{"id":"alabama","name":"Alabama","seed":4,"region":"Midwest","record":"23-9","is_ff":false,"archetype":"offensive_juggernaut","is_veteran":false,"is_length":false,"three_pt_prowess":7.9,"free_throw_gen":6.3,"off_efficiency":9.1,"ball_security":9.1,"off_rebounding":4.8,"def_efficiency":5.4,"opp_3pt_allowed":4.6,"rim_protection":5.1,"pressure_defense":3.8,"experience":6.9,"pace_label":"Fast","pace_raw":73.1,"avg_height":78.3,"barthag":0.934,"rr":23.2,"em_rank":"17"},{"id":"texas_tech","name":"Texas Tech","seed":5,"region":"Midwest","record":"22-10","is_ff":false,"archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":8.5,"free_throw_gen":1.6,"off_efficiency":7.7,"ball_security":5.2,"off_rebounding":5.4,"def_efficiency":6.6,"opp_3pt_allowed":6.9,"rim_protection":3.7,"pressure_defense":3.7,"experience":7.2,"pace_label":"Slow","pace_raw":66.2,"avg_height":77.8,"barthag":0.944,"rr":18.3,"em_rank":"29"},{"id":"tennessee","name":"Tennessee","seed":6,"region":"Midwest","record":"22-11","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":3.2,"free_throw_gen":7.0,"off_efficiency":6.4,"ball_security":3.6,"off_rebounding":10.0,"def_efficiency":8.1,"opp_3pt_allowed":8.0,"rim_protection":5.1,"pressure_defense":6.0,"experience":5.0,"pace_label":"Slow","pace_raw":65.0,"avg_height":78.4,"barthag":0.941,"rr":23.5,"em_rank":"16"},{"id":"kentucky","name":"Kentucky","seed":7,"region":"Midwest","record":"21-13","is_ff":false,"archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":4.7,"free_throw_gen":6.5,"off_efficiency":6.2,"ball_security":6.4,"off_rebounding":5.6,"def_efficiency":6.8,"opp_3pt_allowed":6.8,"rim_protection":5.9,"pressure_defense":5.2,"experience":4.4,"pace_label":"Moderate","pace_raw":68.3,"avg_height":78.8,"barthag":0.89,"rr":20.2,"em_rank":"25"},{"id":"georgia","name":"Georgia","seed":8,"region":"Midwest","record":"22-10","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":6.2,"off_efficiency":7.6,"ball_security":7.3,"off_rebounding":6.1,"def_efficiency":5.1,"opp_3pt_allowed":4.3,"rim_protection":8.1,"pressure_defense":6.2,"experience":6.2,"pace_label":"Fast","pace_raw":71.4,"avg_height":77.4,"barthag":0.876,"rr":18.2,"em_rank":"30"},{"id":"saint_louis","name":"Saint Louis","seed":9,"region":"Midwest","record":"28-5","is_ff":false,"archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":8.6,"free_throw_gen":5.2,"off_efficiency":5.8,"ball_security":3.1,"off_rebounding":4.5,"def_efficiency":6.1,"opp_3pt_allowed":8.7,"rim_protection":3.7,"pressure_defense":4.9,"experience":8.0,"pace_label":"Fast","pace_raw":71.0,"avg_height":77.5,"barthag":0.873,"rr":17.7,"em_rank":"31"},{"id":"santa_clara","name":"Santa Clara","seed":10,"region":"Midwest","record":"26-8","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":1.0,"off_efficiency":7.2,"ball_security":5.6,"off_rebounding":6.7,"def_efficiency":5.1,"opp_3pt_allowed":5.1,"rim_protection":4.5,"pressure_defense":7.5,"experience":1.8,"pace_label":"Moderate","pace_raw":69.2,"avg_height":78.5,"barthag":0.895,"rr":16.9,"em_rank":"36"},{"id":"miami_ohio","name":"Miami (Ohio)","seed":11,"region":"Midwest","record":"31-1","is_ff":true,"archetype":"gunslinger","is_veteran":false,"is_length":false,"three_pt_prowess":7.2,"free_throw_gen":7.7,"off_efficiency":4.9,"ball_security":7.0,"off_rebounding":2.3,"def_efficiency":3.8,"opp_3pt_allowed":5.1,"rim_protection":2.6,"pressure_defense":4.8,"experience":6.5,"pace_label":"Moderate","pace_raw":69.9,"avg_height":77.5,"barthag":0.718,"rr":8.1,"em_rank":"84"},{"id":"smu","name":"SMU","seed":11,"region":"Midwest","record":"20-13","is_ff":true,"archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":5.7,"free_throw_gen":3.3,"off_efficiency":7.0,"ball_security":5.2,"off_rebounding":6.2,"def_efficiency":5.0,"opp_3pt_allowed":4.1,"rim_protection":5.1,"pressure_defense":5.1,"experience":10.0,"pace_label":"Moderate","pace_raw":68.5,"avg_height":78.0,"barthag":0.861,"rr":16.6,"em_rank":"37"},{"id":"akron","name":"Akron","seed":12,"region":"Midwest","record":"29-5","is_ff":false,"archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":7.6,"free_throw_gen":2.6,"off_efficiency":5.6,"ball_security":5.7,"off_rebounding":5.5,"def_efficiency":4.6,"opp_3pt_allowed":2.7,"rim_protection":2.9,"pressure_defense":5.3,"experience":5.2,"pace_label":"Fast","pace_raw":70.3,"avg_height":75.9,"barthag":0.773,"rr":11.2,"em_rank":"62"},{"id":"hofstra","name":"Hofstra","seed":13,"region":"Midwest","record":"24-10","is_ff":false,"archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":6.6,"free_throw_gen":4.2,"off_efficiency":4.1,"ball_security":4.8,"off_rebounding":6.0,"def_efficiency":4.9,"opp_3pt_allowed":6.0,"rim_protection":4.4,"pressure_defense":2.6,"experience":4.6,"pace_label":"Slow","pace_raw":64.7,"avg_height":77.4,"barthag":0.705,"rr":10.0,"em_rank":"74"},{"id":"wright_state","name":"Wright State","seed":14,"region":"Midwest","record":"23-11","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":4.7,"free_throw_gen":6.7,"off_efficiency":3.2,"ball_security":4.6,"off_rebounding":5.4,"def_efficiency":3.3,"opp_3pt_allowed":4.4,"rim_protection":5.2,"pressure_defense":5.3,"experience":3.1,"pace_label":"Moderate","pace_raw":67.2,"avg_height":77.0,"barthag":0.586,"rr":1.3,"em_rank":"148"},{"id":"tennessee_state","name":"Tennessee State","seed":15,"region":"Midwest","record":"23-9","is_ff":false,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.1,"free_throw_gen":4.6,"off_efficiency":2.2,"ball_security":4.4,"off_rebounding":6.0,"def_efficiency":3.0,"opp_3pt_allowed":4.6,"rim_protection":4.2,"pressure_defense":7.6,"experience":5.3,"pace_label":"Fast","pace_raw":70.2,"avg_height":77.0,"barthag":0.395,"rr":0.4,"em_rank":"160"},{"id":"howard","name":"Howard","seed":16,"region":"Midwest","record":"23-10","is_ff":true,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":4.2,"free_throw_gen":9.6,"off_efficiency":1.0,"ball_security":1.0,"off_rebounding":6.7,"def_efficiency":4.5,"opp_3pt_allowed":8.2,"rim_protection":4.6,"pressure_defense":7.3,"experience":3.7,"pace_label":"Moderate","pace_raw":69.0,"avg_height":76.2,"barthag":0.425,"rr":-1.1,"em_rank":"181"},{"id":"umbc","name":"UMBC","seed":16,"region":"Midwest","record":"24-8","is_ff":true,"archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":4.8,"off_efficiency":1.9,"ball_security":7.6,"off_rebounding":2.2,"def_efficiency":3.3,"opp_3pt_allowed":6.1,"rim_protection":1.4,"pressure_defense":2.5,"experience":3.0,"pace_label":"Slow","pace_raw":66.2,"avg_height":77.2,"barthag":0.456,"rr":-0.1,"em_rank":"165"}],"archetypes":[{"id":"two_way_machine","name":"Two-Way Machine","description":"Elite on both ends. No glaring weakness. Blue-blood tournament profile.","color":"#1a6b3a"},{"id":"offensive_juggernaut","name":"Offensive Juggernaut","description":"Historically elite offense scoring from everywhere. Defense is secondary.","color":"#c2410c"},{"id":"defensive_fortress","name":"Defensive Fortress","description":"Suffocating defense with rim protection and arc lockdown. Every game is a grind.","color":"#0d3b6e"},{"id":"gunslinger","name":"Gunslinger","description":"High 3-point volume AND gets to the line relentlessly. Forces impossible defensive choices.","color":"#7c3aed"},{"id":"sniper_system","name":"Sniper System","description":"Lives and dies by the 3. High volume and efficiency from deep.","color":"#0891b2"},{"id":"system_operator","name":"System Operator","description":"Wins through execution — low turnovers, efficient half-court, disciplined IQ basketball.","color":"#475569"}]};

// ── Matchup data (bracket structure + team profiles) ──────────────────────────
const MATCHUP_DATA = [{"round":"First Four","region":"Midwest","date":"2026-03-17","time":"18:40","site":"Dayton, OH","is_ff":true,"team1_name":"UMBC","team2_name":"Howard","team1":{"id":"umbc","name":"UMBC","seed":16,"region":"Midwest","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":4.8,"off_efficiency":1.9,"ball_security":7.6,"off_rebounding":2.2,"def_efficiency":3.3,"opp_3pt_allowed":6.1,"rim_protection":1.4,"pressure_defense":2.5,"experience":3.0,"pace_label":"Slow","avg_height":77.2,"barthag":0.456,"rr":-0.1,"em_rank":"165"},"team2":{"id":"howard","name":"Howard","seed":16,"region":"Midwest","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":4.2,"free_throw_gen":9.6,"off_efficiency":1.0,"ball_security":1.0,"off_rebounding":6.7,"def_efficiency":4.5,"opp_3pt_allowed":8.2,"rim_protection":4.6,"pressure_defense":7.3,"experience":3.7,"pace_label":"Moderate","avg_height":76.2,"barthag":0.425,"rr":-1.1,"em_rank":"181"}},{"round":"First Four","region":"West","date":"2026-03-17","time":"21:15","site":"Dayton, OH","is_ff":true,"team1_name":"Texas","team2_name":"NC State","team1":{"id":"texas","name":"Texas","seed":11,"region":"West","archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":4.5,"free_throw_gen":10.0,"off_efficiency":7.7,"ball_security":6.0,"off_rebounding":6.3,"def_efficiency":4.6,"opp_3pt_allowed":1.6,"rim_protection":2.1,"pressure_defense":3.3,"experience":10.0,"pace_label":"Slow","avg_height":78.3,"barthag":0.854,"rr":17.1,"em_rank":"34"},"team2":{"id":"nc_state","name":"NC State","seed":11,"region":"West","archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":7.6,"free_throw_gen":5.4,"off_efficiency":7.4,"ball_security":8.9,"off_rebounding":3.5,"def_efficiency":5.1,"opp_3pt_allowed":2.1,"rim_protection":4.6,"pressure_defense":6.5,"experience":7.6,"pace_label":"Moderate","avg_height":77.7,"barthag":0.876,"rr":16.5,"em_rank":"40"}},{"round":"First Four","region":"South","date":"2026-03-18","time":"18:40","site":"Dayton, OH","is_ff":true,"team1_name":"Prairie View A&M","team2_name":"Lehigh","team1":{"id":"prairie_view_am","name":"Prairie View A&M","seed":16,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":null,"free_throw_gen":null,"off_efficiency":null,"ball_security":null,"off_rebounding":null,"def_efficiency":null,"opp_3pt_allowed":null,"rim_protection":null,"pressure_defense":null,"experience":null,"pace_label":"Slow","avg_height":null,"barthag":0.255,"rr":-9.8,"em_rank":"288"},"team2":{"id":"lehigh","name":"Lehigh","seed":16,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":null,"free_throw_gen":null,"off_efficiency":null,"ball_security":null,"off_rebounding":null,"def_efficiency":null,"opp_3pt_allowed":null,"rim_protection":null,"pressure_defense":null,"experience":null,"pace_label":"Slow","avg_height":null,"barthag":0.252,"rr":-8.5,"em_rank":"275"}},{"round":"First Four","region":"Midwest","date":"2026-03-18","time":"21:15","site":"Dayton, OH","is_ff":true,"team1_name":"Miami (Ohio)","team2_name":"SMU","team1":{"id":"miami_ohio","name":"Miami (Ohio)","seed":11,"region":"Midwest","archetype":"gunslinger","is_veteran":false,"is_length":false,"three_pt_prowess":7.2,"free_throw_gen":7.7,"off_efficiency":4.9,"ball_security":7.0,"off_rebounding":2.3,"def_efficiency":3.8,"opp_3pt_allowed":5.1,"rim_protection":2.6,"pressure_defense":4.8,"experience":6.5,"pace_label":"Moderate","avg_height":77.5,"barthag":0.718,"rr":8.1,"em_rank":"84"},"team2":{"id":"smu","name":"SMU","seed":11,"region":"Midwest","archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":5.7,"free_throw_gen":3.3,"off_efficiency":7.0,"ball_security":5.2,"off_rebounding":6.2,"def_efficiency":5.0,"opp_3pt_allowed":4.1,"rim_protection":5.1,"pressure_defense":5.1,"experience":10.0,"pace_label":"Moderate","avg_height":78.0,"barthag":0.861,"rr":16.6,"em_rank":"37"}},{"round":"First Round","region":"East","date":"2026-03-19","time":"","site":"Greenville, SC","is_ff":false,"team1_name":"Duke","team2_name":"Siena","team1":{"id":"duke","name":"Duke","seed":1,"region":"East","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":6.1,"free_throw_gen":6.6,"off_efficiency":8.8,"ball_security":5.4,"off_rebounding":7.3,"def_efficiency":10.0,"opp_3pt_allowed":8.2,"rim_protection":4.4,"pressure_defense":6.5,"experience":1.6,"pace_label":"Slow","avg_height":79.3,"barthag":0.981,"rr":34.8,"em_rank":"1"},"team2":{"id":"siena","name":"Siena","seed":16,"region":"East","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":1.9,"free_throw_gen":4.9,"off_efficiency":1.5,"ball_security":5.0,"off_rebounding":4.9,"def_efficiency":3.6,"opp_3pt_allowed":5.4,"rim_protection":3.4,"pressure_defense":4.2,"experience":2.9,"pace_label":"Slow","avg_height":76.7,"barthag":0.455,"rr":-0.1,"em_rank":"166"}},{"round":"First Round","region":"East","date":"2026-03-19","time":"","site":"Greenville, SC","is_ff":false,"team1_name":"Ohio State","team2_name":"TCU","team1":{"id":"ohio_state","name":"Ohio State","seed":8,"region":"East","archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":5.7,"free_throw_gen":6.6,"off_efficiency":7.5,"ball_security":5.7,"off_rebounding":4.4,"def_efficiency":5.8,"opp_3pt_allowed":6.8,"rim_protection":1.6,"pressure_defense":2.4,"experience":7.5,"pace_label":"Slow","avg_height":77.9,"barthag":0.917,"rr":21.2,"em_rank":"22"},"team2":{"id":"tcu","name":"TCU","seed":9,"region":"East","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":3.9,"free_throw_gen":7.0,"off_efficiency":4.4,"ball_security":5.7,"off_rebounding":5.8,"def_efficiency":7.2,"opp_3pt_allowed":4.3,"rim_protection":6.2,"pressure_defense":5.9,"experience":5.7,"pace_label":"Moderate","avg_height":76.4,"barthag":0.837,"rr":16.0,"em_rank":"43"}},{"round":"First Round","region":"East","date":"2026-03-20","time":"","site":"San Diego, CA","is_ff":false,"team1_name":"St. John's","team2_name":"Northern Iowa","team1":{"id":"st_johns","name":"St. John's","seed":5,"region":"East","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":3.4,"free_throw_gen":8.5,"off_efficiency":6.0,"ball_security":6.8,"off_rebounding":6.4,"def_efficiency":8.3,"opp_3pt_allowed":7.2,"rim_protection":6.0,"pressure_defense":6.1,"experience":7.9,"pace_label":"Moderate","avg_height":78.2,"barthag":0.942,"rr":25.5,"em_rank":"11"},"team2":{"id":"northern_iowa","name":"Northern Iowa","seed":12,"region":"East","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":5.2,"free_throw_gen":1.0,"off_efficiency":2.5,"ball_security":6.9,"off_rebounding":1.0,"def_efficiency":7.1,"opp_3pt_allowed":10.0,"rim_protection":4.0,"pressure_defense":4.8,"experience":6.5,"pace_label":"Slow","avg_height":77.6,"barthag":0.774,"rr":10.6,"em_rank":"67"}},{"round":"First Round","region":"East","date":"2026-03-20","time":"","site":"San Diego, CA","is_ff":false,"team1_name":"Kansas","team2_name":"Cal Baptist","team1":{"id":"kansas","name":"Kansas","seed":4,"region":"East","archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":4.5,"free_throw_gen":4.2,"off_efficiency":5.4,"ball_security":5.7,"off_rebounding":3.9,"def_efficiency":8.4,"opp_3pt_allowed":7.9,"rim_protection":8.5,"pressure_defense":3.2,"experience":5.6,"pace_label":"Moderate","avg_height":78.7,"barthag":0.928,"rr":21.9,"em_rank":"19"},"team2":{"id":"cal_baptist","name":"Cal Baptist","seed":13,"region":"East","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.3,"free_throw_gen":5.8,"off_efficiency":1.8,"ball_security":2.2,"off_rebounding":7.2,"def_efficiency":5.9,"opp_3pt_allowed":9.1,"rim_protection":2.2,"pressure_defense":3.2,"experience":4.0,"pace_label":"Slow","avg_height":76.5,"barthag":0.689,"rr":3.7,"em_rank":"118"}},{"round":"First Round","region":"East","date":"2026-03-19","time":"","site":"Buffalo, NY","is_ff":false,"team1_name":"Louisville","team2_name":"South Florida","team1":{"id":"louisville","name":"Louisville","seed":6,"region":"East","archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":7.7,"free_throw_gen":4.6,"off_efficiency":7.4,"ball_security":4.5,"off_rebounding":5.2,"def_efficiency":6.9,"opp_3pt_allowed":5.5,"rim_protection":3.5,"pressure_defense":4.8,"experience":8.9,"pace_label":"Moderate","avg_height":78.4,"barthag":0.936,"rr":21.8,"em_rank":"20"},"team2":{"id":"south_florida","name":"South Florida","seed":11,"region":"East","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.0,"free_throw_gen":8.1,"off_efficiency":5.1,"ball_security":6.1,"off_rebounding":7.3,"def_efficiency":6.2,"opp_3pt_allowed":4.1,"rim_protection":4.8,"pressure_defense":6.8,"experience":4.7,"pace_label":"Fast","avg_height":77.1,"barthag":0.836,"rr":15.8,"em_rank":"44"}},{"round":"First Round","region":"East","date":"2026-03-19","time":"","site":"Buffalo, NY","is_ff":false,"team1_name":"Michigan State","team2_name":"North Dakota State","team1":{"id":"michigan_state","name":"Michigan State","seed":3,"region":"East","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":5.1,"free_throw_gen":5.9,"off_efficiency":7.0,"ball_security":3.6,"off_rebounding":7.4,"def_efficiency":8.2,"opp_3pt_allowed":5.3,"rim_protection":6.7,"pressure_defense":2.9,"experience":4.0,"pace_label":"Slow","avg_height":78.7,"barthag":0.944,"rr":24.6,"em_rank":"12"},"team2":{"id":"north_dakota_state","name":"North Dakota State","seed":14,"region":"East","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":3.3,"off_efficiency":3.1,"ball_security":5.6,"off_rebounding":5.5,"def_efficiency":4.4,"opp_3pt_allowed":4.6,"rim_protection":3.3,"pressure_defense":6.2,"experience":3.7,"pace_label":"Slow","avg_height":76.2,"barthag":0.904,"rr":14.7,"em_rank":"48"}},{"round":"First Round","region":"East","date":"2026-03-20","time":"","site":"Philadelphia, PA","is_ff":false,"team1_name":"UCLA","team2_name":"UCF","team1":{"id":"ucla","name":"UCLA","seed":7,"region":"East","archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":4.4,"off_efficiency":7.3,"ball_security":8.5,"off_rebounding":4.5,"def_efficiency":5.8,"opp_3pt_allowed":6.6,"rim_protection":3.7,"pressure_defense":5.0,"experience":9.1,"pace_label":"Slow","avg_height":78.0,"barthag":0.911,"rr":20.3,"em_rank":"24"},"team2":{"id":"ucf","name":"UCF","seed":10,"region":"East","archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":4.8,"free_throw_gen":3.4,"off_efficiency":6.2,"ball_security":5.4,"off_rebounding":5.8,"def_efficiency":4.8,"opp_3pt_allowed":4.0,"rim_protection":2.8,"pressure_defense":3.1,"experience":8.3,"pace_label":"Moderate","avg_height":78.6,"barthag":0.812,"rr":11.3,"em_rank":"61"}},{"round":"First Round","region":"East","date":"2026-03-20","time":"","site":"Philadelphia, PA","is_ff":false,"team1_name":"UConn","team2_name":"Furman","team1":{"id":"uconn","name":"UConn","seed":2,"region":"East","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":5.4,"free_throw_gen":3.0,"off_efficiency":6.7,"ball_security":4.0,"off_rebounding":6.3,"def_efficiency":8.4,"opp_3pt_allowed":8.3,"rim_protection":8.2,"pressure_defense":5.4,"experience":8.6,"pace_label":"Slow","avg_height":78.6,"barthag":null,"rr":null,"em_rank":""},"team2":{"id":"furman","name":"Furman","seed":15,"region":"East","archetype":"system_operator","is_veteran":false,"is_length":true,"three_pt_prowess":5.5,"free_throw_gen":4.0,"off_efficiency":1.7,"ball_security":2.6,"off_rebounding":4.5,"def_efficiency":3.5,"opp_3pt_allowed":5.6,"rim_protection":3.7,"pressure_defense":1.9,"experience":3.0,"pace_label":"Slow","avg_height":79.2,"barthag":0.444,"rr":0.9,"em_rank":"153"}},{"round":"First Round","region":"South","date":"2026-03-20","time":"","site":"Tampa, FL","is_ff":false,"team1_name":"Florida","team2_name":"Prairie View A&M / Lehigh (FF winner)","team1":{"id":"florida","name":"Florida","seed":1,"region":"South","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":2.9,"free_throw_gen":7.2,"off_efficiency":7.9,"ball_security":4.4,"off_rebounding":9.2,"def_efficiency":9.1,"opp_3pt_allowed":5.9,"rim_protection":6.0,"pressure_defense":4.3,"experience":6.5,"pace_label":"Fast","avg_height":78.9,"barthag":0.973,"rr":31.4,"em_rank":"4"},"team2":null},{"round":"First Round","region":"South","date":"2026-03-20","time":"","site":"Tampa, FL","is_ff":false,"team1_name":"Clemson","team2_name":"Iowa","team1":{"id":"clemson","name":"Clemson","seed":8,"region":"South","archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":5.3,"free_throw_gen":6.3,"off_efficiency":4.8,"ball_security":7.4,"off_rebounding":3.4,"def_efficiency":7.4,"opp_3pt_allowed":5.6,"rim_protection":3.4,"pressure_defense":4.6,"experience":8.3,"pace_label":"Slow","avg_height":77.6,"barthag":0.892,"rr":16.6,"em_rank":"38"},"team2":{"id":"iowa","name":"Iowa","seed":9,"region":"South","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":5.8,"free_throw_gen":5.1,"off_efficiency":6.6,"ball_security":6.1,"off_rebounding":4.2,"def_efficiency":6.7,"opp_3pt_allowed":4.4,"rim_protection":1.5,"pressure_defense":6.2,"experience":4.2,"pace_label":"Slow","avg_height":78.5,"barthag":0.907,"rr":20.1,"em_rank":"26"}},{"round":"First Round","region":"South","date":"2026-03-19","time":"","site":"Oklahoma City, OK","is_ff":false,"team1_name":"Vanderbilt","team2_name":"McNeese","team1":{"id":"vanderbilt","name":"Vanderbilt","seed":5,"region":"South","archetype":"offensive_juggernaut","is_veteran":true,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":6.8,"off_efficiency":8.3,"ball_security":8.7,"off_rebounding":4.6,"def_efficiency":6.7,"opp_3pt_allowed":6.1,"rim_protection":6.2,"pressure_defense":6.4,"experience":8.8,"pace_label":"Moderate","avg_height":78.3,"barthag":0.946,"rr":24.0,"em_rank":"14"},"team2":{"id":"mcneese","name":"McNeese","seed":12,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.0,"free_throw_gen":6.8,"off_efficiency":4.0,"ball_security":7.3,"off_rebounding":6.1,"def_efficiency":5.9,"opp_3pt_allowed":5.7,"rim_protection":8.7,"pressure_defense":10.0,"experience":6.2,"pace_label":"Slow","avg_height":76.8,"barthag":0.765,"rr":10.7,"em_rank":"65"}},{"round":"First Round","region":"South","date":"2026-03-19","time":"","site":"Oklahoma City, OK","is_ff":false,"team1_name":"Nebraska","team2_name":"Troy","team1":{"id":"nebraska","name":"Nebraska","seed":4,"region":"South","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":7.2,"free_throw_gen":1.7,"off_efficiency":5.5,"ball_security":7.2,"off_rebounding":2.7,"def_efficiency":8.9,"opp_3pt_allowed":8.8,"rim_protection":3.1,"pressure_defense":5.7,"experience":8.4,"pace_label":"Slow","avg_height":78.2,"barthag":0.931,"rr":22.3,"em_rank":"18"},"team2":{"id":"troy","name":"Troy","seed":13,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.4,"free_throw_gen":5.9,"off_efficiency":2.8,"ball_security":3.7,"off_rebounding":6.0,"def_efficiency":3.6,"opp_3pt_allowed":7.2,"rim_protection":3.4,"pressure_defense":5.5,"experience":3.5,"pace_label":"Slow","avg_height":76.9,"barthag":0.543,"rr":4.5,"em_rank":"109"}},{"round":"First Round","region":"South","date":"2026-03-19","time":"","site":"Greenville, SC","is_ff":false,"team1_name":"North Carolina","team2_name":"VCU","team1":{"id":"north_carolina","name":"North Carolina","seed":6,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":true,"three_pt_prowess":5.5,"free_throw_gen":6.4,"off_efficiency":6.5,"ball_security":7.7,"off_rebounding":4.7,"def_efficiency":6.3,"opp_3pt_allowed":3.4,"rim_protection":3.0,"pressure_defense":3.0,"experience":3.5,"pace_label":"Moderate","avg_height":79.2,"barthag":0.904,"rr":14.7,"em_rank":"48"},"team2":{"id":"vcu","name":"VCU","seed":11,"region":"South","archetype":"gunslinger","is_veteran":false,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":9.4,"off_efficiency":6.0,"ball_security":6.1,"off_rebounding":5.0,"def_efficiency":5.6,"opp_3pt_allowed":5.0,"rim_protection":5.1,"pressure_defense":5.6,"experience":5.0,"pace_label":"Moderate","avg_height":77.8,"barthag":0.843,"rr":16.1,"em_rank":"42"}},{"round":"First Round","region":"South","date":"2026-03-19","time":"","site":"Greenville, SC","is_ff":false,"team1_name":"Illinois","team2_name":"Penn","team1":{"id":"illinois","name":"Illinois","seed":3,"region":"South","archetype":"offensive_juggernaut","is_veteran":false,"is_length":true,"three_pt_prowess":6.9,"free_throw_gen":4.3,"off_efficiency":9.9,"ball_security":8.8,"off_rebounding":7.5,"def_efficiency":6.8,"opp_3pt_allowed":7.0,"rim_protection":6.2,"pressure_defense":1.0,"experience":5.0,"pace_label":"Slow","avg_height":80.0,"barthag":0.968,"rr":28.9,"em_rank":"9"},"team2":{"id":"penn","name":"Penn","seed":14,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.1,"free_throw_gen":5.4,"off_efficiency":1.6,"ball_security":5.8,"off_rebounding":4.2,"def_efficiency":4.6,"opp_3pt_allowed":6.7,"rim_protection":3.0,"pressure_defense":4.6,"experience":3.2,"pace_label":"Moderate","avg_height":77.5,"barthag":0.532,"rr":0.9,"em_rank":"152"}},{"round":"First Round","region":"South","date":"2026-03-19","time":"","site":"Oklahoma City, OK","is_ff":false,"team1_name":"Saint Mary's","team2_name":"Texas A&M","team1":{"id":"saint_marys","name":"Saint Mary's","seed":7,"region":"South","archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":6.2,"free_throw_gen":5.7,"off_efficiency":6.1,"ball_security":4.4,"off_rebounding":7.0,"def_efficiency":7.4,"opp_3pt_allowed":7.2,"rim_protection":3.9,"pressure_defense":3.5,"experience":1.0,"pace_label":"Slow","avg_height":78.9,"barthag":0.911,"rr":20.4,"em_rank":"23"},"team2":{"id":"texas_am","name":"Texas A&M","seed":10,"region":"South","archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":6.4,"off_efficiency":5.9,"ball_security":6.9,"off_rebounding":5.0,"def_efficiency":6.2,"opp_3pt_allowed":6.7,"rim_protection":3.3,"pressure_defense":5.9,"experience":9.5,"pace_label":"Fast","avg_height":78.1,"barthag":0.872,"rr":16.4,"em_rank":"41"}},{"round":"First Round","region":"South","date":"2026-03-19","time":"","site":"Oklahoma City, OK","is_ff":false,"team1_name":"Houston","team2_name":"Idaho","team1":{"id":"houston","name":"Houston","seed":2,"region":"South","archetype":"two_way_machine","is_veteran":false,"is_length":false,"three_pt_prowess":5.3,"free_throw_gen":1.6,"off_efficiency":7.7,"ball_security":9.1,"off_rebounding":6.4,"def_efficiency":9.2,"opp_3pt_allowed":6.2,"rim_protection":6.0,"pressure_defense":6.8,"experience":5.9,"pace_label":"Slow","avg_height":77.5,"barthag":0.97,"rr":31.0,"em_rank":"5"},"team2":{"id":"idaho","name":"Idaho","seed":15,"region":"South","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.2,"free_throw_gen":5.2,"off_efficiency":2.1,"ball_security":6.4,"off_rebounding":3.7,"def_efficiency":4.2,"opp_3pt_allowed":3.0,"rim_protection":1.2,"pressure_defense":3.3,"experience":4.8,"pace_label":"Moderate","avg_height":77.3,"barthag":0.57,"rr":0.1,"em_rank":"163"}},{"round":"First Round","region":"West","date":"2026-03-20","time":"","site":"San Diego, CA","is_ff":false,"team1_name":"Arizona","team2_name":"Long Island University","team1":{"id":"arizona","name":"Arizona","seed":1,"region":"West","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":3.5,"free_throw_gen":9.0,"off_efficiency":8.7,"ball_security":6.1,"off_rebounding":7.3,"def_efficiency":9.7,"opp_3pt_allowed":7.0,"rim_protection":4.8,"pressure_defense":5.9,"experience":4.8,"pace_label":"Moderate","avg_height":79.0,"barthag":0.978,"rr":32.0,"em_rank":"3"},"team2":{"id":"liu","name":"Long Island University","seed":16,"region":"West","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.9,"free_throw_gen":5.2,"off_efficiency":1.0,"ball_security":1.0,"off_rebounding":5.8,"def_efficiency":3.4,"opp_3pt_allowed":6.4,"rim_protection":7.2,"pressure_defense":6.4,"experience":2.7,"pace_label":"Moderate","avg_height":77.5,"barthag":0.34,"rr":-3.3,"em_rank":"207"}},{"round":"First Round","region":"West","date":"2026-03-20","time":"","site":"San Diego, CA","is_ff":false,"team1_name":"Villanova","team2_name":"Utah State","team1":{"id":"villanova","name":"Villanova","seed":8,"region":"West","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.3,"free_throw_gen":3.6,"off_efficiency":6.1,"ball_security":6.2,"off_rebounding":5.1,"def_efficiency":6.4,"opp_3pt_allowed":4.1,"rim_protection":1.0,"pressure_defense":6.1,"experience":6.1,"pace_label":"Slow","avg_height":77.8,"barthag":0.88,"rr":15.0,"em_rank":"47"},"team2":{"id":"utah_state","name":"Utah State","seed":9,"region":"West","archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":7.0,"off_efficiency":6.7,"ball_security":5.8,"off_rebounding":5.3,"def_efficiency":6.0,"opp_3pt_allowed":4.1,"rim_protection":3.2,"pressure_defense":7.5,"experience":8.7,"pace_label":"Moderate","avg_height":77.7,"barthag":0.895,"rr":17.6,"em_rank":"32"}},{"round":"First Round","region":"West","date":"2026-03-19","time":"","site":"Portland, OR","is_ff":false,"team1_name":"Wisconsin","team2_name":"High Point","team1":{"id":"wisconsin","name":"Wisconsin","seed":5,"region":"West","archetype":"sniper_system","is_veteran":true,"is_length":true,"three_pt_prowess":7.8,"free_throw_gen":3.9,"off_efficiency":7.8,"ball_security":9.3,"off_rebounding":3.9,"def_efficiency":5.9,"opp_3pt_allowed":4.8,"rim_protection":3.0,"pressure_defense":3.3,"experience":8.3,"pace_label":"Moderate","avg_height":78.8,"barthag":0.929,"rr":21.7,"em_rank":"21"},"team2":{"id":"high_point","name":"High Point","seed":12,"region":"West","archetype":"system_operator","is_veteran":true,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":9.0,"off_efficiency":4.9,"ball_security":9.1,"off_rebounding":4.9,"def_efficiency":3.7,"opp_3pt_allowed":6.4,"rim_protection":4.9,"pressure_defense":9.3,"experience":7.8,"pace_label":"Moderate","avg_height":78.3,"barthag":0.699,"rr":8.6,"em_rank":"79"}},{"round":"First Round","region":"West","date":"2026-03-19","time":"","site":"Portland, OR","is_ff":false,"team1_name":"Arkansas","team2_name":"Hawai'i","team1":{"id":"arkansas","name":"Arkansas","seed":4,"region":"West","archetype":"offensive_juggernaut","is_veteran":false,"is_length":true,"three_pt_prowess":5.9,"free_throw_gen":6.0,"off_efficiency":8.7,"ball_security":10.0,"off_rebounding":5.0,"def_efficiency":6.0,"opp_3pt_allowed":6.7,"rim_protection":6.4,"pressure_defense":5.0,"experience":4.9,"pace_label":"Fast","avg_height":78.5,"barthag":0.936,"rr":23.8,"em_rank":"15"},"team2":{"id":"hawaii","name":"Hawai'i","seed":13,"region":"West","archetype":"system_operator","is_veteran":false,"is_length":true,"three_pt_prowess":3.7,"free_throw_gen":8.7,"off_efficiency":1.5,"ball_security":1.1,"off_rebounding":4.7,"def_efficiency":6.1,"opp_3pt_allowed":7.9,"rim_protection":4.1,"pressure_defense":4.2,"experience":5.6,"pace_label":"Moderate","avg_height":78.7,"barthag":0.635,"rr":3.3,"em_rank":"120"}},{"round":"First Round","region":"West","date":"2026-03-19","time":"","site":"Portland, OR","is_ff":false,"team1_name":"BYU","team2_name":"Texas / NC State (FF winner)","team1":{"id":"byu","name":"BYU","seed":6,"region":"West","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.2,"free_throw_gen":4.9,"off_efficiency":7.9,"ball_security":6.0,"off_rebounding":5.9,"def_efficiency":5.8,"opp_3pt_allowed":2.4,"rim_protection":5.6,"pressure_defense":5.3,"experience":5.0,"pace_label":"Moderate","avg_height":78.4,"barthag":0.889,"rr":16.5,"em_rank":"39"},"team2":null},{"round":"First Round","region":"West","date":"2026-03-19","time":"","site":"Portland, OR","is_ff":false,"team1_name":"Gonzaga","team2_name":"Kennesaw State","team1":{"id":"gonzaga","name":"Gonzaga","seed":3,"region":"West","archetype":"defensive_fortress","is_veteran":true,"is_length":false,"three_pt_prowess":3.3,"free_throw_gen":3.5,"off_efficiency":6.7,"ball_security":8.1,"off_rebounding":6.0,"def_efficiency":8.4,"opp_3pt_allowed":7.7,"rim_protection":5.2,"pressure_defense":6.9,"experience":10.0,"pace_label":"Moderate","avg_height":78.4,"barthag":0.95,"rr":27.7,"em_rank":"10"},"team2":{"id":"kennesaw_state","name":"Kennesaw State","seed":14,"region":"West","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.2,"free_throw_gen":10.0,"off_efficiency":2.7,"ball_security":4.1,"off_rebounding":6.3,"def_efficiency":3.3,"opp_3pt_allowed":4.1,"rim_protection":7.8,"pressure_defense":4.4,"experience":3.2,"pace_label":"Fast","avg_height":78.2,"barthag":0.534,"rr":1.0,"em_rank":"150"}},{"round":"First Round","region":"West","date":"2026-03-20","time":"","site":"St. Louis, MO","is_ff":false,"team1_name":"Miami (FL)","team2_name":"Missouri","team1":{"id":"miami_fl","name":"Miami (FL)","seed":7,"region":"West","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.7,"free_throw_gen":6.5,"off_efficiency":6.5,"ball_security":4.8,"off_rebounding":6.8,"def_efficiency":6.3,"opp_3pt_allowed":2.3,"rim_protection":4.1,"pressure_defense":6.4,"experience":5.6,"pace_label":"Moderate","avg_height":78.2,"barthag":0.887,"rr":18.6,"em_rank":"28"},"team2":{"id":"missouri","name":"Missouri","seed":10,"region":"West","archetype":"system_operator","is_veteran":true,"is_length":true,"three_pt_prowess":4.6,"free_throw_gen":8.8,"off_efficiency":5.8,"ball_security":2.3,"off_rebounding":6.3,"def_efficiency":5.2,"opp_3pt_allowed":1.0,"rim_protection":4.4,"pressure_defense":4.8,"experience":7.6,"pace_label":"Slow","avg_height":79.3,"barthag":0.851,"rr":14.4,"em_rank":"49"}},{"round":"First Round","region":"West","date":"2026-03-20","time":"","site":"St. Louis, MO","is_ff":false,"team1_name":"Purdue","team2_name":"Queens","team1":{"id":"purdue","name":"Purdue","seed":2,"region":"West","archetype":"offensive_juggernaut","is_veteran":true,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":2.3,"off_efficiency":10.0,"ball_security":8.4,"off_rebounding":6.6,"def_efficiency":6.4,"opp_3pt_allowed":3.7,"rim_protection":3.3,"pressure_defense":3.7,"experience":9.0,"pace_label":"Slow","avg_height":78.5,"barthag":0.964,"rr":30.3,"em_rank":"6"},"team2":{"id":"queens","name":"Queens","seed":15,"region":"West","archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":5.9,"off_efficiency":4.5,"ball_security":6.6,"off_rebounding":4.3,"def_efficiency":1.0,"opp_3pt_allowed":1.8,"rim_protection":2.6,"pressure_defense":3.4,"experience":3.6,"pace_label":"Moderate","avg_height":77.4,"barthag":0.44,"rr":-2.1,"em_rank":"194"}},{"round":"First Round","region":"Midwest","date":"2026-03-19","time":"","site":"Buffalo, NY","is_ff":false,"team1_name":"Michigan","team2_name":"UMBC / Howard (FF winner)","team1":{"id":"michigan","name":"Michigan","seed":1,"region":"Midwest","archetype":"two_way_machine","is_veteran":false,"is_length":true,"three_pt_prowess":6.0,"free_throw_gen":6.6,"off_efficiency":8.3,"ball_security":4.1,"off_rebounding":6.2,"def_efficiency":10.0,"opp_3pt_allowed":8.5,"rim_protection":8.7,"pressure_defense":3.2,"experience":7.2,"pace_label":"Fast","avg_height":78.7,"barthag":0.98,"rr":34.5,"em_rank":"2"},"team2":null},{"round":"First Round","region":"Midwest","date":"2026-03-19","time":"","site":"Buffalo, NY","is_ff":false,"team1_name":"Georgia","team2_name":"Saint Louis","team1":{"id":"georgia","name":"Georgia","seed":8,"region":"Midwest","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":5.5,"free_throw_gen":6.2,"off_efficiency":7.6,"ball_security":7.3,"off_rebounding":6.1,"def_efficiency":5.1,"opp_3pt_allowed":4.3,"rim_protection":8.1,"pressure_defense":6.2,"experience":6.2,"pace_label":"Fast","avg_height":77.4,"barthag":0.876,"rr":18.2,"em_rank":"30"},"team2":{"id":"saint_louis","name":"Saint Louis","seed":9,"region":"Midwest","archetype":"sniper_system","is_veteran":true,"is_length":false,"three_pt_prowess":8.6,"free_throw_gen":5.2,"off_efficiency":5.8,"ball_security":3.1,"off_rebounding":4.5,"def_efficiency":6.1,"opp_3pt_allowed":8.7,"rim_protection":3.7,"pressure_defense":4.9,"experience":8.0,"pace_label":"Fast","avg_height":77.5,"barthag":0.873,"rr":17.7,"em_rank":"31"}},{"round":"First Round","region":"Midwest","date":"2026-03-20","time":"","site":"Tampa, FL","is_ff":false,"team1_name":"Texas Tech","team2_name":"Akron","team1":{"id":"texas_tech","name":"Texas Tech","seed":5,"region":"Midwest","archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":8.5,"free_throw_gen":1.6,"off_efficiency":7.7,"ball_security":5.2,"off_rebounding":5.4,"def_efficiency":6.6,"opp_3pt_allowed":6.9,"rim_protection":3.7,"pressure_defense":3.7,"experience":7.2,"pace_label":"Slow","avg_height":77.8,"barthag":0.944,"rr":18.3,"em_rank":"29"},"team2":{"id":"akron","name":"Akron","seed":12,"region":"Midwest","archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":7.6,"free_throw_gen":2.6,"off_efficiency":5.6,"ball_security":5.7,"off_rebounding":5.5,"def_efficiency":4.6,"opp_3pt_allowed":2.7,"rim_protection":2.9,"pressure_defense":5.3,"experience":5.2,"pace_label":"Fast","avg_height":75.9,"barthag":0.773,"rr":11.2,"em_rank":"62"}},{"round":"First Round","region":"Midwest","date":"2026-03-20","time":"","site":"Tampa, FL","is_ff":false,"team1_name":"Alabama","team2_name":"Hofstra","team1":{"id":"alabama","name":"Alabama","seed":4,"region":"Midwest","archetype":"offensive_juggernaut","is_veteran":false,"is_length":false,"three_pt_prowess":7.9,"free_throw_gen":6.3,"off_efficiency":9.1,"ball_security":9.1,"off_rebounding":4.8,"def_efficiency":5.4,"opp_3pt_allowed":4.6,"rim_protection":5.1,"pressure_defense":3.8,"experience":6.9,"pace_label":"Fast","avg_height":78.3,"barthag":0.934,"rr":23.2,"em_rank":"17"},"team2":{"id":"hofstra","name":"Hofstra","seed":13,"region":"Midwest","archetype":"sniper_system","is_veteran":false,"is_length":false,"three_pt_prowess":6.6,"free_throw_gen":4.2,"off_efficiency":4.1,"ball_security":4.8,"off_rebounding":6.0,"def_efficiency":4.9,"opp_3pt_allowed":6.0,"rim_protection":4.4,"pressure_defense":2.6,"experience":4.6,"pace_label":"Slow","avg_height":77.4,"barthag":0.705,"rr":10.0,"em_rank":"74"}},{"round":"First Round","region":"Midwest","date":"2026-03-20","time":"","site":"Philadelphia, PA","is_ff":false,"team1_name":"Tennessee","team2_name":"Miami (Ohio) / SMU (FF winner)","team1":{"id":"tennessee","name":"Tennessee","seed":6,"region":"Midwest","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":3.2,"free_throw_gen":7.0,"off_efficiency":6.4,"ball_security":3.6,"off_rebounding":10.0,"def_efficiency":8.1,"opp_3pt_allowed":8.0,"rim_protection":5.1,"pressure_defense":6.0,"experience":5.0,"pace_label":"Slow","avg_height":78.4,"barthag":0.941,"rr":23.5,"em_rank":"16"},"team2":null},{"round":"First Round","region":"Midwest","date":"2026-03-20","time":"","site":"Philadelphia, PA","is_ff":false,"team1_name":"Virginia","team2_name":"Wright State","team1":{"id":"virginia","name":"Virginia","seed":3,"region":"Midwest","archetype":"defensive_fortress","is_veteran":false,"is_length":false,"three_pt_prowess":6.8,"free_throw_gen":4.4,"off_efficiency":6.9,"ball_security":5.0,"off_rebounding":7.2,"def_efficiency":7.8,"opp_3pt_allowed":7.6,"rim_protection":10.0,"pressure_defense":4.6,"experience":6.8,"pace_label":"Slow","avg_height":78.4,"barthag":0.943,"rr":24.1,"em_rank":"13"},"team2":{"id":"wright_state","name":"Wright State","seed":14,"region":"Midwest","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":4.7,"free_throw_gen":6.7,"off_efficiency":3.2,"ball_security":4.6,"off_rebounding":5.4,"def_efficiency":3.3,"opp_3pt_allowed":4.4,"rim_protection":5.2,"pressure_defense":5.3,"experience":3.1,"pace_label":"Moderate","avg_height":77.0,"barthag":0.586,"rr":1.3,"em_rank":"148"}},{"round":"First Round","region":"Midwest","date":"2026-03-20","time":"","site":"St. Louis, MO","is_ff":false,"team1_name":"Kentucky","team2_name":"Santa Clara","team1":{"id":"kentucky","name":"Kentucky","seed":7,"region":"Midwest","archetype":"defensive_fortress","is_veteran":false,"is_length":true,"three_pt_prowess":4.7,"free_throw_gen":6.5,"off_efficiency":6.2,"ball_security":6.4,"off_rebounding":5.6,"def_efficiency":6.8,"opp_3pt_allowed":6.8,"rim_protection":5.9,"pressure_defense":5.2,"experience":4.4,"pace_label":"Moderate","avg_height":78.8,"barthag":0.89,"rr":20.2,"em_rank":"25"},"team2":{"id":"santa_clara","name":"Santa Clara","seed":10,"region":"Midwest","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":6.0,"free_throw_gen":1.0,"off_efficiency":7.2,"ball_security":5.6,"off_rebounding":6.7,"def_efficiency":5.1,"opp_3pt_allowed":5.1,"rim_protection":4.5,"pressure_defense":7.5,"experience":1.8,"pace_label":"Moderate","avg_height":78.5,"barthag":0.895,"rr":16.9,"em_rank":"36"}},{"round":"First Round","region":"Midwest","date":"2026-03-20","time":"","site":"St. Louis, MO","is_ff":false,"team1_name":"Iowa State","team2_name":"Tennessee State","team1":{"id":"iowa_state","name":"Iowa State","seed":2,"region":"Midwest","archetype":"two_way_machine","is_veteran":true,"is_length":false,"three_pt_prowess":6.7,"free_throw_gen":4.9,"off_efficiency":7.3,"ball_security":6.2,"off_rebounding":6.2,"def_efficiency":9.2,"opp_3pt_allowed":6.2,"rim_protection":3.0,"pressure_defense":8.1,"experience":9.3,"pace_label":"Slow","avg_height":78.2,"barthag":0.966,"rr":29.5,"em_rank":"7"},"team2":{"id":"tennessee_state","name":"Tennessee State","seed":15,"region":"Midwest","archetype":"system_operator","is_veteran":false,"is_length":false,"three_pt_prowess":3.1,"free_throw_gen":4.6,"off_efficiency":2.2,"ball_security":4.4,"off_rebounding":6.0,"def_efficiency":3.0,"opp_3pt_allowed":4.6,"rim_protection":4.2,"pressure_defense":7.6,"experience":5.3,"pace_label":"Fast","avg_height":77.0,"barthag":0.395,"rr":0.4,"em_rank":"160"}}];

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
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {allAttrs.map(a => <div key={a.key}><div style={{ fontSize:10, color:"var(--color-text-tertiary)", marginBottom:2 }}>{a.label}</div><AttrBar value={team[a.key]} color={arch.color} label={a.short}/></div>)}
        </div>
        {team.coach_name && <div style={{ marginTop:"0.75rem", paddingTop:"0.75rem", borderTop:"0.5px solid var(--color-border-tertiary)", fontSize:11, color:"var(--color-text-tertiary)" }}>Coach: <span style={{ color:"var(--color-text-secondary)" }}>{team.coach_name}{cp?.note?" ("+cp.note+" small sample)":""}</span></div>}
      </div>
    </div>
  );
}

// ── Team Row (classifier) ─────────────────────────────────────────────────────
function TeamRow({ team, onClick }) {
  return (
    <div onClick={onClick} style={{ display:"grid", gridTemplateColumns:"24px 1fr auto auto", alignItems:"center", gap:8, padding:"7px 10px", cursor:"pointer", borderBottom:"0.5px solid var(--color-border-tertiary)", borderRadius:6, transition:"background 0.1s" }}
      onMouseEnter={e=>e.currentTarget.style.background="var(--color-background-secondary)"}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <SeedBubble seed={team.seed} ff={team.is_ff}/>
      <div>
        <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)" }}>{team.name}{team.is_ff&&<span style={{ marginLeft:4,fontSize:9,color:"#b45309" }}>FF</span>}</div>
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
function MatchupCard({ matchup, onTeamClick }) {
  const { team1, team2, team1_name, team2_name, round, site, date, time } = matchup;
  const a1 = team1 ? ARCH_MAP[team1.archetype] : null;
  const a2 = team2 ? ARCH_MAP[team2.archetype] : null;

  // Key attrs to show in the matchup comparison
  const KEY_ATTRS = [
    { key:"off_efficiency",  label:"AdjO" },
    { key:"def_efficiency",  label:"AdjD" },
    { key:"three_pt_prowess",label:"3PT"  },
    { key:"free_throw_gen",  label:"FTG"  },
    { key:"ball_security",   label:"TO"   },
    { key:"rim_protection",  label:"BLK"  },
    { key:"pressure_defense",label:"STL"  },
    { key:"experience",      label:"EXP"  },
  ];

  const fullTeam1 = team1 ? TEAMS_MAP[team1.id] : null;
  const fullTeam2 = team2 ? TEAMS_MAP[team2.id] : null;

  return (
    <div style={{ border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, overflow:"hidden", marginBottom:0 }}>
      {/* Matchup header */}
      <div style={{ background:"var(--color-background-secondary)", padding:"7px 12px", display:"flex", alignItems:"center", gap:10, borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
        {matchup.is_ff && <Tag label="First Four" color="#b45309"/>}
        <span style={{ fontSize:11, color:"var(--color-text-secondary)", fontWeight:500 }}>{site}</span>
        <span style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>{date}{time?" · "+time+" ET":""}</span>
      </div>

      {/* Side by side */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 40px 1fr" }}>

        {/* Team 1 */}
        <div style={{ padding:"12px", borderRight:"0.5px solid var(--color-border-tertiary)" }}>
          {team1 ? (
            <div style={{ cursor:"pointer" }} onClick={() => fullTeam1 && onTeamClick(fullTeam1)}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                <SeedBubble seed={team1.seed} ff={team1.is_ff||false}/>
                <span style={{ fontSize:14, fontWeight:600, color:"var(--color-text-primary)" }}>{team1.name}</span>
              </div>
              <div style={{ display:"flex", gap:4, marginBottom:8, flexWrap:"wrap" }}>
                <ArchetypePill id={team1.archetype} small/>
                {team1.is_veteran&&<Tag label="Vet" color="#9f1239"/>}
                {team1.is_length &&<Tag label="Len" color="#0369a1"/>}
                <PaceDot label={team1.pace_label}/>
              </div>
              {team1.barthag!=null && <div style={{ fontSize:10, color:"var(--color-text-tertiary)", marginBottom:6 }}>Barthag <b style={{ color:"var(--color-text-secondary)" }}>{team1.barthag.toFixed(3)}</b>{team1.rr!=null&&<span> · RR <b style={{ color:"var(--color-text-secondary)" }}>{team1.rr.toFixed(1)}</b></span>}</div>}
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {KEY_ATTRS.map(a => {
                  const v1 = team1[a.key], v2 = team2?.[a.key];
                  const isHigher = v1!=null && v2!=null && v1 > v2;
                  const color = a1?.color || "#888";
                  return (
                    <div key={a.key} style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ fontSize:9, color:"var(--color-text-tertiary)", width:28, textAlign:"right", flexShrink:0 }}>{a.label}</span>
                      <div style={{ flex:1, height:3, background:"var(--color-border-tertiary)", borderRadius:2, overflow:"hidden" }}>
                        {v1!=null&&<div style={{ width:`${((v1-1)/9)*100}%`, height:"100%", background:isHigher?color:color+"55", borderRadius:2 }}/>}
                      </div>
                      <span style={{ fontSize:9, fontWeight:isHigher?600:400, color:isHigher?"var(--color-text-primary)":"var(--color-text-tertiary)", width:20, textAlign:"right" }}>{f1(v1)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ padding:"1rem 0", color:"var(--color-text-tertiary)", fontSize:12 }}>TBD (FF winner)</div>
          )}
        </div>

        {/* VS */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:600, color:"var(--color-text-tertiary)" }}>vs</div>

        {/* Team 2 */}
        <div style={{ padding:"12px", borderLeft:"0.5px solid var(--color-border-tertiary)" }}>
          {team2 ? (
            <div style={{ cursor:"pointer" }} onClick={() => fullTeam2 && onTeamClick(fullTeam2)}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                <SeedBubble seed={team2.seed} ff={team2.is_ff||false}/>
                <span style={{ fontSize:14, fontWeight:600, color:"var(--color-text-primary)" }}>{team2.name}</span>
              </div>
              <div style={{ display:"flex", gap:4, marginBottom:8, flexWrap:"wrap" }}>
                <ArchetypePill id={team2.archetype} small/>
                {team2.is_veteran&&<Tag label="Vet" color="#9f1239"/>}
                {team2.is_length &&<Tag label="Len" color="#0369a1"/>}
                <PaceDot label={team2.pace_label}/>
              </div>
              {team2.barthag!=null && <div style={{ fontSize:10, color:"var(--color-text-tertiary)", marginBottom:6 }}>Barthag <b style={{ color:"var(--color-text-secondary)" }}>{team2.barthag.toFixed(3)}</b>{team2.rr!=null&&<span> · RR <b style={{ color:"var(--color-text-secondary)" }}>{team2.rr.toFixed(1)}</b></span>}</div>}
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {KEY_ATTRS.map(a => {
                  const v1 = team1?.[a.key], v2 = team2[a.key];
                  const isHigher = v2!=null && v1!=null && v2 > v1;
                  const color = a2?.color || "#888";
                  return (
                    <div key={a.key} style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ fontSize:9, color:"var(--color-text-tertiary)", width:28, textAlign:"right", flexShrink:0 }}>{a.label}</span>
                      <div style={{ flex:1, height:3, background:"var(--color-border-tertiary)", borderRadius:2, overflow:"hidden" }}>
                        {v2!=null&&<div style={{ width:`${((v2-1)/9)*100}%`, height:"100%", background:isHigher?color:color+"55", borderRadius:2 }}/>}
                      </div>
                      <span style={{ fontSize:9, fontWeight:isHigher?600:400, color:isHigher?"var(--color-text-primary)":"var(--color-text-tertiary)", width:20, textAlign:"right" }}>{f1(v2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ padding:"1rem 0", color:"var(--color-text-tertiary)", fontSize:12 }}>TBD (FF winner)</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Matchups Tab ──────────────────────────────────────────────────────────────
function MatchupsTab({ onTeamClick }) {
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
              {games.map((m, i) => <MatchupCard key={i} matchup={m} onTeamClick={onTeamClick}/>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Classifier Tab ────────────────────────────────────────────────────────────
function ClassifierTab({ onTeamClick }) {
  const [filterRegion, setFilterRegion] = useState("All");
  const [filterArch,   setFilterArch]   = useState("All");
  const [filterPace,   setFilterPace]   = useState("All");
  const [filterTag,    setFilterTag]    = useState("All");
  const [search,       setSearch]       = useState("");
  const [view,         setView]         = useState("list");
  const [sortBy,       setSortBy]       = useState("seed");

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
    return [...t].sort((a,b)=>{
      if (sortBy==="seed")    return REGIONS.indexOf(a.region)!==REGIONS.indexOf(b.region)?REGIONS.indexOf(a.region)-REGIONS.indexOf(b.region):a.seed-b.seed;
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
            : visible.map(t=><TeamRow key={t.id} team={t} onClick={()=>onTeamClick(t)}/>)
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
                {teams.map(t=><TeamRow key={t.id} team={t} onClick={()=>onTeamClick(t)}/>)}
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

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,      setTab]      = useState("classifier");  // "classifier" | "matchups"
  const [selected, setSelected] = useState(null);

  const tabs = [
    { id: "classifier", label: "Team Classifier" },
    { id: "matchups",   label: "Matchups" },
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
      {tab==="classifier" && <ClassifierTab onTeamClick={setSelected}/>}
      {tab==="matchups"   && <MatchupsTab   onTeamClick={setSelected}/>}

      {/* Team detail modal — available from both tabs */}
      {selected && <TeamModal team={selected} onClose={()=>setSelected(null)}/>}
    </div>
  );
}
