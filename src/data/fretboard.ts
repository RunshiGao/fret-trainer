export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

// Open string notes for standard tuning: string 1 (high E) to string 6 (low E)
const OPEN_STRINGS: Record<number, string> = {
  1: 'E',
  2: 'B',
  3: 'G',
  4: 'D',
  5: 'A',
  6: 'E',
};

export type Attempt = {
  correct: boolean;
  responseTimeMs: number;
  mode: 'A' | 'B';
  timestamp: number;
};

export type Cell = {
  id: string;
  string: number;
  fret: number;
  noteName: string;
  recentAttempts: Attempt[];
  totalAttempts: number;
  totalCorrect: number;
};

export type SessionRecord = {
  date: string;          // ISO date "2026-05-03"
  questions: number;
  correct: number;
  avgResponseTimeMs: number;
};

export type AppState = {
  cells: Record<string, Cell>;
  totalSessionsCompleted: number;
  totalQuestionsAnswered: number;
  totalTimeMs: number;
  lastSessionDate: string | null;
  sessionHistory: SessionRecord[];
};

export function getNoteForCell(str: number, fret: number): string {
  const openNote = OPEN_STRINGS[str];
  const openIndex = NOTE_NAMES.indexOf(openNote as typeof NOTE_NAMES[number]);
  return NOTE_NAMES[(openIndex + fret) % 12];
}

export function initCells(): Record<string, Cell> {
  const cells: Record<string, Cell> = {};
  for (let s = 1; s <= 6; s++) {
    for (let f = 0; f <= 12; f++) {
      const id = `${s}-${f}`;
      cells[id] = {
        id,
        string: s,
        fret: f,
        noteName: getNoteForCell(s, f),
        recentAttempts: [],
        totalAttempts: 0,
        totalCorrect: 0,
      };
    }
  }
  return cells;
}

export function initAppState(): AppState {
  return {
    cells: initCells(),
    totalSessionsCompleted: 0,
    totalQuestionsAnswered: 0,
    totalTimeMs: 0,
    lastSessionDate: null,
    sessionHistory: [],
  };
}

// Fret marker positions (dots on real guitars)
export const FRET_MARKERS: Record<number, number> = {
  3: 1, 5: 1, 7: 1, 9: 1, 12: 2,
};
