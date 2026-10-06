import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Search } from 'lucide-react';
import { getRecentSearches } from '../services/recentSearches';
import { buttonClasses } from './Button';
import { cx } from './cx';
import { tagProblem, tagSlug } from './tag';

export interface SearchBoxProps {
  gameId: string;
  /** Accessible name of the input (the placeholder is not a label). */
  label: string;
  /** Shown on mount and again whenever it changes, e.g. the URL tag of a player page. */
  initialValue?: string;
  /** 'lg' keeps a reserved line for the hint under the field; 'md' shows it as a popover (header). */
  size?: 'md' | 'lg';
  /** Register the "/" shortcut. Exactly one SearchBox per page sets this. */
  shortcut?: boolean;
  /** A search is running: submitting is ignored and the button is disabled. */
  busy?: boolean;
  /** Receives the bare tag slug of a valid submission. Default: open that player's page. */
  onSubmitTag?: (slug: string) => void;
  /** Runs before the "/" shortcut focuses the input (lets a collapsed header open first). */
  onBeforeFocus?: () => void;
  id?: string;
  className?: string;
}

/** Player-tag search: validates before navigating and offers this game's recent searches. */
export function SearchBox({
  gameId, label, initialValue = '', size = 'md', shortcut = false, busy = false,
  onSubmitTag, onBeforeFocus, id, className,
}: SearchBoxProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const autoId = useId();
  const inputId = id ?? `tag-${autoId.replace(/:/g, '')}`;
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState(() => getRecentSearches(gameId));

  // A new URL tag (another player opened) replaces whatever was typed.
  const [prevInitial, setPrevInitial] = useState(initialValue);
  if (prevInitial !== initialValue) {
    setPrevInitial(initialValue);
    setValue(initialValue);
    setError(null);
  }

  const beforeFocus = useRef(onBeforeFocus);
  useEffect(() => {
    beforeFocus.current = onBeforeFocus;
  });

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      e.preventDefault();
      beforeFocus.current?.();
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shortcut]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!value.trim()) return setError('Enter a player tag, for example #2PP.');
    const problem = tagProblem(value);
    if (problem) return setError(problem);
    setError(null);
    const slug = tagSlug(value);
    if (onSubmitTag) onSubmitTag(slug);
    else navigate(`/game/${gameId}/player/${slug}`);
  };

  const messageId = `${inputId}-message`;
  const listId = `${inputId}-recent`;

  return (
    <form role="search" noValidate onSubmit={submit} className={cx('relative', className)}>
      <div
        className={cx(
          'flex h-12 items-center gap-2 rounded-card border bg-canvas pl-3 pr-0.5 transition-colors duration-150',
          error ? 'border-loss' : 'border-line-strong focus-within:border-accent',
        )}
      >
        <Search aria-hidden="true" className="size-4 shrink-0 text-fg-subtle" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onFocus={() => setRecent(getRecentSearches(gameId))}
          placeholder="#PLAYERTAG"
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? messageId : undefined}
          list={recent.length > 0 ? listId : undefined}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent text-base text-fg placeholder:text-fg-subtle focus:outline-none"
        />
        {shortcut && !value && (
          <kbd aria-hidden="true" className="hidden h-6 items-center rounded-md border border-line px-1.5 text-xs text-fg-subtle sm:flex">/</kbd>
        )}
        <button type="submit" disabled={busy} aria-label="Search player" className={buttonClasses('primary', 'size-11 shrink-0 px-0')}>
          <Search aria-hidden="true" />
        </button>
      </div>
      <p
        id={messageId}
        aria-live="polite"
        className={cx(
          'text-xs text-loss',
          size === 'lg'
            ? 'mt-2 min-h-4'
            : 'absolute inset-x-0 top-full z-10 mt-1 rounded-lg border border-line bg-surface-2 px-3 py-2 shadow-card',
          size === 'md' && !error && 'hidden',
        )}
      >
        {error}
      </p>
      {recent.length > 0 && (
        <datalist id={listId}>
          {recent.map((r) => (
            <option key={r.tag} value={r.tag}>{r.username}</option>
          ))}
        </datalist>
      )}
    </form>
  );
}
