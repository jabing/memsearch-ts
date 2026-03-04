import { describe, it, expect, vi } from 'vitest';
import { calculateTimeScore } from './time-decay.js';

describe('time-decay', () => {
  describe('calculateTimeScore', () => {
    it('should return 1 for current time', () => {
      const now = Date.now();
      const score = calculateTimeScore(now, 1000);
      expect(score).toBeCloseTo(1, 5);
    });

    it('should return ~0.5 at exactly half-life', () => {
      const now = Date.now();
      const halfLifeMs = 1000;
      const createdAt = now - halfLifeMs;
      const score = calculateTimeScore(createdAt, halfLifeMs);
      expect(score).toBeCloseTo(0.5, 5);
    });

    it('should return ~0.25 at twice half-life', () => {
      const now = Date.now();
      const halfLifeMs = 1000;
      const createdAt = now - 2 * halfLifeMs;
      const score = calculateTimeScore(createdAt, halfLifeMs);
      expect(score).toBeCloseTo(0.25, 5);
    });

    it('should handle future timestamps gracefully', () => {
      const now = Date.now();
      const futureCreatedAt = now + 1000;
      const score = calculateTimeScore(futureCreatedAt, 1000);
      expect(score).toBeCloseTo(1, 5);
    });

    it('should return value between 0 and 1 for old items', () => {
      const now = Date.now();
      const halfLifeMs = 1000;
      const createdAt = now - 10 * halfLifeMs;
      const score = calculateTimeScore(createdAt, halfLifeMs);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(0.1);
    });
  });
});
