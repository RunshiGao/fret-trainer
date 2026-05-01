import type { Cell } from '../data/fretboard';
import { masteryScore, masteryColor } from '../engine/mastery';
import { FRET_MARKERS } from '../data/fretboard';

type Props = {
  cells: Record<string, Cell>;
  highlightCell?: string | null;
  highlightCorrect?: string | null;
  highlightWrong?: string | null;
  activeString?: number | null; // for Mode B: only this string is clickable
  onCellClick?: (cellId: string) => void;
  showNotes?: boolean;
};

const CELL_W = 54;
const CELL_H = 32;
const NUT_W = 36;
const PAD_LEFT = 24;
const PAD_TOP = 12;
const MARKER_ROW_H = 20;

export default function Fretboard({
  cells,
  highlightCell,
  highlightCorrect,
  highlightWrong,
  activeString,
  onCellClick,
  showNotes = true,
}: Props) {
  const totalW = PAD_LEFT + NUT_W + 12 * CELL_W + 8;
  const totalH = PAD_TOP + 6 * CELL_H + MARKER_ROW_H + 4;

  function cellX(fret: number) {
    if (fret === 0) return PAD_LEFT;
    return PAD_LEFT + NUT_W + (fret - 1) * CELL_W;
  }
  function cellY(str: number) {
    return PAD_TOP + (str - 1) * CELL_H;
  }
  function cellW(fret: number) {
    return fret === 0 ? NUT_W : CELL_W;
  }

  function getFill(cellId: string) {
    if (highlightCorrect === cellId) return '#22c55e';
    if (highlightWrong === cellId) return '#ef4444';
    if (highlightCell === cellId) return '#facc15';
    const cell = cells[cellId];
    return masteryColor(masteryScore(cell));
  }

  function isClickable(str: number) {
    if (!onCellClick) return false;
    if (activeString !== undefined && activeString !== null) return str === activeString;
    return true;
  }

  return (
    <svg
      viewBox={`0 0 ${totalW} ${totalH}`}
      className="w-full max-w-[720px]"
      style={{ userSelect: 'none' }}
    >
      {/* String labels */}
      {[1, 2, 3, 4, 5, 6].map(s => (
        <text
          key={`sl-${s}`}
          x={PAD_LEFT - 6}
          y={cellY(s) + CELL_H / 2 + 4}
          textAnchor="end"
          fontSize="10"
          fill="#9ca3af"
        >
          {s}
        </text>
      ))}

      {/* Fret number labels */}
      {Array.from({ length: 13 }, (_, f) => (
        <text
          key={`fl-${f}`}
          x={cellX(f) + cellW(f) / 2}
          y={PAD_TOP - 2}
          textAnchor="middle"
          fontSize="9"
          fill="#6b7280"
        >
          {f}
        </text>
      ))}

      {/* Cells */}
      {[1, 2, 3, 4, 5, 6].map(s =>
        Array.from({ length: 13 }, (_, f) => {
          const id = `${s}-${f}`;
          const cell = cells[id];
          const x = cellX(f);
          const y = cellY(s);
          const w = cellW(f);
          const clickable = isClickable(s);
          return (
            <g
              key={id}
              onClick={clickable ? () => onCellClick?.(id) : undefined}
              style={{ cursor: clickable ? 'pointer' : 'default' }}
            >
              <rect
                x={x}
                y={y}
                width={w}
                height={CELL_H}
                rx={3}
                fill={getFill(id)}
                stroke="#444"
                strokeWidth={0.5}
                opacity={activeString != null && s !== activeString ? 0.3 : 1}
              />
              {showNotes && (
                <text
                  x={x + w / 2}
                  y={y + CELL_H / 2 + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill={highlightCell === id || highlightCorrect === id || highlightWrong === id ? '#000' : '#d1d5db'}
                  fontWeight={highlightCell === id ? 'bold' : 'normal'}
                >
                  {cell.noteName}
                </text>
              )}
            </g>
          );
        })
      )}

      {/* Fret markers */}
      {Object.entries(FRET_MARKERS).map(([fretStr, count]) => {
        const fret = Number(fretStr);
        const cx = cellX(fret) + CELL_W / 2;
        const markerY = PAD_TOP + 6 * CELL_H + MARKER_ROW_H / 2 + 2;
        if (count === 2) {
          return (
            <g key={`m-${fret}`}>
              <circle cx={cx - 6} cy={markerY} r={3} fill="#6b7280" />
              <circle cx={cx + 6} cy={markerY} r={3} fill="#6b7280" />
            </g>
          );
        }
        return <circle key={`m-${fret}`} cx={cx} cy={markerY} r={3} fill="#6b7280" />;
      })}
    </svg>
  );
}
