import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { Icon } from '../Icon';

describe('Icon', () => {
  it('renders an SVG element for a valid icon name', () => {
    const { container } = render(<Icon name="search" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders with default size 16', () => {
    const { container } = render(<Icon name="search" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('renders with custom size', () => {
    const { container } = render(<Icon name="search" size={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('renders with custom color applied to stroke', () => {
    const { container } = render(<Icon name="search" color="#ff0000" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke', '#ff0000');
  });

  it('has aria-hidden by default', () => {
    const { container } = render(<Icon name="search" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('returns null for unknown icon name', () => {
    const { container } = render(<Icon name={'nonexistent' as any} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders with custom strokeWidth', () => {
    const { container } = render(<Icon name="search" strokeWidth={1.5} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke-width', '1.5');
  });

  it('renders all navigation icon names without error', () => {
    const navIcons = [
      'overview', 'findings', 'exploits',
      'memory', 'notes', 'tasks', 'simulation', 'settings', 'brand',
    ] as const;
    navIcons.forEach((name) => {
      const { container } = render(<Icon name={name} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('renders all status icon names without error', () => {
    const statusIcons = ['connected', 'disconnected', 'search', 'inbox', 'check', 'x', 'copy', 'copied'] as const;
    statusIcons.forEach((name) => {
      const { container } = render(<Icon name={name} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });
});
