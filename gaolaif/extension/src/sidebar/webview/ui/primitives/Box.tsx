import type { CSSProperties, HTMLAttributes, ReactNode, ElementType } from 'react';

/**
 * Box — the most primitive layout component.
 *
 * A polymorphic `div` that accepts a `style` prop for ad-hoc overrides.
 * All SIREEN components should be built on top of Box (or Flex/Stack/Grid).
 */

export interface BoxProps extends HTMLAttributes<HTMLDivElement> {
  /** Render as a different element (e.g. 'section', 'article'). */
  as?: ElementType;
  /** Children content. */
  children?: ReactNode;
  /** Inline style overrides (use sparingly — prefer classes). */
  style?: CSSProperties;
  /** Custom className. */
  className?: string;
}

export function Box({ as: Tag = 'div', children, style, className, ...rest }: BoxProps) {
  const Component = Tag;
  return (
    <Component className={className} style={style} {...rest}>
      {children}
    </Component>
  );
}
