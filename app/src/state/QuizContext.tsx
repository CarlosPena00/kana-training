import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import { initialState, quizReducer, type QuizAction, type QuizState } from './quizReducer';
import { clearMistakes, loadMistakes, saveMistakes } from './mistakeStore';
import { applyAnswer } from '../engine/mistakes';
import type { Kana, MistakeList, QuizConfiguration } from '../models/types';

/**
 * useReducer behind a context — the simplest mechanism that holds this app's state
 * (Constitution Principle V). No state-management library.
 *
 * The mistake list sits beside the reducer rather than inside it. The reducer must stay pure
 * (Constitution Principle IV), and the list has to be written to storage as answers land, so it
 * is held here and persisted by the one function that changes it (research D6).
 */

interface QuizContextValue {
  state: QuizState;
  dispatch: Dispatch<QuizAction>;
  /** The learner's current mistake list, sorted only where it is displayed. */
  mistakes: MistakeList;
  /** Applies one answered card. Must be given the learner's *first* answer, never a later one. */
  recordAnswer: (kana: Kana, firstSubmissionCorrect: boolean) => void;
  /** Deletes the whole history (FR-038). Leaves preferences untouched. */
  clearHistory: () => void;
}

const QuizContext = createContext<QuizContextValue | null>(null);

export function QuizProvider({
  children,
  initialConfiguration,
  initialMistakes,
}: {
  children: ReactNode;
  initialConfiguration?: QuizConfiguration;
  initialMistakes?: MistakeList;
}) {
  const [state, dispatch] = useReducer(
    quizReducer,
    initialConfiguration ? { ...initialState, configuration: initialConfiguration } : initialState,
  );

  // Read once at startup. A missing, unreadable, or evicted store yields an empty list, which is
  // a normal state rather than an error (FR-035).
  const [mistakes, setMistakes] = useState<MistakeList>(() => initialMistakes ?? loadMistakes());

  const recordAnswer = useCallback((kana: Kana, firstSubmissionCorrect: boolean) => {
    setMistakes((current) => {
      const next = applyAnswer(current, kana, firstSubmissionCorrect, new Date().toISOString());
      // Written as the answer lands, not at the end of the round, so a quiz the learner abandons
      // still contributes the answers they actually gave (FR-003).
      saveMistakes(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    clearMistakes();
    setMistakes([]);
  }, []);

  const value = useMemo(
    () => ({ state, dispatch, mistakes, recordAnswer, clearHistory }),
    [state, mistakes, recordAnswer, clearHistory],
  );
  return <QuizContext value={value}>{children}</QuizContext>;
}

export function useQuiz(): QuizContextValue {
  const value = useContext(QuizContext);
  if (!value) throw new Error('useQuiz must be used inside a QuizProvider');
  return value;
}
