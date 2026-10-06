import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

/**
 * Classes for anything that looks like a button (also used on <Link>/<a>).
 * 44px minimum height, 12px radius, press feedback, no colour below AA.
 */
export function buttonClasses(variant: ButtonVariant = 'secondary', className?: string): string {
  return cx(
    'inline-flex min-h-11 select-none items-center justify-center gap-2 whitespace-nowrap rounded-card px-4 text-sm font-semibold',
    'transition duration-150 ease-out-quick active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
    variant === 'primary' && 'bg-accent text-accent-contrast hover:opacity-90',
    variant === 'secondary' && 'border border-line bg-surface-2 text-fg hover:border-line-strong',
    variant === 'ghost' && 'text-fg-muted hover:bg-surface-2 hover:text-fg',
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'secondary', className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...rest} />;
}
