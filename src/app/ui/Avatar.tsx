import { useState, type ReactNode } from 'react';
import { cx } from './cx';

interface AvatarProps {
  /** Tried in order; the next one loads when one fails. */
  sources: string[];
  alt: string;
  /** Shown when every source failed or there is none (a lucide icon or a short text). */
  fallback: ReactNode;
  className?: string;
}

/**
 * Square player image with a fallback chain. Give it a `key` that changes
 * with the player so a new player starts again from the first source.
 */
export function Avatar({ sources, alt, fallback, className }: AvatarProps) {
  const [index, setIndex] = useState(0);
  const src = sources[index];
  return (
    <span className={cx('flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-card border border-line bg-surface-2 sm:size-16', className)}>
      {src ? (
        <img
          key={src}
          src={src}
          alt={alt}
          width={48}
          height={48}
          decoding="async"
          onError={() => setIndex((i) => i + 1)}
          className="size-10 object-contain sm:size-12"
        />
      ) : (
        <span aria-hidden="true" className="text-lg font-bold text-fg-muted tabular-nums [&_svg]:size-7">{fallback}</span>
      )}
    </span>
  );
}
