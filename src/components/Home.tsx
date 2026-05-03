import { useState } from 'react';
import type { AppState } from '../data/fretboard';
import Fretboard from './Fretboard';
import CellDetail from './CellDetail';

type Props = {
  state: AppState;
  onStartSession: () => void;
};

export default function Home({ state, onStartSession }: Props) {
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);

  const totalCorrect = Object.values(state.cells).reduce((s, c) => s + c.totalCorrect, 0);
  const totalAttempts = state.totalQuestionsAnswered;
  const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const totalMinutes = Math.round(state.totalTimeMs / 60000);

  // Trend: compare last session to 7-session rolling average before it
  const history = state.sessionHistory ?? [];
  let trendText: string | null = null;
  if (history.length >= 2) {
    const last = history[history.length - 1];
    const prev = history.slice(-8, -1);
    const prevAvgTime = prev.reduce((s, r) => s + r.avgResponseTimeMs, 0) / prev.length;
    const diffMs = prevAvgTime - last.avgResponseTimeMs;
    if (Math.abs(diffMs) >= 50) {
      const sign = diffMs > 0 ? '↓' : '↑';
      trendText = `${sign} ${(Math.abs(diffMs) / 1000).toFixed(1)}s avg response vs recent sessions`;
    }
  }

  return (
    <div className="flex flex-col items-center px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Fretboard Trainer</h1>

      <Fretboard
        cells={state.cells}
        onCellClick={setSelectedCellId}
      />

      <div className="mt-6 text-sm text-gray-400 space-y-1 text-center">
        <p>
          Sessions: {state.totalSessionsCompleted} &middot; Total time: {totalMinutes} min
        </p>
        <p>
          Questions: {totalAttempts} &middot; Accuracy: {accuracy}%
        </p>
        {trendText && (
          <p className={trendText.startsWith('↓') ? 'text-green-400' : 'text-red-400'}>
            {trendText}
          </p>
        )}
      </div>

      <button
        onClick={onStartSession}
        className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-lg transition-colors"
      >
        Start Training (10 min)
      </button>

      {selectedCellId && state.cells[selectedCellId] && (
        <CellDetail
          cell={state.cells[selectedCellId]}
          onClose={() => setSelectedCellId(null)}
        />
      )}
    </div>
  );
}
