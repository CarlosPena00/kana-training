import { useQuiz } from '../state/QuizContext';
import { scoreSession } from '../engine/score';
import { formatDuration, formatPerCard } from '../engine/duration';
import './ResultsScreen.css';

export function ResultsScreen() {
  const { state, dispatch } = useQuiz();
  const session = state.session;
  if (!session) return null;

  const score = scoreSession(session);
  const total = session.questions.length;
  const multipleAttempts = session.configuration.attemptsAllowed > 1;
  // Trailing zeros look like a bug on a score of exactly 7; 7.83 needs the decimals.
  const points = Number.isInteger(score.points) ? String(score.points) : score.points.toFixed(2);

  return (
    <section className="results">
      <h1 className="results__title">Quiz complete</h1>

      <p className="results__score">
        {multipleAttempts ? `${points} / ${total} points` : `${score.correctCount} / ${total} correct`}
      </p>

      <p className="results__accuracy">
        <span className="results__accuracy-value">{score.accuracy}%</span>
        <span className="muted">accuracy</span>
      </p>

      <p className="results__tally">
        <span className="results__correct">✓ Correct: {score.correctCount}</span>
        <span className="results__incorrect">✕ Incorrect: {score.incorrectCount}</span>
      </p>

      {score.elapsedMs !== null && score.msPerCard !== null && (
        <dl className="results__timing">
          <div className="results__timing-item">
            <dt>Total time</dt>
            <dd>{formatDuration(score.elapsedMs)}</dd>
          </div>
          <div className="results__timing-item">
            <dt>Per card</dt>
            <dd>{formatPerCard(score.msPerCard)}</dd>
          </div>
        </dl>
      )}

      {multipleAttempts && score.correctCount > 0 && (
        <dl className="results__attempts">
          {score.byAttempt.map((count, index) => (
            <div key={index} className="results__attempt">
              <dt>{['First try', 'Second try', 'Third try'][index]}</dt>
              <dd>
                {count}
                <span className="results__attempt-credit">
                  {['× 1', '× \u00bd', '× \u2153'][index]}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      {score.missedKana.length > 0 && (
        <section className="results__missed">
          <h2 className="section-title">Kana to review</h2>
          <ul className="results__missed-list">
            {score.missedKana.map((kana) => (
              <li key={kana.kana} className="results__missed-item">
                <span className="results__missed-kana" lang="ja">{kana.kana}</span>
                <span className="results__missed-romaji">{kana.romaji}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="results__actions">
        <button
          type="button"
          className="button button--primary button--large"
          onClick={() => dispatch({ type: 'practice-again', now: performance.now() })}
        >
          Practice again
        </button>
        <button type="button" className="button button--large" onClick={() => dispatch({ type: 'go-home' })}>
          Back to home
        </button>
      </div>
    </section>
  );
}
