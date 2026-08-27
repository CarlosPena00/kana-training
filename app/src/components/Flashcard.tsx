import './Flashcard.css';

interface Props {
  readonly prompt: string;
  /** Kana prompts get the large display treatment; romaji prompts are set smaller. */
  readonly isKana: boolean;
  /** Shown after a wrong answer while attempts remain — inside the card, so nothing below moves. */
  readonly retry?: { readonly attemptsLeft: number; readonly lastAnswer: string } | undefined;
}

/** The card is the visual focus of the quiz screen (FR-020). */
export function Flashcard({ prompt, isKana, retry }: Props) {
  return (
    <>
      <p className={`flashcard__prompt${isKana ? '' : ' flashcard__prompt--romaji'}`} lang={isKana ? 'ja' : 'en'}>
        {prompt}
      </p>

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
