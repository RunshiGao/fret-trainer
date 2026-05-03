import { useState, useEffect, useRef, useCallback } from 'react';
import type { AppState, Cell, Attempt, SessionRecord } from '../data/fretboard';
import { NOTE_NAMES } from '../data/fretboard';
import { getTargetTime, masteryScore } from '../engine/mastery';
import { selectNextCell } from '../engine/selection';
import { saveState } from '../engine/storage';
import Fretboard from './Fretboard';

const SESSION_DURATION_MS = 10 * 60 * 1000;

type SessionResult = {
  totalQuestions: number;
  totalCorrect: number;
  totalResponseTimeMs: number;
  preMastery: Record<string, number | null>;
};

type Props = {
  state: AppState;
  setState: (s: AppState) => void;
  onEnd: (result: SessionResult) => void;
};

type QuestionState = {
  cell: Cell;
  mode: 'A' | 'B';
  shownAt: number;
};

type FeedbackState = {
  correct: boolean;
  timedOut: boolean;
  responseTimeMs: number;
  correctCellId: string;
  answeredCellId?: string;
} | null;

export default function Session({ state, setState, onEnd }: Props) {
  const [timeLeftMs, setTimeLeftMs] = useState(SESSION_DURATION_MS);
  const [question, setQuestion] = useState<QuestionState | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalResponseTime, setTotalResponseTime] = useState(0);
  const lastCellIdRef = useRef<string | null>(null);
  const sessionStartRef = useRef(Date.now());
  const preMasteryRef = useRef<Record<string, number | null>>({});
  const endedRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Snapshot pre-session mastery scores
  useEffect(() => {
    const snap: Record<string, number | null> = {};
    for (const cell of Object.values(state.cells)) {
      snap[cell.id] = masteryScore(cell);
    }
    preMasteryRef.current = snap;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const endSession = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    const s = stateRef.current;
    const elapsed = Date.now() - sessionStartRef.current;
    const record: SessionRecord = {
      date: new Date().toISOString().slice(0, 10),
      questions: questionCount,
      correct: correctCount,
      avgResponseTimeMs: questionCount > 0 ? Math.round(totalResponseTime / questionCount) : 0,
    };
    const newState = {
      ...s,
      totalSessionsCompleted: s.totalSessionsCompleted + 1,
      totalTimeMs: s.totalTimeMs + elapsed,
      lastSessionDate: record.date,
      sessionHistory: [...(s.sessionHistory ?? []), record],
    };
    setState(newState);
    saveState(newState);
    onEnd({
      totalQuestions: questionCount,
      totalCorrect: correctCount,
      totalResponseTimeMs: totalResponseTime,
      preMastery: preMasteryRef.current,
    });
  }, [setState, onEnd, questionCount, correctCount, totalResponseTime]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - sessionStartRef.current;
      const remaining = SESSION_DURATION_MS - elapsed;
      if (remaining <= 0) {
        setTimeLeftMs(0);
        endSession();
      } else {
        setTimeLeftMs(remaining);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [endSession]);

  // Pick first question
  useEffect(() => {
    nextQuestion();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function nextQuestion() {
    const s = stateRef.current;
    const allCells = Object.values(s.cells);
    const cell = selectNextCell(allCells, lastCellIdRef.current);
    lastCellIdRef.current = cell.id;
    const mode = Math.random() < 0.5 ? 'A' : 'B';
    setQuestion({ cell, mode, shownAt: Date.now() });
    setFeedback(null);
  }

  function handleAnswer(answeredNote: string | null, answeredCellId: string | null) {
    if (!question || feedback) return;

    const responseTimeMs = Date.now() - question.shownAt;
    const targetTime = getTargetTime(question.cell);

    let answerCorrect: boolean;
    if (question.mode === 'A') {
      answerCorrect = answeredNote === question.cell.noteName;
    } else {
      const clickedFret = answeredCellId ? parseInt(answeredCellId.split('-')[1]) : -1;
      answerCorrect = clickedFret === question.cell.fret;
    }
    const timedOut = responseTimeMs > targetTime;
    const isCorrect = answerCorrect && !timedOut;

    // Update cell data
    const s = stateRef.current;
    const cell = s.cells[question.cell.id];
    const attempt: Attempt = {
      correct: isCorrect,
      responseTimeMs,
      mode: question.mode,
      timestamp: Date.now(),
    };
    const newRecentAttempts = [...cell.recentAttempts, attempt].slice(-10);
    const updatedCell: Cell = {
      ...cell,
      recentAttempts: newRecentAttempts,
      totalAttempts: cell.totalAttempts + 1,
      totalCorrect: cell.totalCorrect + (isCorrect ? 1 : 0),
    };

    const newState = {
      ...s,
      cells: { ...s.cells, [cell.id]: updatedCell },
      totalQuestionsAnswered: s.totalQuestionsAnswered + 1,
    };
    setState(newState);
    saveState(newState);

    setQuestionCount(prev => prev + 1);
    if (isCorrect) setCorrectCount(prev => prev + 1);
    setTotalResponseTime(prev => prev + responseTimeMs);

    const feedbackCellId = question.mode === 'B' && answeredCellId ? answeredCellId : undefined;
    setFeedback({
      correct: isCorrect,
      timedOut,
      responseTimeMs,
      correctCellId: question.cell.id,
      answeredCellId: feedbackCellId,
    });

    setTimeout(() => {
      if (!endedRef.current) nextQuestion();
    }, isCorrect ? 400 : 1500);
  }

  const minutes = Math.floor(timeLeftMs / 60000);
  const seconds = Math.floor((timeLeftMs % 60000) / 1000);
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center px-4 py-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between w-full max-w-[720px] mb-4 text-sm text-gray-400">
        <span className="font-mono text-lg text-white">{timeDisplay}</span>
        <span>Question #{questionCount + 1}</span>
      </div>

      {/* Fretboard */}
      <Fretboard
        cells={state.cells}
        highlightCell={question?.mode === 'A' && !feedback ? question.cell.id : undefined}
        highlightCorrect={feedback ? feedback.correctCellId : undefined}
        highlightWrong={feedback && !feedback.correct && feedback.answeredCellId ? feedback.answeredCellId : undefined}
        activeString={question?.mode === 'B' && !feedback ? question.cell.string : undefined}
        onCellClick={
          question?.mode === 'B' && !feedback
            ? (cellId) => handleAnswer(null, cellId)
            : undefined
        }
        showNotes={!!feedback}
      />

      {/* Question prompt */}
      <div className="mt-4 text-center">
        {question?.mode === 'A' && !feedback && (
          <p className="text-lg text-white mb-4">What note is this?</p>
        )}
        {question?.mode === 'B' && !feedback && (
          <p className="text-lg text-white mb-4">
            Find <span className="font-bold text-yellow-400">{question.cell.noteName}</span> on string {question.cell.string}
          </p>
        )}
        {feedback && (
          <p className={`text-lg font-semibold mb-4 ${feedback.correct ? 'text-green-400' : 'text-red-400'}`}>
            {feedback.correct
              ? 'Correct!'
              : feedback.timedOut
                ? `Too slow! (${(feedback.responseTimeMs / 1000).toFixed(1)}s — limit ${(getTargetTime(question!.cell) / 1000).toFixed(1)}s)`
                : `Wrong — it's ${question?.cell.noteName} (String ${question?.cell.string}, Fret ${question?.cell.fret})`}
          </p>
        )}
      </div>

      {/* Mode A: note buttons */}
      {question?.mode === 'A' && !feedback && (
        <div className="grid grid-cols-4 gap-2 mt-2 max-w-[360px]">
          {NOTE_NAMES.map(note => (
            <button
              key={note}
              onClick={() => handleAnswer(note, null)}
              className="px-4 py-3 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded font-mono text-sm transition-colors"
            >
              {note}
            </button>
          ))}
        </div>
      )}

      {/* End button */}
      <button
        onClick={endSession}
        className="mt-8 px-6 py-2 text-sm text-gray-500 hover:text-gray-300 border border-gray-700 rounded transition-colors"
      >
        End Training
      </button>
    </div>
  );
}
