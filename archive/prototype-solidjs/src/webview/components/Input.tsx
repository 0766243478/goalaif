// ============================================================================
// SIREEN — Input Component (VS Code Native)
// ============================================================================
// Matches VS Code input spec exactly. No custom styling.
// ============================================================================

interface InputProps {
  value?: string;
  placeholder?: string;
  type?: 'text' | 'search' | 'url' | 'number';
  disabled?: boolean;
  readonly?: boolean;
  icon?: any;
  clearable?: boolean;
  class?: string;
  style?: Record<string, string | number>;
  onInput?: (value: string) => void;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  'aria-label'?: string;
}

export function Input(props: InputProps) {
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    props.onInput?.(target.value);
  };

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    props.onChange?.(target.value);
  };

  const handleClear = () => {
    props.onInput?.('');
    props.onChange?.('');
  };

  const wrapperStyle: Record<string, string> = {
    position: 'relative',
    display: 'flex',
    'align-items': 'center',
    width: '100%',
    ...(props.style || {}),
  };

  const inputStyle: Record<string, string> = {
    width: '100%',
    height: '28px',
    padding: props.icon ? '0 28px 0 30px' : '0 8px',
    'font-family': 'var(--vscode-font-family)',
    'font-size': 'var(--vscode-font-size)',
    'line-height': 'var(--vscode-line-height)',
    background: 'var(--vscode-input-background)',
    border: '1px solid var(--vscode-input-border)',
    'border-radius': '2px',
    color: 'var(--vscode-input-foreground)',
    outline: 'none',
    transition: 'border-color 80ms ease, box-shadow 80ms ease',
    'box-sizing': 'border-box',
  };

  return (
    <div style={wrapperStyle}>
      {props.icon && (
        <span
          style={{
            position: 'absolute',
            left: '8px',
            color: 'var(--vscode-input-placeholderForeground)',
            display: 'flex',
            'pointer-events': 'none',
          }}
          aria-hidden="true"
        >
          {props.icon}
        </span>
      )}
      <input
        type={props.type || 'text'}
        value={props.value || ''}
        placeholder={props.placeholder}
        disabled={props.disabled}
        readOnly={props.readonly}
        aria-label={props['aria-label'] || props.placeholder}
        onInput={handleInput}
        onChange={handleChange}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        onKeyDown={props.onKeyDown}
        style={inputStyle}
        class={props.class || ''}
      />
      {props.clearable && props.value && (
        <button
          onClick={handleClear}
          style={{
            position: 'absolute',
            right: '6px',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            width: '16px',
            height: '16px',
            'border-radius': '2px',
            background: 'var(--vscode-button-secondaryBackground)',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--vscode-button-secondaryForeground)',
            'font-size': '12px',
            padding: '0',
            'line-height': '1',
          }}
          aria-label="Clear input"
        >
          ×
        </button>
      )}
    </div>
  );
}