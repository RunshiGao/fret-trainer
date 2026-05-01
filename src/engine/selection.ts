import type { Cell } from '../data/fretboard';
import { masteryScore } from './mastery';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedRandomChoice<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function selectNextCell(cells: Cell[], lastCellId: string | null): Cell {
  const unseen = cells.filter(c => masteryScore(c) === null);
  if (unseen.length > 0 && Math.random() < 0.6) {
    return pickRandom(unseen);
  }

  const candidates = cells.filter(c => c.id !== lastCellId);
  const weights = candidates.map(c => {
    const m = masteryScore(c) ?? 0;
    return Math.pow(1 - m, 2) + 0.1;
  });

  return weightedRandomChoice(candidates, weights);
}
