import type { CSSProperties, HTMLAttributes, ReactNode, ElementType } from 'react';

/**
 * Text — the primitive for all text content. Enforces the SIREEN
 * type scale and font families. Never hardcode font sizes/weights.
 */

export type TextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body-lg'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'overline'
  | 'code'
  | 'code-sm';

export type TextWeight = 'regular' | 'medium' | 'semibold';
export type FontFamily = 'ui' | 'mono';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type TextColor =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'on-accent'
  | 'link'
  | 'error'
  | 'warning'
  | 'success'
  | 'info';

const VARIANT_SIZE: Record<TextVariant, string> = {
  h1: 'var(--sireen-font-size-h1)',
  h2: 'var(--sireen-font-size-h2)',
  h3: 'var(--sireen-font-size-h3)',
  h4: 'var(--sireen-font-size-h4)',
  'body-lg': 'var(--sireen-font-size-body-lg)',
  body: 'var(--sireen-font-size-body)',
  'body-sm': 'var(--sireen-font-size-body-sm)',
  caption: 'var(--sireen-font-size-caption)',
  overline: 'var(--sireen-font-size-overline)',
  code: 'var(--sireen-font-size-code)',
  'code-sm': 'var(--sireen-font-size-code-sm)',
};

const VARIANT_LINE_HEIGHT: Record<TextVariant, string> = {
  h1: 'var(--sireen-line-height-ui)',
  h2: 'var(--sireen-line-height-ui)',
  h3: 'var(--sireen-line-height-ui)',
  h4: 'var(--sireen-line-height-ui)',
  'body-lg': 'var(--sireen-line-height-body)',
  body: 'var(--sireen-line-height-body)',
  'body-sm': 'var(--sireen-line-height-body)',
  caption: 'var(--sireen-line-height-body)',
  overline: 'var(--sireen-line-height-ui)',
  code: 'var(--sireen-line-height-code)',
  'code-sm': 'var(--sireen-line-height-code)',
};

const WEIGHT_MAP: Record<TextWeight, string> = {
  regular: 'var(--sireen-font-weight-regular)',
  medium: 'var(--sireen-font-weight-medium)',
  semibold: 'var(--sireen-font-weight-semibold)',
};

const COLOR_MAP: Record<TextColor, string> = {
  primary: 'var(--sireen-fg-primary)',
  secondary: 'var(--sireen-fg-secondary)',
  muted: 'var(--sireen-fg-muted)',
  'on-accent': 'var(--sireen-fg-on-accent)',
  link: 'var(--sireen-link-fg)',
  error: 'var(--sireen-error-fg)',
  warning: 'var(--sireen-warning-fg)',
  success: 'var(--sireen-success-fg)',
  info: 'var(--sireen-info-fg)',
};

export interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  weight?: TextWeight;
  family?: FontFamily;
  color?: TextColor;
  align?: TextAlign;
  truncate?: boolean;
  /** render as a different element (e.g. 'label', 'span') */
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Text({
  variant = 'body',
  weight = 'regular',
  family = 'ui',
  color = 'primary',
  align,
  truncate = false,
  as: Tag = 'span',
  children,
  className,
  style,
  ...rest
}: TextProps) {
  const computed: CSSProperties = {
    fontFamily: family === 'mono' ? 'var(--sireen-font-mono)' : 'var(--sireen-font-ui)',
    fontSize: VARIANT_SIZE[variant],
    fontWeight: WEIGHT_MAP[weight],
    lineHeight: VARIANT_LINE_HEIGHT[variant],
    color: COLOR_MAP[color],
    textAlign: align,
    ...(truncate
      ? {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }
      : {}),
    ...style,
  };

  const Component = Tag;
  return (
    <Component className={className} style={computed} {...rest}>
      {children}
    </Component>
  );
}
