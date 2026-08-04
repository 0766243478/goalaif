import { Icon as LegacyIcon } from '../../components/Icon';
import type { IconName } from '../../components/Icon';

/**
 * Icon — design-system wrapper around the lucide-react icon registry.
 *
 * Uses token-based sizes (sm/md/lg) instead of magic pixel numbers.
 * Color defaults to `currentColor` so it inherits text color.
 */

export type IconSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<IconSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
};

export interface IconProps {
  name: IconName;
  size?: IconSize | number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
  /** visually hidden for screen readers (default true for decorative icons) */
  decorative?: boolean;
  /** accessible label; when provided, icon is announced */
  label?: string;
}

export function Icon({
  name,
  size = 'md',
  color = 'currentColor',
  strokeWidth = 2,
  className,
  style,
  decorative = true,
  label,
}: IconProps) {
  const px = typeof size === 'number' ? size : SIZE_MAP[size];
  return (
    <LegacyIcon
      name={name}
      size={px}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
      style={style}
      aria-hidden={label ? undefined : decorative}
      {...(label ? { role: 'img', 'aria-label': label } : {})}
    />
  );
}

export type { IconName } from '../../components/Icon';
