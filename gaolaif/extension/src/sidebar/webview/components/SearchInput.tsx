import { useState, useCallback } from 'react';
import { Icon } from './Icon';

interface Props {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
}

export function SearchInput({ placeholder = 'Search...', onSearch }: Props) {
  const [value, setValue] = useState('');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    onSearch(v);
  }, [onSearch]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input"
        style={{
          paddingLeft: 28,
          fontSize: 'var(--text-xs)',
          height: 32,
        }}
      />
      <span style={{
        position: 'absolute',
        left: 8,
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--sireen-text-ghost)',
        pointerEvents: 'none',
        display: 'flex',
      }}>
        <Icon name="search" size={14} />
      </span>
    </div>
  );
}
