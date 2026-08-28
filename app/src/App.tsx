import { useEffect, useRef } from 'react';
import { ConfigScreen } from './screens/ConfigScreen';
import { QuizScreen } from './screens/QuizScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { useQuiz } from './state/QuizContext';
import { savePreferences } from './state/preferences';

/**
 * Screen switch plus platform back handling.
 *
 * One history entry is pushed when a quiz starts, so a browser back button and an Android back
 * gesture both arrive as the same `popstate` and both leave the quiz cleanly (FR-038). Capacitor
 * routes the hardware back through the same event, which is why no per-platform code is needed.
 */
export function App() {
  const { state, dispatch, recordAnswer } = useQuiz();
  const quizIsOpen = state.status !== 'configuring';
  const pushedRef = useRef(false);

  /**
   * Feeds resolved first submissions into the mistake list.
   *
   * `answers` grows by one entry the first time a card is answered and is replaced in place on
   * every retry after that, so its length is exactly the count of cards that have received a
   * first submission — which is the only thing the mistake list reacts to (FR-006). Recording
   * here as answers land, rather than at the end of the round, is what makes an abandoned quiz
   * still contribute the answers the learner actually gave (FR-003).
   */
  const session = state.session;
  const questions = session?.questions;
  const recordedRef = useRef(0);
  const questionsRef = useRef<typeof questions>(undefined);

  useEffect(() => {
    if (!session || !questions) {
      recordedRef.current = 0;
      questionsRef.current = undefined;
      return;
    }
    // A new round generates a new questions array, which is the signal to start counting again.
    if (questionsRef.current !== questions) {
      questionsRef.current = questions;
      recordedRef.current = 0;
    }
    for (let index = recordedRef.current; index < session.answers.length; index += 1) {
      const record = session.answers[index];
      const question = record ? questions[record.questionIndex] : undefined;
      if (record && question) recordAnswer(question.kana, record.firstSubmissionCorrect);
    }
    recordedRef.current = session.answers.length;
  }, [session, questions, recordAnswer]);

  useEffect(() => {
    if (quizIsOpen && !pushedRef.current) {
      window.history.pushState({ kanaQuiz: true }, '');
      pushedRef.current = true;
    } else if (!quizIsOpen && pushedRef.current) {
      pushedRef.current = false;
    }
  }, [quizIsOpen]);

  /**
   * The history screen is pushed onto the platform back stack exactly as a quiz is, so the same
   * gesture leaves it. A ref carries the current screen into the listener because the listener is
   * registered once and must not be torn down and rebuilt on every state change.
   */
  const statusRef = useRef(state.status);
  statusRef.current = state.status;

  useEffect(() => {
    const onPopState = () => {
      pushedRef.current = false;
      dispatch(statusRef.current === 'history' ? { type: 'close-history' } : { type: 'abandon' });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [dispatch]);

  // Saved when a quiz starts — the moment the configuration is known to be valid and intentional.
  useEffect(() => {
    if (state.status === 'quizzing') savePreferences(state.configuration);
  }, [state.status, state.configuration]);

  return (
    <main className="app-shell">
      {state.status === 'configuring' && <ConfigScreen />}
      {state.status === 'quizzing' && <QuizScreen />}
      {state.status === 'results' && <ResultsScreen />}
      {state.status === 'history' && <HistoryScreen />}
    </main>
  );
}
