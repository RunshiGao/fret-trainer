import type { AppState } from '../data/fretboard';
import { masteryScore } from '../engine/mastery';

type SessionResult = {
  totalQuestions: number;
  totalCorrect: number;
  totalResponseTimeMs: number;
  preMastery: Record<string, number | null>;
};

type Props = {
  state: AppState;
  result: SessionResult;
  onHome: () => void;
};

export default function Summary({ state, result, onHome }: Props) {
  const accuracy = result.totalQuestions > 0
    ? Math.round((result.totalCorrect / result.totalQuestions) * 100)
    : 0;
  const avgResponseTime = result.totalQuestions > 0
    ? (result.totalResponseTimeMs / result.totalQuestions / 1000).toFixed(1)
    : '0';

  // Calculate mastery deltas
  const deltas: { cellId: string; label: string; delta: number }[] = [];
  for (const cell of Object.values(state.cells)) {
    const pre = result.preMastery[cell.id] ?? 0;
    const post = masteryScore(cell) ?? 0;
    const delta = post - pre;
    if (Math.abs(delta) > 0.001) {
      deltas.push({
        cellId: cell.id,
        label: `String ${cell.string}, Fret ${cell.fret} (${cell.noteName})`,
        delta,
      });
    }
  }

  const improved = deltas.filter(d => d.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
  const regressed = deltas.filter(d => d.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);

  return (
    <div className="flex flex-col items-center px-4 py-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Training Complete</h1>

      <div className="text-gray-300 space-y-1 text-center">
        <p className="text-lg">
          {result.totalQuestions} questions &middot; {result.totalCorrect} correct ({accuracy}%)
        </p>
        <p className="text-sm text-gray-400">
          Average response time: {avgResponseTime}s
        </p>
      </div>

      {improved.length > 0 && (
        <div className="mt-6 w-full">
          <h2 className="text-sm font-semibold text-green-400 mb-2">Most Improved</h2>
          <ul className="space-y-1 text-sm text-gray-300">
            {improved.map(d => (
              <li key={d.cellId}>
                {d.label} <span className="text-green-400">+{(d.delta * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {regressed.length > 0 && (
        <div className="mt-4 w-full">
          <h2 className="text-sm font-semibold text-red-400 mb-2">Regressed</h2>
          <ul className="space-y-1 text-sm text-gray-300">
            {regressed.map(d => (
              <li key={d.cellId}>
                {d.label} <span className="text-red-400">{(d.delta * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onHome}
        className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
      >
        Return to Home
      </button>
    </div>
  );
}
