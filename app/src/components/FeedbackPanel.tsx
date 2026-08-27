import './FeedbackPanel.css';
import type { QuizQuestion } from '../models/types';

interface Props {
  readonly question: QuizQuestion;
  readonly submitted: string;
  readonly isCorrect: boolean;
  readonly attemptsUsed: number;
}

const ORDINAL = ['first', 'second', 'third'] as const;
const CREDIT = ['1 point', '½ point', '⅓ point'] as const;

/**
 * Rendered inside the card's fixed-height area, replacing the prompt. Keeping it there means the
 * input and the button below never move when feedback appears, so the soft keyboard stays put.
 *
 * Feedback remains until the learner advances — never auto-dismissed (FR-029, FR-030, FR-031).
 */
export function FeedbackPanel({ question, submitted, isCorrect, attemptsUsed }: Props) {
  const { kana } = question;
  const attemptIndex = Math.min(attemptsUsed, ORDINAL.length) - 1;

  return (
    <div className={`feedback feedback--${isCorrect ? 'correct' : 'incorrect'}`} aria-live="assertive">
      <p className="feedback__verdict">{isCorrect ? '✓ Correct' : '✕ Incorrect'}</p>

      <p className="feedback__mapping">
        <span lang="ja">{kana.kana}</span>
        <span aria-hidden="true"> — </span>
        <span>{kana.romaji}</span>
      </p>

      {!isCorrect && (
        <p className="feedback__detail">
          Your answer: <span className="feedback__submitted">{submitted.trim() === '' ? '—' : submitted}</span>
          <br />
          Correct answer:{' '}
          <span className="feedback__correct-answer" lang={question.direction === 'kana-to-romaji' ? 'en' : 'ja'}>
            {question.expectedAnswer}
          </span>
        </p>
      )}

      {attemptsUsed > 1 && attemptIndex >= 0 && (
        <p className="feedback__attempt">
          {isCorrect ? `On the ${ORDINAL[attemptIndex]} attempt — ${CREDIT[attemptIndex]}` : `All ${attemptsUsed} attempts used`}
        </p>
      )}
    </div>
  );
}
