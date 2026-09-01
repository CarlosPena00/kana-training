import { AnswerNote } from './AnswerNote';
import { WordExample } from './WordExample';
import './FeedbackPanel.css';
import type { KanaExample } from '../engine/examples';
import type { AnswerNote as Note, QuizQuestion } from '../models/types';

interface Props {
  readonly question: QuizQuestion;
  readonly submitted: string;
  readonly isCorrect: boolean;
  readonly attemptsUsed: number;
  /**
   * Whether to report which attempt solved the card and what it was worth. False in a correction
   * round, which has no attempt limit and no partial credit (003 FR-026, FR-029a): the round
   * requires the answer to be typed before moving on, so "on the second attempt — ½ point" would
   * both be wrong and contradict the results screen, which scores that card as incorrect.
   */
  readonly showAttemptCredit?: boolean | undefined;
  /** What went wrong beyond "wrong", when the answer was itself a real reading (feature 004). */
  readonly note?: Note | null | undefined;
  /**
   * A word using the missed character. Shown only on a wrong answer: after a correct one it would
   * be a reward nobody asked for, competing with the verdict for the moment the learner is
   * actually reading.
   */
  readonly example?: KanaExample | null | undefined;
  /**
   * Whether the card is being held until the learner types the answer shown here. The instruction
   * says what to do; the card cannot advance without it, so nothing else needs to.
   */
  readonly mustCopy?: boolean | undefined;
}

const ORDINAL = ['first', 'second', 'third'] as const;
const CREDIT = ['1 point', '½ point', '⅓ point'] as const;

/**
 * Rendered inside the card's fixed-height area, replacing the prompt. Keeping it there means the
 * input and the button below never move when feedback appears, so the soft keyboard stays put.
 *
 * Feedback remains until the learner advances — never auto-dismissed (FR-029, FR-030, FR-031).
 */
export function FeedbackPanel({
  question,
  submitted,
  isCorrect,
  attemptsUsed,
  showAttemptCredit = true,
  note,
  example,
  mustCopy = false,
}: Props) {
  const { kana } = question;
  const attemptIndex = Math.min(attemptsUsed, ORDINAL.length) - 1;

  /**
   * A confusion pair states everything this panel would otherwise state twice: it names the kana
   * the learner wrote and the one that was wanted, each with its reading, under labels that say
   * which is which. So both the mapping line and the answer detail step aside for it — FR-031's
   * prompt, learner's answer and correct answer are all still on screen, rendered once instead of
   * twice, and the room that buys goes to the example word.
   */
  const pairSaysIt = note?.kind === 'kana-confusion';

  return (
    <div className={`feedback feedback--${isCorrect ? 'correct' : 'incorrect'}`} aria-live="assertive">
      <p className="feedback__verdict">{isCorrect ? '✓ Correct' : '✕ Incorrect'}</p>

      {/* A confusion pair already shows both characters with their readings, so repeating the
          mapping here would duplicate it and cost height the stage does not have to give. */}
      {!pairSaysIt && (
        <p className="feedback__mapping">
          <span lang="ja">{kana.kana}</span>
          <span aria-hidden="true"> — </span>
          <span>{kana.romaji}</span>
        </p>
      )}

      {!isCorrect && !pairSaysIt && (
        <p className="feedback__detail">
          Your answer: <span className="feedback__submitted">{submitted.trim() === '' ? '—' : submitted}</span>
          <br />
          Correct answer:{' '}
          <span className="feedback__correct-answer" lang={question.direction === 'kana-to-romaji' ? 'en' : 'ja'}>
            {question.expectedAnswer}
          </span>
        </p>
      )}

      {note && <AnswerNote note={note} answerRevealed />}

      {!isCorrect && example && <WordExample example={example} />}

      {mustCopy && (
        <p className="feedback__copy-prompt" role="status">
          Type it to continue.
        </p>
      )}

      {/* Only when it says something: on a correct card it reports which attempt earned what. On
          a missed one, "All 3 attempts used" adds nothing the verdict has not already said, and
          it costs the panel a line it needs for the answer, the example and the instruction. */}
      {showAttemptCredit && isCorrect && attemptsUsed > 1 && attemptIndex >= 0 && (
        <p className="feedback__attempt">
          On the {ORDINAL[attemptIndex]} attempt — {CREDIT[attemptIndex]}
        </p>
      )}
    </div>
  );
}
