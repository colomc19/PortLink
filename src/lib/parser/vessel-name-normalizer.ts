/**
 * Normalizes a vessel name for deduplication matching.
 *
 * Rules (mirrors the SQL function normalize_vessel_name()):
 *   1. Lowercase
 *   2. Remove punctuation — keep only alphanumeric characters and spaces
 *   3. Collapse multiple consecutive spaces into one
 *   4. Trim leading/trailing whitespace
 *
 * Examples:
 *   'M/V OCEAN STAR'   → 'mv ocean star'
 *   'MSC  TRIESTE'     → 'msc trieste'
 *   'IVS PINEHURST'    → 'ivs pinehurst'
 */
export function normalizeVesselName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
