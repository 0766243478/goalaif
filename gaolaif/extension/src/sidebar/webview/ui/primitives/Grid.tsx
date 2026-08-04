import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

/**
 * Grid — a Box with `display: grid` and ergonomic props.
 */

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** grid-template-columns */
  columns?: number | string;
  /** grid-template-rows */
  rows?: number | string;
  /** column gap (spacing units) */
  gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
  /** row gap (spacing units), defaults to gap */
  rowGap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
  /** align-items */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** justify-items */
  justify?: 'start' | 'center' | 'end' | 'stretch';
  /** auto-flow */
  flow?: 'row' | 'column' | 'dense' | 'row dense' | 'column dense';
}

export function Grid({
  children,
  className,
  style,
  columns,
  rows,
  gap,
  rowGap,
  align,
  justify,
  flow,
  ...rest
}: GridProps) {
  const computed: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: typeof columns === 'number' ? `repeat(${columns}, 1fr)` : columns,
    gridTemplateRows: typeof rows === 'number' ? `repeat(${rows}, 1fr)` : rows,
    columnGap: gap != null ? `var(--sireen-space-${gap})` : undefined,
    rowGap: (rowGap ?? gap) != null ? `var(--sireen-space-${rowGap ?? gap})` : undefined,
    alignItems: align,
    justifyItems: justify,
    gridAutoFlow: flow,
    ...style,
  };

  return (
    <div className={className} style={computed} {...rest}>
      {children}
    </div>
  );
}
