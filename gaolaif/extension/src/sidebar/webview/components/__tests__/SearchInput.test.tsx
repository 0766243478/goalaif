import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchInput } from '../SearchInput';

describe('SearchInput', () => {
  it('renders with default placeholder', () => {
    render(<SearchInput onSearch={jest.fn()} />);
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(<SearchInput placeholder="Filter items..." onSearch={jest.fn()} />);
    expect(screen.getByPlaceholderText('Filter items...')).toBeInTheDocument();
  });

  it('renders search icon', () => {
    const { container } = render(<SearchInput onSearch={jest.fn()} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('calls onSearch when input value changes', () => {
    const onSearch = jest.fn();
    render(<SearchInput onSearch={onSearch} />);
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test query' } });
    expect(onSearch).toHaveBeenCalledWith('test query');
  });

  it('passes the correct value to onSearch', () => {
    const onSearch = jest.fn();
    render(<SearchInput onSearch={onSearch} />);
    const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'finding' } });
    expect(input.value).toBe('finding');
  });

  it('renders input with correct CSS class', () => {
    render(<SearchInput onSearch={jest.fn()} />);
    const input = screen.getByPlaceholderText('Search...');
    expect(input).toHaveClass('input');
  });
});
