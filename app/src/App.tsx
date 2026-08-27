import { useEffect, useRef } from 'react';
import { ConfigScreen } from './screens/ConfigScreen';
import { QuizScreen } from './screens/QuizScreen';
import { ResultsScreen } from './screens/ResultsScreen';
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
  const { state, dispatch } = useQuiz();
  const quizIsOpen = state.status !== 'configuring';
  const pushedRef = useRef(false);

  useEffect(() => {
    if (quizIsOpen && !pushedRef.current) {
      window.history.pushState({ kanaQuiz: true }, '');
      pushedRef.current = true;
    } else if (!quizIsOpen && pushedRef.current) {
      pushedRef.current = false;
    }
  }, [quizIsOpen]);

  useEffect(() => {
    const onPopState = () => {
      pushedRef.current = false;
      dispatch({ type: 'abandon' });
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
    </main>
  );
}
