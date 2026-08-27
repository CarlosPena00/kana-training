import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import './AnswerInput.css';

interface Props {
  readonly expectsKana: boolean;
  readonly disabled: boolean;
  readonly onSubmit: (raw: string) => void;
}

/**
 * A single text input with Enter-to-submit (FR-022).
 *
 * Kana is typed with the learner's own Japanese keyboard or IME (FR-021, research.md D1), so the
 * Enter that confirms an IME conversion must not also submit the answer. `isComposing` tells the
 * two apart; without this check every kana answer would submit half-converted.
 */
export function AnswerInput({ expectsKana, disabled, onSubmit }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // The caller remounts this component for each card and each attempt, so the field starts empty
  // by construction. Clearing it from an effect instead would wipe anything typed between the
  // render and the effect — a fast typist loses their first keystrokes.
  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    onSubmit(value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault();
  };

  return (
    <form className="answer" onSubmit={submit}>
      <label className="visually-hidden" htmlFor="answer-input">
        {expectsKana ? 'Type the kana' : 'Type the romaji'}
      </label>
      <input
        id="answer-input"
        ref={inputRef}
        className="answer__input"
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={expectsKana ? 'かな' : 'romaji'}
        lang={expectsKana ? 'ja' : 'en'}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="done"
      />
      <button type="submit" className="button button--primary button--large" disabled={disabled}>
        Check
      </button>
    </form>
  );
}
