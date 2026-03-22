/**
 * utils/formatters.js
 *
 * Pure display formatting functions used across multiple tabs.
 * No React dependencies — plain JS.
 */

/**
 * Converts a 24h "HH:MM" time string to 12h format.
 * e.g. "14:30" → "2:30 PM", "09:05" → "9:05 AM"
 */
export function fmt12h(time) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour   = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Formats a moneyline integer for display.
 * e.g. 125 → "+125", -110 → "-110"
 */
export function fmtMoneyline(v) {
  if (v == null || v === "") return "";
  const n = Number(v);
  return n > 0 ? `+${n}` : String(n);
}

/**
 * Formats a spread value for display.
 * e.g. 2.5 → "+2.5", -1.5 → "-1.5", null → "TBD"
 */
export function fmtSpread(v) {
  if (v == null) return "TBD";
  const n = Number(v);
  return n > 0 ? `+${n}` : String(n);
}

/**
 * Returns a seed display string, e.g. 1 → "(1)", 16 → "(16)"
 */
export function fmtSeed(seed) {
  return seed != null ? `(${seed})` : "";
}

/**
 * Formats a score delta with leading + for positive values.
 * e.g. 5.7 → "+5.7", -1.9 → "-1.9", null → "—"
 */
export function fmtDelta(v) {
  if (v == null) return "—";
  return v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
}
