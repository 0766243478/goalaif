import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Icon } from '../primitives/Icon';
import type { IconName } from '../primitives/Icon';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  inputSize?: InputSize;
  iconLeft?: IconName;
  iconRight?: IconName;
  invalid?: boolean;
  /** content rendered after the input (e.g. clear button) */
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    inputSize = 'md',
    iconLeft,
    iconRight,
    invalid = false,
    disabled = false,
    trailing,
    className,
    ...rest
  },
  ref,
) {
  const classes = [
    'sireen-input',
    `sireen-input--${inputSize}`,
    invalid ? 'sireen-input--invalid' : '',
    disabled ? 'sireen-input--disabled' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} aria-disabled={disabled || undefined}>
      {iconLeft && <Icon name={iconLeft} size={inputSize === 'sm' ? 'sm' : 'md'} color="var(--sireen-fg-muted)" />}
      <input ref={ref} className="sireen-input__field" disabled={disabled} {...rest} />
      {trailing}
      {iconRight && <Icon name={iconRight} size={inputSize === 'sm' ? 'sm' : 'md'} color="var(--sireen-fg-muted)" />}
    </div>
  );
});
