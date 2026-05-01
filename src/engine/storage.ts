import type { AppState } from '../data/fretboard';
import { initAppState } from '../data/fretboard';

const STORAGE_KEY = 'fretboard-trainer-state-v1';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    // corrupted data — start fresh
  }
  return initAppState();
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
