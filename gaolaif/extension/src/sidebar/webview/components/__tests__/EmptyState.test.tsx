import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders with default inbox icon', () => {
    const { container } = render(<EmptyState />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders title when provided', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders message when provided', () => {
    render(<EmptyState message="Try adding a new item to get started." />);
    expect(screen.getByText('Try adding a new item to get started.')).toBeInTheDocument();
  });

  it('renders action button when action prop is provided', () => {
    const mockAction = { label: 'Add Item', onClick: jest.fn() };
    render(<EmptyState action={mockAction} />);
    const button = screen.getByText('Add Item');
    expect(button).toBeInTheDocument();
    button.click();
    expect(mockAction.onClick).toHaveBeenCalledTimes(1);
  });

  it('renders custom icon name', () => {
    const { container } = render(<EmptyState icon="search" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders title and message together', () => {
    render(<EmptyState title="No results" message="No results match your search criteria." />);
    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByText('No results match your search criteria.')).toBeInTheDocument();
  });
});
