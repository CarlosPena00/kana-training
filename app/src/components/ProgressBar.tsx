import './ProgressBar.css';

interface Props {
  readonly current: number;
  readonly total: number;
  readonly correctCount: number;
  readonly incorrectCount: number;
}

/** Position, progress, and the running tally (FR-019, FR-032). */
export function ProgressBar({ current, total, correctCount, incorrectCount }: Props) {
  const percent = total === 0 ? 0 : Math.round(((current - 1) / total) * 100);

  return (
    <div className="progress">
      <div className="progress__row">
        <span className="progress__position">
          Question {current} / {total}
        </span>
        <span className="progress__tally">
          <span className="progress__correct">✓ {correctCount}</span>
          <span className="progress__incorrect">✕ {incorrectCount}</span>
        </span>
      </div>
      <div
        className="progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current - 1}
        aria-label={`Question ${current} of ${total}`}
      >
        <div className="progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
