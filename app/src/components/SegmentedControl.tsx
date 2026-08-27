import './SegmentedControl.css';

export interface SegmentedOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

interface Props<T extends string> {
  readonly legend: string;
  readonly options: readonly SegmentedOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

/**
 * Shared primitive for the script chooser (US2) and the direction chooser (US3).
 * Built from real radio inputs so keyboard navigation and screen-reader semantics come from the
 * platform rather than from hand-rolled ARIA (FR-040, FR-041).
 */
export function SegmentedControl<T extends string>({ legend, options, value, onChange }: Props<T>) {
  return (
    <fieldset className="segmented">
      <legend className="segmented__legend">{legend}</legend>
      <div className="segmented__options">
        {options.map((option) => (
          <label
            key={option.value}
            className={`segmented__option${option.value === value ? ' segmented__option--selected' : ''}`}
          >
            <input
              type="radio"
              name={legend}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="visually-hidden"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
