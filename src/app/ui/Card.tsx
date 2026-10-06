import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  as?: 'div' | 'section' | 'article';
  /** Heading shown in the card's top row; rendered as an h3. */
  title?: ReactNode;
  /** Right side of the top row (a link or small button). */
  action?: ReactNode;
  /** 'none' when the content brings its own padding (lists, charts). */
  padding?: 'md' | 'none';
}

/** The one surface: hairline border, 12px radius, a single elevation. */
export function Card({ as: Tag = 'div', title, action, padding = 'md', className, children, ...rest }: CardProps) {
  return (
    <Tag
      className={cx('rounded-card border border-line bg-surface-1 shadow-card', padding === 'md' && 'p-4 sm:p-5', className)}
      {...rest}
    >
      {(title || action) && (
        <div className={cx('flex items-center justify-between gap-3', padding === 'md' ? 'mb-3' : 'px-4 pt-4 pb-3 sm:px-5')}>
          {title && <h3 className="text-sm font-semibold text-fg">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </Tag>
  );
}
