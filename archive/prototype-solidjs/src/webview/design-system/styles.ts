// ============================================================================
// SIREEN — VS Code Native Style Helpers
// ============================================================================
// Injects design tokens CSS into the webview.
// ============================================================================

// Import the CSS as text (esbuild loader: { '.css': 'text' })
import tokensCss from './tokens.css';

let stylesInjected = false;

export function injectGlobalStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  
  const style = document.createElement('style');
  style.id = 'sireen-design-tokens';
  style.textContent = tokensCss;
  document.head.appendChild(style);
  stylesInjected = true;
}

export function createStyles(styles: Record<string, string | number>) {
  const obj: Record<string, string> = {};
  for (const [key, value] of Object.entries(styles)) {
    obj[key] = String(value);
  }
  return obj;
}