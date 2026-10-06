import { useId } from 'react';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface FilterGroupProps {
  /** Visible name of the group ("Result"); also its accessible name. */
  legend: string;
  options: readonly FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

/**
 * Single-choice filter as a native radio group styled as pills: Tab enters
 * the group on the checked option, arrow keys move and select (browser
 * behaviour), each option says how many battles it would show. Wraps on
 * narrow screens; selecting never changes the group's size.
 */
export function FilterGroup({ legend, options, value, onChange }: FilterGroupProps) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs font-medium text-fg-subtle">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="relative">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border border-line bg-surface-1 px-4 text-sm font-medium text-fg-muted transition-colors duration-150 select-none peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-contrast peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg hover:border-line-strong peer-checked:hover:border-accent">
              {option.label}
              <span className="tabular-nums">{option.count}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
