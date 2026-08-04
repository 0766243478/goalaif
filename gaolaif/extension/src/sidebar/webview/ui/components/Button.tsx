import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from '../primitives/Icon';
import type { IconName } from '../primitives/Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** icon rendered before the label */
  iconLeft?: IconName;
  /** icon rendered after the label */
  iconRight?: IconName;
  /** icon-only button (no label); aria-label becomes required */
  iconOnly?: IconName;
  /** loading state — shows spinner, disables interaction */
  loading?: boolean;
  /** full-width button */
  block?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    iconLeft,
    iconRight,
    iconOnly,
    loading = false,
    block = false,
    disabled,
    className,
    children,
    ...rest
  },
  ref,
) {
  const classes = [
    'sireen-btn',
    `sireen-btn--${variant}`,
    `sireen-btn--${size}`,
    iconOnly ? 'sireen-btn--icon' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      style={block ? { width: '100%' } : undefined}
      {...rest}
    >
      {loading && <span className="sireen-btn__spinner" aria-hidden="true" />}
      {!loading && iconOnly && <Icon name={iconOnly} size={size === 'sm' ? 'sm' : 'md'} />}
      {!loading && !iconOnly && iconLeft && <Icon name={iconLeft} size={size === 'sm' ? 'sm' : 'md'} />}
      {!iconOnly && children}
      {!loading && !iconOnly && iconRight && <Icon name={iconRight} size={size === 'sm' ? 'sm' : 'md'} />}
    </button>
  );
});
