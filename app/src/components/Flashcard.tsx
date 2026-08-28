import { AnswerNote } from './AnswerNote';
import type { AnswerNote as Note } from '../models/types';
import './Flashcard.css';

interface Props {
  readonly prompt: string;
  /** Kana prompts get the large display treatment; romaji prompts are set smaller. */
  readonly isKana: boolean;
  /** Shown after a wrong answer while attempts remain — inside the card, so nothing below moves. */
  readonly retry?: { readonly attemptsLeft: number; readonly lastAnswer: string } | undefined;
  /**
   * Which script the answer must be written in. Supplied only for a romaji prompt inside a
   * correction round, where the pool spans both scripts and "nu" would otherwise be ambiguous
   * between ぬ and ヌ (003 FR-020c). A kana prompt never needs it — the character says which
   * script it is (003 FR-020e).
   */
  readonly scriptLabel?: string | undefined;
  /**
   * Correction rounds. A wrong answer reveals the correct one and keeps it on screen while the
   * learner types it (003 FR-023, FR-023a) — a copying drill, not a second recall test, so a round
   * is always completable and never strands a learner on a card they cannot remember.
   */
  readonly correction?: { readonly lastAnswer: string; readonly correctAnswer: string } | undefined;
  /** What went wrong beyond "wrong" (feature 004). Shown on the open card, so a retry sees it too. */
  readonly note?: Note | null | undefined;
  /** False while attempts remain: the note then shows only what the learner wrote (FR-015a). */
  readonly answerRevealed?: boolean | undefined;
}

/** The card is the visual focus of the quiz screen (FR-020). */
export function Flashcard({
  prompt,
  isKana,
  retry,
  scriptLabel,
  correction,
  note,
  answerRevealed = false,
}: Props) {
  return (
    <>
      <p
        className={`flashcard__prompt${isKana ? '' : ' flashcard__prompt--romaji'}`}
        lang={isKana ? 'ja' : 'en'}
        // The script is part of the question, so it belongs in the prompt's accessible name
        // rather than arriving as a separate announcement after it.
        aria-label={scriptLabel ? `${prompt} — write in ${scriptLabel}` : undefined}
      >
        {prompt}
      </p>

      {scriptLabel && (
        <p className="flashcard__script-label">
          write in <strong>{scriptLabel}</strong>
        </p>
      )}

      {correction && (
        <p className="flashcard__correction" role="status" aria-live="assertive">
          <span className="flashcard__retry-verdict">Not quite</span> — you wrote{' '}
          <span className="flashcard__retry-answer">{correction.lastAnswer.trim() || '—'}</span>.
          <br />
          The answer is{' '}
          <span className="flashcard__correction-answer" lang={isKana ? 'en' : 'ja'}>
            {correction.correctAnswer}
          </span>
          . Type it to continue.
        </p>
      )}

      {note && <AnswerNote note={note} answerRevealed={answerRevealed} />}

      {retry && (
        <p className="flashcard__retry" role="status" aria-live="assertive">
          <span className="flashcard__retry-verdict">Not quite</span>{' '}
          <span className="flashcard__retry-answer">{retry.lastAnswer.trim()}</span> isn&rsquo;t it —{' '}
          {retry.attemptsLeft} {retry.attemptsLeft === 1 ? 'attempt' : 'attempts'} left
        </p>
      )}
    </>
  );
}
