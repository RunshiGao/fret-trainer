import type { Cell } from '../data/fretboard';

export function getTargetTime(_cell: Cell): number {
  return 5000;
}

export function masteryScore(cell: Cell): number | null {
  const recent = cell.recentAttempts;
  if (recent.length === 0) return null;

  const accuracy = recent.filter(a => a.correct).length / recent.length;

  const correctAttempts = recent.filter(a => a.correct);
  let speedScore = 0;
  if (correctAttempts.length > 0) {
    const avgTime = correctAttempts.reduce((s, a) => s + a.responseTimeMs, 0) / correctAttempts.length;
    const targetTime = getTargetTime(cell);
    speedScore = Math.min(targetTime / avgTime, 1);
  }

  let mastery = 0.5 * accuracy + 0.5 * speedScore;

  if (recent.length < 5) {
    mastery *= recent.length / 5;
  }

  return mastery;
}

export function masteryColor(score: number | null): string {
  if (score === null) return '#2a2a2a';
  // Interpolate from cold blue (#1e3a8a) to bright green (#22c55e)
  const r = Math.round(0x1e + (0x22 - 0x1e) * score);
  const g = Math.round(0x3a + (0xc5 - 0x3a) * score);
  const b = Math.round(0x8a + (0x5e - 0x8a) * score);
  return `rgb(${r},${g},${b})`;
}
