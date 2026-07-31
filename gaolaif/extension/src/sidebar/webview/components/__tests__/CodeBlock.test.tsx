import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { CodeBlock } from '../CodeBlock';

const mockCode = 'pragma solidity ^0.8.0;\ncontract Test {}';

describe('CodeBlock', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders the code content', () => {
    render(<CodeBlock code={mockCode} />);
    const codeEl = screen.getByText((content) => content.includes('pragma solidity'));
    expect(codeEl).toBeInTheDocument();
  });

  it('renders with default language solidity', () => {
    render(<CodeBlock code={mockCode} />);
    expect(screen.getByText('solidity')).toBeInTheDocument();
  });

  it('renders with custom language', () => {
    render(<CodeBlock code={mockCode} language="move" />);
    expect(screen.getByText('move')).toBeInTheDocument();
  });

  it('renders copy button', () => {
    render(<CodeBlock code={mockCode} />);
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('shows copy icon SVG', () => {
    const { container } = render(<CodeBlock code={mockCode} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('applies custom maxHeight', () => {
    const { container } = render(<CodeBlock code={mockCode} maxHeight={300} />);
    const pre = container.querySelector('pre');
    expect(pre).toHaveStyle({ maxHeight: '300px' });
  });
});
