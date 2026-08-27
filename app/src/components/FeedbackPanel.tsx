import './FeedbackPanel.css';
import type { QuizQuestion } from '../models/types';

interface Props {
  readonly question: QuizQuestion;
  readonly submitted: string;
  readonly isCorrect: boolean;
  readonly attemptsUsed: number;
  readonly isLastCard: boolean;
  readonly onContinue: () => void;
}

/**
 * Feedback stays on screen until the learner chooses to continue — never auto-dismissed
 * (FR-029, FR-030, FR-031).
 */
const ORDINAL = ['first', 'second', 'third'] as const;
const CREDIT = ['1 point', '\u00bd point', '\u2153 point'] as const;

export function FeedbackPanel({
  question,
  submitted,
  isCorrect,
  attemptsUsed,
  isLastCard,
  onContinue,
}: Props) {
  const { kana } = question;
  const attemptIndex = Math.min(attemptsUsed, ORDINAL.length) - 1;

  return (
    <section
      className={`feedback feedback--${isCorrect ? 'correct' : 'incorrect'}`}
      aria-live="assertive"
    >
      <p className="feedback__verdict">{isCorrect ? '✓ Correct' : '✕ Incorrect'}</p>

      {isCorrect && attemptsUsed > 1 && attemptIndex >= 0 && (
        <p className="feedback__attempt">
          On the {ORDINAL[attemptIndex]} attempt — {CREDIT[attemptIndex]}
        </p>
      )}
      {!isCorrect && attemptsUsed > 1 && (
        <p className="feedback__attempt">All {attemptsUsed} attempts used</p>
      )}

      {isCorrect ? (
        <p className="feedback__mapping">
          <span lang="ja">{kana.kana}</span>
          <span aria-hidden="true"> — </span>
          <span>{kana.romaji}</span>
        </p>
      ) : (
        <dl className="feedback__detail">
          <dt>Question</dt>
          <dd lang={question.direction === 'kana-to-romaji' ? 'ja' : 'en'}>{question.prompt}</dd>
          <dt>Your answer</dt>
          <dd>{submitted.trim() === '' ? '—' : submitted}</dd>
          <dt>Correct answer</dt>
          <dd className="feedback__correct-answer" lang={question.direction === 'kana-to-romaji' ? 'en' : 'ja'}>
            {question.expectedAnswer}
          </dd>
        </dl>
      )}

      <button type="button" className="button button--primary button--large" onClick={onContinue} autoFocus>
        {isLastCard ? 'See results' : 'Next card'}
      </button>
    </section>
  );
}
