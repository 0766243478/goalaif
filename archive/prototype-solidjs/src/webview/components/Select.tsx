// ============================================================================
// SIREEN — Select Component (VS Code Native)
// ============================================================================
// Matches VS Code dropdown/select spec exactly.
// ============================================================================

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value?: string;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  class?: string;
  onChange?: (value: string) => void;
  'aria-label'?: string;
}

export function Select(props: SelectProps) {
  const handleChange = (e: Event) => {
    const target = e.target as HTMLSelectElement;
    props.onChange?.(target.value);
  };

  const wrapperStyle: Record<string, string> = {
    position: 'relative',
    display: 'flex',
    width: '100%',
  };

  const selectStyle: Record<string, string> = {
    width: '100%',
    height: '28px',
    padding: '0 24px 0 8px',
    'font-family': 'var(--vscode-font-family)',
    'font-size': 'var(--vscode-font-size)',
    'line-height': 'var(--vscode-line-height)',
    background: 'var(--vscode-dropdown-background)',
    border: '1px solid var(--vscode-dropdown-border)',
    'border-radius': '2px',
    color: 'var(--vscode-dropdown-foreground)',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    '-webkit-appearance': 'none',
    '-moz-appearance': 'none',
    'background-image': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath fill='%23888' d='M4 6l4 4 4-4H4z'/%3E%3C/svg%3E\")",
    'background-repeat': 'no-repeat',
    'background-position': 'right 6px center',
    'background-size': '12px',
    'box-sizing': 'border-box',
    transition: 'border-color 80ms ease',
  };

  return (
    <div style={wrapperStyle} class={props.class || ''}>
      <select
        value={props.value || ''}
        disabled={props.disabled}
        onChange={handleChange}
        aria-label={props['aria-label'] || props.placeholder}
        style={selectStyle}
      >
        {props.placeholder && (
          <option value="" disabled>
            {props.placeholder}
          </option>
        )}
        {props.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}