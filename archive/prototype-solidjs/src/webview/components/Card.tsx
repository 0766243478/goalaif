// ============================================================================
// SIREEN — Panel Component (VS Code Native)
// ============================================================================
// Replaces "Card" with VS Code panel styling. No shadows, no rounded cards.
// Use for: section containers, form groups, content panels.
// ============================================================================

type PanelVariant = 'default' | 'inset' | 'bordered';
type PanelPadding = 'none' | 'sm' | 'md' | 'lg';

interface PanelProps {
  variant?: PanelVariant;
  padding?: PanelPadding;
  class?: string;
  style?: Record<string, string | number | undefined>;
  onClick?: (e: MouseEvent) => void;
  children?: any;
}

const paddingValues: Record<PanelPadding, string> = {
  none: '0',
  sm: '6px',
  md: '8px',
  lg: '12px',
};

export function Panel(props: PanelProps) {
  const variant = props.variant || 'default';
  const pad = props.padding || 'md';

  const baseStyle: Record<string, string> = {
    'font-family': 'var(--vscode-font-family)',
    'font-size': 'var(--vscode-font-size)',
    'line-height': 'var(--vscode-line-height)',
    color: 'var(--vscode-editor-foreground)',
    background: 'var(--vscode-editor-background)',
    padding: paddingValues[pad],
    ...(props.style || {}),
  };

  const variantStyles: Record<PanelVariant, Record<string, string>> = {
    default: {
      border: 'none',
    },
    inset: {
      background: 'var(--vscode-textBlockQuote-background)',
      border: 'none',
    },
    bordered: {
      border: '1px solid var(--vscode-panel-border)',
      background: 'var(--vscode-panel-background)',
    },
  };

  const combinedStyle = {
    ...baseStyle,
    ...variantStyles[variant],
  };

  const handleClick = (e: MouseEvent) => {
    props.onClick?.(e);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      props.onClick(e as any);
    }
  };

  const isInteractive = !!props.onClick;

  return (
    <div
      style={combinedStyle}
      class={props.class || ''}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isInteractive ? 0 : undefined}
      role={isInteractive ? 'button' : undefined}
    >
      {props.children}
    </div>
  );
}

// Alias for backward compatibility
export const Card = Panel;