import { useId } from 'react';
import './CardCountPicker.css';

const PRESETS = [5, 10, 20, 30, 50] as const;

interface Props {
  readonly value: number;
  readonly poolSize: number;
  readonly onChange: (cardCount: number) => void;
}

/**
 * Presets plus a custom whole number. Values above the current pool are unavailable rather than
 * silently clamped, so the learner sees why (FR-011, FR-012).
 */
export function CardCountPicker({ value, poolSize, onChange }: Props) {
  const customId = useId();
  const isPreset = PRESETS.some((preset) => preset === value);

  return (
    <section className="card-count">
      <div className="card-count__header">
        <h2 className="section-title">Number of cards</h2>
        <p className="muted">{poolSize} available</p>
      </div>

      <div className="card-count__options">
        {PRESETS.map((preset) => {
          const unavailable = preset > poolSize;
          return (
            <button
              key={preset}
              type="button"
              className={`card-count__preset${value === preset ? ' card-count__preset--selected' : ''}`}
              onClick={() => onChange(preset)}
              disabled={unavailable}
              aria-pressed={value === preset}
              title={unavailable ? `Only ${poolSize} kana are selected` : undefined}
            >
              {preset}
            </button>
          );
        })}
      </div>

      <div className="card-count__custom">
        <label htmlFor={customId}>Custom</label>
        <input
          id={customId}
          type="number"
          inputMode="numeric"
          min={1}
          max={Math.max(poolSize, 1)}
          step={1}
          value={isPreset ? '' : String(value)}
          placeholder={`1–${Math.max(poolSize, 1)}`}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            if (Number.isInteger(parsed)) onChange(parsed);
          }}
        />
      </div>
    </section>
  );
}
