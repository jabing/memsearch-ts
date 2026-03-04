/**
 * Time decay calculation utilities
 */

/**
 * Calculate a time-based score that decays exponentially over time
 *
 * @param createdAt - Timestamp in milliseconds when the item was created
 * @param halfLifeMs - Half-life in milliseconds - time it takes for score to decay by 50%
 * @returns Score between 0 and 1, where 1 is very recent and 0 is very old
 */
export function calculateTimeScore(createdAt: number, halfLifeMs: number): number {
  const now = Date.now();
  const ageMs = Math.max(0, now - createdAt); // Ensure non-negative age

  // Formula: exp(-ln(2) * ageMs / halfLifeMs)
  // This gives 1 at age 0, 0.5 at age = halfLifeMs, 0.25 at age = 2*halfLifeMs, etc.
  const ln2 = Math.log(2);
  const exponent = (-ln2 * ageMs) / halfLifeMs;
  return Math.exp(exponent);
}
