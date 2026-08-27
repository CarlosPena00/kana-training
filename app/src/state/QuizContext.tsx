import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { initialState, quizReducer, type QuizAction, type QuizState } from './quizReducer';
import type { QuizConfiguration } from '../models/types';

/**
 * useReducer behind a context — the simplest mechanism that holds this app's state
 * (Constitution Principle V). No state-management library.
 */

interface QuizContextValue {
  state: QuizState;
  dispatch: Dispatch<QuizAction>;
}

const QuizContext = createContext<QuizContextValue | null>(null);

export function QuizProvider({
  children,
  initialConfiguration,
}: {
  children: ReactNode;
  initialConfiguration?: QuizConfiguration;
}) {
  const [state, dispatch] = useReducer(
    quizReducer,
    initialConfiguration ? { ...initialState, configuration: initialConfiguration } : initialState,
  );
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <QuizContext value={value}>{children}</QuizContext>;
}

export function useQuiz(): QuizContextValue {
  const value = useContext(QuizContext);
  if (!value) throw new Error('useQuiz must be used inside a QuizProvider');
  return value;
}
