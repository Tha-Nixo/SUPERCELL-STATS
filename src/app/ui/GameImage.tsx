import { useState, type ReactNode } from 'react';
import { cx } from './cx';

interface GameImageProps {
  /** Tried in order; empty entries are skipped. The next one loads when one fails. */
  sources: ReadonlyArray<string | undefined>;
  /** Describes the image; '' for a decorative one (its name is printed next to it). */
  alt: string;
  /** Intrinsic size: reserves the box before the image arrives, and sizes the fallback. */
  width: number;
  height: number;
  /** Shown in the same box when every source failed or there is none (a lucide icon). */
  fallback: ReactNode;
  className?: string;
  /** 'eager' only for art that is visible on first paint. */
  loading?: 'lazy' | 'eager';
  /** Hover text (an item's name next to an icon that has no visible label). */
  title?: string;
}

/**
 * Third-party game art (card, badge, arena, clan badge) with a fallback chain.
 * The CDNs can 404 for new content or be blocked; the box keeps its size
 * either way, so nothing shifts when an image fails.
 */
export function GameImage({ sources, alt, width, height, fallback, className, loading = 'lazy', title }: GameImageProps) {
  const [failed, setFailed] = useState<readonly string[]>([]);
  const src = sources.find((s): s is string => Boolean(s) && !failed.includes(s as string));

  if (!src) {
    return (
      <span
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        data-testid="game-image-fallback"
        title={title}
        style={{ aspectRatio: `${width} / ${height}` }}
        className={cx('inline-flex items-center justify-center rounded-lg bg-surface-2 text-fg-subtle [&_svg]:size-6', className)}
      >
        {fallback}
      </span>
    );
  }

  return (
    <img
      key={src}
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      title={title}
      onError={() => setFailed((list) => [...list, src])}
      className={className}
    />
  );
}
