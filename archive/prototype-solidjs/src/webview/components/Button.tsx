// ============================================================================
// SIREEN — Button Component (VS Code Native)
// ============================================================================
// Uses ONLY VS Code theme tokens. Matches native button behavior exactly.
// ============================================================================

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: any;
  class?: string;
  style?: Record<string, string | number | undefined>;
  title?: string;
  onClick?: (e: MouseEvent) => void;
  children?: any;
  'aria-label'?: string;
  'data-testid'?: string;
}

export function Button(props: ButtonProps) {
  const variant = props.variant || 'secondary';
  const size = props.size || 'md';
  const disabled = props.disabled || props.loading;

  // Base styles matching VS Code button spec
  const baseStyle: Record<string, string> = {
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    gap: '4px',
    'font-family': 'var(--vscode-font-family)',
    'font-size': 'var(--vscode-font-size)',
    'font-weight': '500',
    'line-height': 'var(--vscode-line-height)',
    border: '1px solid transparent',
    'border-radius': '3px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? '0.5' : '1',
    transition: 'background-color 80ms ease, border-color 80ms ease, color 80ms ease',
    'white-space': 'nowrap',
    'user-select': 'none',
    outline: 'none',
    '-webkit-font-smoothing': 'antialiased',
  };

  // Size variants
  const sizeStyles: Record<ButtonSize, Record<string, string>> = {
    sm: {
      height: '22px',
      padding: '0 8px',
      'font-size': '11px',
    },
    md: {
      height: '28px',
      padding: '0 12px',
      'font-size': 'var(--vscode-font-size)',
    },
    lg: {
      height: '32px',
      padding: '0 16px',
      'font-size': 'var(--vscode-font-size)',
    },
  };

  // Variant styles using VS Code theme tokens
  const variantStyles: Record<ButtonVariant, Record<string, string>> = {
    primary: {
      background: 'var(--vscode-button-background)',
      color: 'var(--vscode-button-foreground)',
      'border-color': 'transparent',
    },
    secondary: {
      background: 'var(--vscode-button-secondaryBackground)',
      color: 'var(--vscode-button-secondaryForeground)',
      'border-color': 'var(--vscode-button-border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--vscode-button-secondaryForeground)',
      'border-color': 'transparent',
    },
    danger: {
      background: 'var(--vscode-inputValidation-errorBackground)',
      color: 'var(--vscode-inputValidation-errorForeground)',
      'border-color': 'transparent',
    },
  };

  // Hover states (handled via CSS :hover for performance, but we set base here)
  const combinedStyle = {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...(props.style || {}),
  };

  const handleClick = (e: MouseEvent) => {
    if (!disabled) props.onClick?.(e);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleClick(e as any);
    }
  };

  return (
    <button
      style={combinedStyle}
      class={props.class || ''}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title={props.title}
      aria-label={props['aria-label']}
      data-testid={props['data-testid']}
      tabIndex={disabled ? -1 : 0}
    >
      {props.loading ? (
        <span
          style={{
            width: '12px',
            height: '12px',
            border: '2px solid currentColor',
            'border-top-color': 'transparent',
            'border-radius': '50%',
            animation: 'spin 600ms linear infinite',
            display: 'inline-block',
          }}
          aria-hidden="true"
        />
      ) : props.icon ? (
        <span style={{ display: 'flex', 'align-items': 'center' }} aria-hidden="true">
          {props.icon}
        </span>
      ) : null}
      {props.children}
    </button>
  );
}