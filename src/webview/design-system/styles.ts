// ============================================================================
// SIREEN — VS Code Native Style Helpers
// ============================================================================
// Minimal utilities. No custom CSS injection needed — tokens.css is loaded by esbuild.
// ============================================================================

export function injectGlobalStyles() {
  // No-op: tokens.css is bundled by esbuild and injected at build time.
  // Kept for API compatibility with existing screens.
}

export function createStyles(styles: Record<string, string | number>) {
  const obj: Record<string, string> = {};
  for (const [key, value] of Object.entries(styles)) {
    obj[key] = String(value);
  }
  return obj;
}