import './Flashcard.css';

interface Props {
  readonly prompt: string;
  /** Kana prompts get the large display treatment; romaji prompts are set smaller. */
  readonly isKana: boolean;
}

/** The card is the visual focus of the quiz screen (FR-020). */
export function Flashcard({ prompt, isKana }: Props) {
  return (
    <div className="flashcard">
      <p className={`flashcard__prompt${isKana ? '' : ' flashcard__prompt--romaji'}`} lang={isKana ? 'ja' : 'en'}>
        {prompt}
      </p>
    </div>
  );
}
