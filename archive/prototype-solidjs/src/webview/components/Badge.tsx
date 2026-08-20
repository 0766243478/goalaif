// ============================================================================
// SIREEN — Badge Component (VS Code Native)
// ============================================================================
// Uses VS Code badge tokens. Minimal, no rounded pills unless needed.
// ============================================================================

type BadgeSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
type BadgeVariant = BadgeSeverity | 'default' | 'success' | 'warning' | 'danger' | 'info' | 'none';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  class?: string;
  style?: Record<string, string | number | undefined>;
  children?: any;
}

const variantStyles: Record<BadgeVariant, Record<string, string>> = {
  critical: {
    background: 'var(--vscode-testing-iconFailed)',
    color: 'var(--vscode-editor-background)',
  },
  high: {
    background: 'var(--vscode-testing-iconErrored)',
    color: 'var(--vscode-editor-background)',
  },
  medium: {
    background: 'var(--vscode-testing-iconQueued)',
    color: 'var(--vscode-editor-background)',
  },
  low: {
    background: 'var(--vscode-testing-iconPassed)',
    color: 'var(--vscode-editor-background)',
  },
  info: {
    background: 'var(--vscode-badge-background)',
    color: 'var(--vscode-badge-foreground)',
  },
  none: {
    background: 'var(--vscode-badge-background)',
    color: 'var(--vscode-badge-foreground)',
  },
  default: {
    background: 'var(--vscode-badge-background)',
    color: 'var(--vscode-badge-foreground)',
  },
  success: {
    background: 'var(--vscode-testing-iconPassed)',
    color: 'var(--vscode-editor-background)',
  },
  warning: {
    background: 'var(--vscode-testing-iconQueued)',
    color: 'var(--vscode-editor-background)',
  },
  danger: {
    background: 'var(--vscode-testing-iconFailed)',
    color: 'var(--vscode-editor-background)',
  },
};

export function Badge(props: BadgeProps) {
  const variant = props.variant || 'default';
  const size = props.size || 'md';
  const styles = variantStyles[variant];

  const baseStyle: Record<string, string> = {
    display: 'inline-flex',
    'align-items': 'center',
    gap: size === 'sm' ? '3px' : '4px',
    padding: size === 'sm' ? '1px 5px' : '2px 6px',
    'font-family': 'var(--vscode-font-family)',
    'font-size': size === 'sm' ? '10px' : 'var(--vscode-font-size)',
    'line-height': size === 'sm' ? '1.2' : 'var(--vscode-line-height)',
    'font-weight': '500',
    'border-radius': '2px',
    'white-space': 'nowrap',
    'user-select': 'none',
    '-webkit-font-smoothing': 'antialiased',
    ...styles,
    ...(props.style || {}),
  };

  return (
    <span style={baseStyle} class={props.class || ''} role="status">
      {props.dot && (
        <span
          style={{
            width: '4px',
            height: '4px',
            'border-radius': '50%',
            background: 'currentColor',
            'flex-shrink': '0',
          }}
          aria-hidden="true"
        />
      )}
      {props.children}
    </span>
  );
}