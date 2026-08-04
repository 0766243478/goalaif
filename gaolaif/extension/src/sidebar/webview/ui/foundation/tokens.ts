/**
 * SIREEN Design System — TypeScript Token Exports
 *
 * Mirrors the CSS custom properties in tokens.css for use in JS-in-CSS
 * scenarios (inline styles, animations via JS, styled-components, etc.).
 *
 * IMPORTANT: Prefer CSS classes + custom properties over these values.
 * Only use these when a CSS variable cannot be referenced directly
 * (e.g. dynamic animations, canvas rendering, third-party theming).
 */

export const tokens = {
  space: {
    0: 'var(--sireen-space-0)',
    1: 'var(--sireen-space-1)',
    2: 'var(--sireen-space-2)',
    3: 'var(--sireen-space-3)',
    4: 'var(--sireen-space-4)',
    5: 'var(--sireen-space-5)',
    6: 'var(--sireen-space-6)',
    8: 'var(--sireen-space-8)',
    10: 'var(--sireen-space-10)',
    12: 'var(--sireen-space-12)',
  } as const,

  radius: {
    sm: 'var(--sireen-radius-sm)',
    md: 'var(--sireen-radius-md)',
    lg: 'var(--sireen-radius-lg)',
    full: 'var(--sireen-radius-full)',
  } as const,

  duration: {
    fast: 'var(--sireen-duration-fast)',
    normal: 'var(--sireen-duration-normal)',
    slow: 'var(--sireen-duration-slow)',
    spin: 'var(--sireen-duration-spin)',
  } as const,

  ease: 'var(--sireen-ease)',

  zIndex: {
    base: 'var(--sireen-z-base)',
    sticky: 'var(--sireen-z-sticky)',
    dropdown: 'var(--sireen-z-dropdown)',
    drawer: 'var(--sireen-z-drawer)',
    modal: 'var(--sireen-z-modal)',
    toast: 'var(--sireen-z-toast)',
    tooltip: 'var(--sireen-z-tooltip)',
  } as const,

  controlHeight: {
    sm: 'var(--sireen-control-height-sm)',
    md: 'var(--sireen-control-height-md)',
    lg: 'var(--sireen-control-height-lg)',
  } as const,

  iconSize: {
    sm: 'var(--sireen-icon-size-sm)',
    md: 'var(--sireen-icon-size-md)',
    lg: 'var(--sireen-icon-size-lg)',
  } as const,

  font: {
    ui: 'var(--sireen-font-ui)',
    mono: 'var(--sireen-font-mono)',
  } as const,

  fontSize: {
    h1: 'var(--sireen-font-size-h1)',
    h2: 'var(--sireen-font-size-h2)',
    h3: 'var(--sireen-font-size-h3)',
    h4: 'var(--sireen-font-size-h4)',
    bodyLg: 'var(--sireen-font-size-body-lg)',
    body: 'var(--sireen-font-size-body)',
    bodySm: 'var(--sireen-font-size-body-sm)',
    code: 'var(--sireen-font-size-code)',
    codeSm: 'var(--sireen-font-size-code-sm)',
    caption: 'var(--sireen-font-size-caption)',
    overline: 'var(--sireen-font-size-overline)',
  } as const,

  fontWeight: {
    regular: 'var(--sireen-font-weight-regular)',
    medium: 'var(--sireen-font-weight-medium)',
    semibold: 'var(--sireen-font-weight-semibold)',
  } as const,

  lineHeight: {
    ui: 'var(--sireen-line-height-ui)',
    body: 'var(--sireen-line-height-body)',
    code: 'var(--sireen-line-height-code)',
  } as const,

  color: {
    bgPrimary: 'var(--sireen-bg-primary)',
    bgSecondary: 'var(--sireen-bg-secondary)',
    bgTertiary: 'var(--sireen-bg-tertiary)',
    bgElevated: 'var(--sireen-bg-elevated)',
    bgHover: 'var(--sireen-bg-hover)',
    bgActive: 'var(--sireen-bg-active)',
    bgInactive: 'var(--sireen-bg-inactive)',

    fgPrimary: 'var(--sireen-fg-primary)',
    fgSecondary: 'var(--sireen-fg-secondary)',
    fgMuted: 'var(--sireen-fg-muted)',
    fgOnAccent: 'var(--sireen-fg-on-accent)',

    border: 'var(--sireen-border)',
    borderSubtle: 'var(--sireen-border-subtle)',
    borderFocus: 'var(--sireen-border-focus)',

    buttonBg: 'var(--sireen-button-bg)',
    buttonFg: 'var(--sireen-button-fg)',
    buttonHoverBg: 'var(--sireen-button-hover-bg)',
    buttonSecondaryBg: 'var(--sireen-button-secondary-bg)',
    buttonSecondaryFg: 'var(--sireen-button-secondary-fg)',

    inputBg: 'var(--sireen-input-bg)',
    inputFg: 'var(--sireen-input-fg)',
    inputBorder: 'var(--sireen-input-border)',
    inputPlaceholder: 'var(--sireen-input-placeholder)',

    link: 'var(--sireen-link-fg)',
    linkActive: 'var(--sireen-link-active-fg)',

    errorFg: 'var(--sireen-error-fg)',
    errorBg: 'var(--sireen-error-bg)',
    errorBorder: 'var(--sireen-error-border)',
    warningFg: 'var(--sireen-warning-fg)',
    warningBg: 'var(--sireen-warning-bg)',
    warningBorder: 'var(--sireen-warning-border)',
    successFg: 'var(--sireen-success-fg)',
    successBg: 'var(--sireen-success-bg)',
    infoFg: 'var(--sireen-info-fg)',
    infoBg: 'var(--sireen-info-bg)',

    focusBorder: 'var(--sireen-focus-border)',
  } as const,

  severity: {
    critical: {
      fg: 'var(--sireen-severity-critical-fg)',
      bg: 'var(--sireen-severity-critical-bg)',
      border: 'var(--sireen-severity-critical-border)',
    },
    high: {
      fg: 'var(--sireen-severity-high-fg)',
      bg: 'var(--sireen-severity-high-bg)',
      border: 'var(--sireen-severity-high-border)',
    },
    medium: {
      fg: 'var(--sireen-severity-medium-fg)',
      bg: 'var(--sireen-severity-medium-bg)',
      border: 'var(--sireen-severity-medium-border)',
    },
    low: {
      fg: 'var(--sireen-severity-low-fg)',
      bg: 'var(--sireen-severity-low-bg)',
      border: 'var(--sireen-severity-low-border)',
    },
    info: {
      fg: 'var(--sireen-severity-info-fg)',
      bg: 'var(--sireen-severity-info-bg)',
      border: 'var(--sireen-severity-info-border)',
    },
  } as const,

  accent: {
    amber: 'var(--sireen-accent-amber)',
    purple: 'var(--sireen-accent-purple)',
    cyan: 'var(--sireen-accent-cyan)',
    green: 'var(--sireen-accent-green)',
    red: 'var(--sireen-accent-red)',
    blue: 'var(--sireen-accent-blue)',
  } as const,

  shadow: {
    overlay: 'var(--sireen-shadow-overlay)',
    modal: 'var(--sireen-shadow-modal)',
    tooltip: 'var(--sireen-shadow-tooltip)',
  } as const,
} as const;

export type Tokens = typeof tokens;
