import { useRef, useState, useEffect } from 'react';
import { Input } from './Input';
import { Icon } from '../primitives/Icon';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** debounce in ms */
  debounce?: number;
  inputSize?: 'sm' | 'md' | 'lg';
  className?: string;
  autoFocus?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  debounce = 200,
  inputSize = 'md',
  className,
  autoFocus = false,
}: SearchInputProps) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local in sync when the external value changes (e.g. cleared by parent)
  // This is a legitimate controlled-component sync pattern.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal(value);
  }, [value]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocal(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), debounce);
  };

  const handleClear = () => {
    setLocal('');
    onChange('');
  };

  return (
    <Input
      inputSize={inputSize}
      iconLeft="search"
      type="search"
      value={local}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      autoFocus={autoFocus}
      aria-label={placeholder}
      trailing={
        local ? (
          <button
            onClick={handleClear}
            aria-label="Clear search"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--sireen-fg-muted)',
              cursor: 'pointer',
              display: 'inline-flex',
              padding: 'var(--sireen-space-1)',
            }}
          >
            <Icon name="x" size="sm" />
          </button>
        ) : null
      }
    />
  );
}
