import { useMediaQuery } from './useMediaQuery';

/**
 * useReducedMotion — respects the user's OS-level reduced-motion setting.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
