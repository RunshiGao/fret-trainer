import type { Cell } from '../data/fretboard';
import { masteryScore, getTargetTime } from '../engine/mastery';

type Props = {
  cell: Cell;
  onClose: () => void;
};

export default function CellDetail({ cell, onClose }: Props) {
  const mastery = masteryScore(cell);
  const recent = cell.recentAttempts;
  const recentCorrect = recent.filter(a => a.correct).length;
  const recentAccuracy = recent.length > 0 ? Math.round((recentCorrect / recent.length) * 100) : 0;
  const correctTimes = recent.filter(a => a.correct);
  const avgTime = correctTimes.length > 0
    ? Math.round(correctTimes.reduce((s, a) => s + a.responseTimeMs, 0) / correctTimes.length)
    : 0;
  const target = getTargetTime(cell);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#1f2028] rounded-lg p-5 min-w-[260px] text-left"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-white">
            String {cell.string}, Fret {cell.fret} — {cell.noteName}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">
            &times;
          </button>
        </div>
        <div className="space-y-1 text-sm text-gray-300">
          <p>Mastery: {mastery !== null ? `${Math.round(mastery * 100)}%` : 'Unseen'}</p>
          <p>Total attempts: {cell.totalAttempts}</p>
          <p>Recent ({recent.length}): {recentAccuracy}% accuracy</p>
          <p>Avg response (correct): {avgTime > 0 ? `${avgTime}ms` : '—'}</p>
          <p>Target time: {target}ms</p>
        </div>
      </div>
    </div>
  );
}
