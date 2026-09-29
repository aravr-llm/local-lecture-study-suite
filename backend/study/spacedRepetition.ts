export type ReviewRating = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

export interface SpacedRepetitionState {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewAt: string;
  lastReviewedAt: string;
}

export function calculateNextReview(
  rating: ReviewRating,
  currentState?: { repetitions?: number; intervalDays?: number; easeFactor?: number }
): SpacedRepetitionState {
  const currentReps = currentState?.repetitions ?? 0;
  const currentInterval = currentState?.intervalDays ?? 0;
  const currentEase = currentState?.easeFactor ?? 2.5;

  let newReps = currentReps;
  let newInterval = currentInterval;
  let newEase = currentEase;

  // Rating 1 (Again) resets streak
  if (rating === 1) {
    newReps = 0;
    newInterval = 0.04; // ~1 hour
  } else if (rating === 2) { // Hard
    newReps += 1;
    newInterval = Math.max(1, currentInterval * 1.2);
    newEase = Math.max(1.3, currentEase - 0.15);
  } else if (rating === 3) { // Good
    newReps += 1;
    if (newReps === 1) {
      newInterval = 1;
    } else if (newReps === 2) {
      newInterval = 3;
    } else {
      newInterval = Math.round(currentInterval * currentEase);
    }
  } else { // Easy
    newReps += 1;
    if (newReps === 1) {
      newInterval = 2;
    } else if (newReps === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * currentEase * 1.3);
    }
    newEase = Math.min(3.0, currentEase + 0.15);
  }

  const now = new Date();
  const nextDate = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

  return {
    repetitions: newReps,
    intervalDays: Math.round(newInterval * 100) / 100,
    easeFactor: Math.round(newEase * 100) / 100,
    nextReviewAt: nextDate.toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}
