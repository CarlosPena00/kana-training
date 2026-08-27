import { useEffect, useRef, type KeyboardEvent } from 'react';
import './AnswerInput.css';

interface Props {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly expectsKana: boolean;
  /** Changes on every card and every submission; refocuses the field so the keyboard stays up. */
  readonly focusKey: string;
  readonly actionLabel: string;
}

/**
 * One input for the whole quiz, kept focused from the first card to the last so the Android soft
 * keyboard never closes — every open and close costs a viewport resize and a full reflow.
 *
 * Three things are load-bearing here, each learned from measuring on a device:
 *
 * - It is never unmounted or re-keyed. Either one destroys the input and takes the keyboard.
 * - It is never `readOnly` or `disabled`. Chrome will not raise the keyboard for a read-only
 *   field, and a disabled one cannot hold focus at all.
 * - There is no <form>. Chrome on Android dismisses the keyboard on form submission, so a real
 *   submit closed it on the first answer and it never came back. Enter is handled on the input
 *   and the button is a plain button.
 * - Focus is pulled back after every submission. Tapping the button focuses it — preventing the
 *   default on pointer-down stops that for a mouse but not for touch — so the field takes focus
 *   back on the next commit.
 *
 * The value is owned by the caller, so clearing happens in the same event that advances the card
 * rather than in an effect afterwards, which would wipe anything typed in between.
 */
export function AnswerInput({ value, onChange, onSubmit, expectsKana, focusKey, actionLabel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [focusKey]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    // Kana is typed with the learner's own IME (FR-021); the Enter that confirms a conversion
    // must not also submit the answer.
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="answer">
      <label className="visually-hidden" htmlFor="answer-input">
        {expectsKana ? 'Type the kana' : 'Type the romaji'}
      </label>
      <input
        id="answer-input"
        ref={inputRef}
        className="answer__input"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={expectsKana ? 'かな' : 'romaji'}
        lang={expectsKana ? 'ja' : 'en'}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="done"
      />
      <button
        type="button"
        onClick={onSubmit}
        className="button button--primary button--large"
        // A real tap focuses the button, which blurs the field and closes the soft keyboard —
        // the layout then reflows twice per card. Preventing the default on pointer-down keeps
        // focus in the input; the click still fires, so the button works exactly as before.
        onPointerDown={(event) => event.preventDefault()}
      >
        {actionLabel}
      </button>
    </div>
  );
}
