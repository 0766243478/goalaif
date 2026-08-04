import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

/**
 * Flex — a Box with `display: flex` and ergonomic props for the most
 * common flexbox patterns. Avoids the need for utility-class soup.
 */

export interface FlexProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** flex-direction */
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  /** align-items */
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  /** justify-content */
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  /** flex-wrap */
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  /** gap (in spacing units, e.g. 2 = 8px) */
  gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
  /** flex: 1 shorthand */
  flex?: number | string;
  /** flex-grow */
  grow?: number;
  /** flex-shrink */
  shrink?: number;
  /** flex-basis */
  basis?: string | number;
  /** inline-flex */
  inline?: boolean;
}

export function Flex({
  children,
  className,
  style,
  direction = 'row',
  align,
  justify,
  wrap,
  gap,
  flex,
  grow,
  shrink,
  basis,
  inline = false,
  ...rest
}: FlexProps) {
  const computed: CSSProperties = {
    display: inline ? 'inline-flex' : 'flex',
    flexDirection: direction,
    alignItems: align,
    justifyContent: justify,
    flexWrap: wrap,
    gap: gap != null ? `var(--sireen-space-${gap})` : undefined,
    flex: flex,
    flexGrow: grow,
    flexShrink: shrink,
    flexBasis: typeof basis === 'number' ? `${basis}px` : basis,
    ...style,
  };

  return (
    <div className={className} style={computed} {...rest}>
      {children}
    </div>
  );
}
