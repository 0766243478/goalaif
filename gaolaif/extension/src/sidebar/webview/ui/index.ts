/**
 * SIREEN Design System — Public API
 *
 * Import from `ui` to access all design-system primitives, components,
 * layouts, hooks, and tokens.
 *
 *   import { Button, Card, useToast } from './ui';
 */

// Foundation
import './foundation/tokens.css';
import './components/components.css';

// Primitives
export * from './primitives';

// Components
export * from './components';

// Layouts
export * from './layouts';

// Hooks
export * from './hooks';

// Tokens (for JS-in-CSS scenarios)
export { tokens } from './foundation/tokens';
