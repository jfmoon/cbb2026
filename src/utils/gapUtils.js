/**
 * utils/gapUtils.js
 *
 * jbGap heatmap utilities shared between PicksTab and MatchupsTab.
 *
 * Thresholds calibrated to 2026 field distribution:
 *   mean = 24.1, stdev = 19.8
 *
 * Both functions accept the raw jbGap delta (favorite jbScore minus underdog jbScore).
 * Negative = underdog is actually stronger on paper (pick the dog).
 */

export function gapColor(delta) {
  if (delta < 0)  return { bg: "#b91c1c", text: "#fecaca", border: "#dc2626" }; // Pick the dog
  if (delta < 5)  return { bg: "#c2410c", text: "#fed7aa", border: "#ea580c" }; // Coin flip
  if (delta < 8)  return { bg: "#854d0e", text: "#fef08a", border: "#ca8a04" }; // Danger zone
  if (delta < 13) return { bg: "#b45309", text: "#fde68a", border: "#d97706" }; // Live underdog
  if (delta < 17) return { bg: "#3f6212", text: "#d9f99d", border: "#65a30d" }; // Moderate gap
  if (delta < 23) return { bg: "#166534", text: "#bbf7d0", border: "#16a34a" }; // Lean favorite
  if (delta < 35) return { bg: "#0f766e", text: "#99f6e4", border: "#0d9488" }; // Chalk
  return              { bg: "#1d4ed8", text: "#bfdbfe", border: "#3b82f6" };     // Blowout city
}

export function gapLabel(delta) {
  if (delta < 0)  return "🔥 Pick the dog";
  if (delta < 5)  return "Coin flip";
  if (delta < 8)  return "Danger zone";
  if (delta < 13) return "Live underdog";
  if (delta < 17) return "Moderate gap";
  if (delta < 23) return "Lean favorite";
  if (delta < 35) return "Chalk";
  return "Blowout city";
}

/**
 * Returns the full heatmap legend entries for rendering a legend row.
 * Each entry: { delta, label, colors }
 */
export const GAP_LEGEND = [
  { delta: -2,  label: "Pick the dog"  },
  { delta: 2,   label: "Coin flip"     },
  { delta: 6,   label: "Danger zone"   },
  { delta: 10,  label: "Live underdog" },
  { delta: 15,  label: "Moderate gap"  },
  { delta: 20,  label: "Lean favorite" },
  { delta: 28,  label: "Chalk"         },
  { delta: 40,  label: "Blowout city"  },
].map(entry => ({ ...entry, colors: gapColor(entry.delta) }));
