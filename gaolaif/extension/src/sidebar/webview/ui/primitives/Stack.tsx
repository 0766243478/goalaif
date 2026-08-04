import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

/**
 * Stack — a vertical Flex with a default gap. The workhorse for
 * stacking content vertically (the most common layout in SIREEN).
 */

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** gap between children (spacing units) */
  gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
  /** horizontal alignment (align-items) */
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  /** justify-content */
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
}

export function Stack({
  children,
  className,
  style,
  gap = 2,
  align = 'stretch',
  justify,
  ...rest
}: StackProps) {
  const computed: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: align,
    justifyContent: justify,
    gap: `var(--sireen-space-${gap})`,
    ...style,
  };

  return (
    <div className={className} style={computed} {...rest}>
      {children}
    </div>
  );
}
