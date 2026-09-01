import type { KanaExample } from '../engine/examples';
import './WordExample.css';

interface Props {
  readonly example: KanaExample;
}

/**
 * A real word using the character the learner just missed, with that character marked inside it.
 *
 * Shown only once the answer is on screen. A word contains the answer by construction, so putting
 * one in front of a learner who still has attempts left would simply give the card away.
 *
 * The mark is an emphasis, not the message: the word, its reading and its meaning are all readable
 * without noticing which part is highlighted, so nothing here depends on colour (WCAG 1.4.1). The
 * whole line carries one accessible name for the same reason the notes do — a screen reader should
 * read a sentence, not a highlighted fragment surrounded by loose characters.
 */
export function WordExample({ example }: Props) {
  const { entry, at, length } = example;
  const before = entry.word.slice(0, at);
  const match = entry.word.slice(at, at + length);
  const after = entry.word.slice(at + length);

  return (
    <p
      className="word-example"
      role="status"
      aria-label={`Seen in ${entry.word}, ${entry.romaji}, meaning ${entry.meaning}.`}
    >
      <span aria-hidden="true">
        <span className="word-example__label">Seen in</span>{' '}
        <span className="word-example__word" lang="ja">
          {before}
          <mark className="word-example__hit">{match}</mark>
          {after}
        </span>{' '}
        <span className="word-example__gloss">
          {entry.romaji} — {entry.meaning}
        </span>
      </span>
    </p>
  );
}
