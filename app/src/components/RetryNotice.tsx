import './RetryNotice.css';

interface Props {
  readonly attemptsLeft: number;
  readonly lastAnswer: string;
}

/**
 * Shown after a wrong answer when attempts remain. It deliberately does not reveal anything about
 * the correct answer — that is the whole point of having more than one try (FR-044).
 */
export function RetryNotice({ attemptsLeft, lastAnswer }: Props) {
  return (
    <p className="retry" role="status" aria-live="assertive">
      <span className="retry__verdict">Not quite</span>
      <span className="retry__detail">
        <span className="retry__answer">{lastAnswer.trim()}</span> isn&rsquo;t it — try again.
      </span>
      <span className="retry__left">
        {attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} left
      </span>
    </p>
  );
}
