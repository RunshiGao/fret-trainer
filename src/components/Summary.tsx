import type { AppState, SessionRecord } from '../data/fretboard';
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

function HistoryChart({ history }: { history: SessionRecord[] }) {
  if (history.length < 2) return null;

  const recent = history.slice(-12);
  const W = 280;
  const H = 80;
  const padX = 4;
  const padY = 8;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  // Accuracy line (0–100%)
  const maxAcc = 100;
  const accPoints = recent.map((s, i) => {
    const acc = s.questions > 0 ? (s.correct / s.questions) * 100 : 0;
    const x = padX + (i / (recent.length - 1)) * innerW;
    const y = padY + innerH - (acc / maxAcc) * innerH;
    return `${x},${y}`;
  }).join(' ');

  // Avg response time line — clamp to 0–5000ms
  const maxTime = 5000;
  const timePoints = recent.map((s, i) => {
    const x = padX + (i / (recent.length - 1)) * innerW;
    const y = padY + innerH - (Math.min(s.avgResponseTimeMs, maxTime) / maxTime) * innerH;
    return `${x},${y}`;
  }).join(' ');

  const lastAcc = recent[recent.length - 1];
  const prevAcc = recent[recent.length - 2];
  const accDelta = lastAcc.questions > 0 && prevAcc.questions > 0
    ? Math.round((lastAcc.correct / lastAcc.questions - prevAcc.correct / prevAcc.questions) * 100)
    : 0;
  const timeDelta = ((prevAcc.avgResponseTimeMs - lastAcc.avgResponseTimeMs) / 1000).toFixed(1);

  return (
    <div className="w-full mt-6">
      <h2 className="text-sm font-semibold text-gray-400 mb-3">
        Past {recent.length} Sessions
      </h2>

      {/* Trend summary */}
      <div className="flex gap-6 mb-3 text-xs text-gray-400">
        <span>
          Accuracy{' '}
          <span className={accDelta >= 0 ? 'text-green-400' : 'text-red-400'}>
            {accDelta >= 0 ? '+' : ''}{accDelta}%
          </span>{' '}
          vs prev
        </span>
        <span>
          Avg time{' '}
          <span className={Number(timeDelta) >= 0 ? 'text-green-400' : 'text-red-400'}>
            {Number(timeDelta) >= 0 ? '-' : '+'}{Math.abs(Number(timeDelta))}s
          </span>{' '}
          vs prev
        </span>
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[320px] rounded bg-[#1a1a1a]">
        {/* Grid lines */}
        {[0, 0.5, 1].map(t => {
          const y = padY + innerH - t * innerH;
          return (
            <line key={t} x1={padX} y1={y} x2={W - padX} y2={y}
              stroke="#333" strokeWidth={0.5} strokeDasharray="3,3" />
          );
        })}

        {/* Response time line (blue) */}
        {recent.length >= 2 && (
          <polyline
            points={timePoints}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        )}

        {/* Accuracy line (green) */}
        {recent.length >= 2 && (
          <polyline
            points={accPoints}
            fill="none"
            stroke="#22c55e"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        )}

        {/* Dots for current session */}
        {recent.map((s, i) => {
          const x = padX + (i / (recent.length - 1)) * innerW;
          const acc = s.questions > 0 ? (s.correct / s.questions) * 100 : 0;
          const accY = padY + innerH - (acc / maxAcc) * innerH;
          return (
            <circle key={i} cx={x} cy={accY} r={i === recent.length - 1 ? 3 : 1.5}
              fill={i === recent.length - 1 ? '#22c55e' : '#166534'} />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-green-500" /> Accuracy
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-blue-500" /> Avg response time
        </span>
      </div>

      {/* Table of recent sessions */}
      <table className="w-full mt-4 text-xs text-gray-400 border-collapse">
        <thead>
          <tr className="text-gray-600">
            <th className="text-left py-1">Date</th>
            <th className="text-right py-1">Questions</th>
            <th className="text-right py-1">Accuracy</th>
            <th className="text-right py-1">Avg time</th>
          </tr>
        </thead>
        <tbody>
          {[...recent].reverse().map((s, i) => {
            const acc = s.questions > 0 ? Math.round((s.correct / s.questions) * 100) : 0;
            const isLatest = i === 0;
            return (
              <tr key={i} className={isLatest ? 'text-white' : ''}>
                <td className="py-0.5">{s.date}</td>
                <td className="text-right">{s.questions}</td>
                <td className="text-right">{acc}%</td>
                <td className="text-right">{(s.avgResponseTimeMs / 1000).toFixed(1)}s</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

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

      {/* This session stats */}
      <div className="text-gray-300 space-y-1 text-center">
        <p className="text-lg">
          {result.totalQuestions} questions &middot; {result.totalCorrect} correct ({accuracy}%)
        </p>
        <p className="text-sm text-gray-400">
          Average response time: {avgResponseTime}s
        </p>
      </div>

      {/* Mastery deltas */}
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

      {/* History chart */}
      <HistoryChart history={state.sessionHistory ?? []} />

      <button
        onClick={onHome}
        className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
      >
        Return to Home
      </button>
    </div>
  );
}
