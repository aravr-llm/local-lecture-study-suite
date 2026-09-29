import { describe, it, expect } from 'vitest';
import { calculateNextReview } from '../../backend/study/spacedRepetition';

describe('Spaced Repetition Algorithm (SM-2)', () => {
  it('resets streak on rating 1 (Again)', () => {
    const state = calculateNextReview(1, { repetitions: 5, intervalDays: 14, easeFactor: 2.5 });
    expect(state.repetitions).toBe(0);
    expect(state.intervalDays).toBeLessThan(1); // Due soon
  });

  it('increments repetitions and schedules interval on rating 3 (Good)', () => {
    const rep1 = calculateNextReview(3);
    expect(rep1.repetitions).toBe(1);
    expect(rep1.intervalDays).toBe(1);

    const rep2 = calculateNextReview(3, rep1);
    expect(rep2.repetitions).toBe(2);
    expect(rep2.intervalDays).toBe(3);

    const rep3 = calculateNextReview(3, rep2);
    expect(rep3.repetitions).toBe(3);
    expect(rep3.intervalDays).toBeGreaterThan(5);
  });

  it('increases ease factor and awards larger interval on rating 4 (Easy)', () => {
    const state = calculateNextReview(4, { repetitions: 2, intervalDays: 3, easeFactor: 2.5 });
    expect(state.easeFactor).toBeGreaterThan(2.5);
    expect(state.intervalDays).toBeGreaterThan(6);
  });
});
