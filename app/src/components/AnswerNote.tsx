import type { AnswerNote as Note } from '../models/types';
import './AnswerNote.css';

interface Props {
  readonly note: Note;
  /**
   * While attempts remain the correct answer is withheld, so a confusion shows only the half that
   * says what the learner wrote (FR-015a). The engine has already suppressed the note kinds that
   * cannot survive a retry at all.
   */
  readonly answerRevealed: boolean;
}

const SCRIPT_LABEL: Readonly<Record<string, string>> = {
  hiragana: 'Hiragana',
  katakana: 'Katakana',
};

/**
 * Explains a wrong answer: which character the learner actually wrote, or which spelling this app
 * uses, or which alphabet they slipped into.
 *
 * Everything is labelled in words rather than by colour or position (WCAG 1.4.1), and the whole
 * note carries one accessible name so a screen reader reads a sentence instead of loose characters
 * (FR-012).
 */
export function AnswerNote({ note, answerRevealed }: Props) {
  if (note.kind === 'spelling') {
    return (
      <p className="answer-note answer-note--spelling" role="status">
        You wrote <span className="answer-note__typed">{note.typed}</span> — this app spells it{' '}
        <strong className="answer-note__canonical">{note.canonical}</strong>.
      </p>
    );
  }

  if (note.kind === 'script') {
    const wroteScript = SCRIPT_LABEL[note.wrote.script] ?? note.wrote.script;
    const wantedScript = SCRIPT_LABEL[note.wanted.script] ?? note.wanted.script;
    return (
      <p
        className="answer-note answer-note--script"
        role="status"
        aria-label={`Right sound, wrong script. You wrote the ${wroteScript} ${note.wrote.kana}. This card wants ${wantedScript}.`}
      >
        <span aria-hidden="true">
          Right sound, wrong script — <span lang="ja">{note.wrote.kana}</span> is {wroteScript}. This
          card wants <strong>{wantedScript}</strong>.
        </span>
      </p>
    );
  }

  // A confusion between two characters. While the answer is hidden only the learner's own side is
  // shown; naming the wanted kana would give away what the retry is withholding.
  if (!answerRevealed) {
    return (
      <p
        className="answer-note answer-note--partial"
        role="status"
        aria-label={`You wrote ${note.wrote.kana}, which is ${note.wrote.romaji}.`}
      >
        <span aria-hidden="true">
          You wrote <span className="answer-note__kana" lang="ja">{note.wrote.kana}</span> ({note.wrote.romaji})
        </span>
      </p>
    );
  }

  return (
    <div
      className="answer-note answer-note--pair"
      role="status"
      aria-label={`You mixed these up. You wrote ${note.wrote.kana}, which is ${note.wrote.romaji}. The answer was ${note.wanted.kana}, which is ${note.wanted.romaji}.`}
    >
      <div className="answer-note__pair" aria-hidden="true">
        <span className="answer-note__side">
          {/* The label carries the meaning; nothing here depends on which side it is on. */}
          <span className="answer-note__label">You wrote</span>
          <span className="answer-note__kana" lang="ja">
            {note.wrote.kana}
          </span>
          <span className="answer-note__romaji">{note.wrote.romaji}</span>
        </span>

        <span className="answer-note__side">
          <span className="answer-note__label">The answer</span>
          <span className="answer-note__kana" lang="ja">
            {note.wanted.kana}
          </span>
          <span className="answer-note__romaji">{note.wanted.romaji}</span>
        </span>
      </div>
    </div>
  );
}
