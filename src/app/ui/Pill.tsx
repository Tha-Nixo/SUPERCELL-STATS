import type { ReactNode } from 'react';
import { cx } from './cx';

export type PillTone = 'neutral' | 'accent' | 'solid' | 'win' | 'loss' | 'draw';

const TONES: Record<PillTone, string> = {
  neutral: 'bg-surface-2 text-fg-muted',
  // accent text on its tint is AA on surface-1 only (4.56:1); on surface-2 use 'solid'.
  accent: 'bg-accent-soft text-accent',
  solid: 'bg-accent text-accent-contrast',
  win: 'bg-win-soft text-win',
  loss: 'bg-loss-soft text-loss',
  draw: 'bg-draw-soft text-draw',
};

interface PillProps {
  tone?: PillTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Small non-interactive label: league, level, live/demo, result. */
export function Pill({ tone = 'neutral', icon, children, className }: PillProps) {
  return (
    <span className={cx('inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-pill px-3 text-xs font-medium', TONES[tone], className)}>
      {icon && <span aria-hidden="true" className="[&_svg]:size-3.5">{icon}</span>}
      {children}
    </span>
  );
}
