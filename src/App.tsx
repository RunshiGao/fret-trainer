import { useState, useCallback } from 'react';
import type { AppState } from './data/fretboard';
import { loadState } from './engine/storage';
import Home from './components/Home';
import Session from './components/Session';
import Summary from './components/Summary';

type SessionResult = {
  totalQuestions: number;
  totalCorrect: number;
  totalResponseTimeMs: number;
  preMastery: Record<string, number | null>;
};

type View = 'home' | 'session' | 'summary';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [view, setView] = useState<View>('home');
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);

  const handleEndSession = useCallback((result: SessionResult) => {
    setSessionResult(result);
    setView('summary');
  }, []);

  if (view === 'session') {
    return (
      <Session
        state={state}
        setState={setState}
        onEnd={handleEndSession}
      />
    );
  }

  if (view === 'summary' && sessionResult) {
    return (
      <Summary
        state={state}
        result={sessionResult}
        onHome={() => setView('home')}
      />
    );
  }

  return (
    <Home
      state={state}
      onStartSession={() => setView('session')}
    />
  );
}
