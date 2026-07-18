// ============================================================================
// SIREEN — JSX Runtime Shim for Solid.js v1.9.x
// ============================================================================
// This shim provides the necessary JSX runtime functions (`h` and `Fragment`)
// for Solid.js when using esbuild's transform JSX mode with `jsxFactory: 'h'`
// and `jsxFragment: 'Fragment'`. It is injected into every component file
// via esbuild's `inject` option.
//
// In Solid.js v1.9.x, `h` is the hyperscript function from solid-js/h,
// and `Fragment` is exported from solid-js/h/jsx-runtime (not from solid-js
// directly, as in earlier versions).

import _h from 'solid-js/h';
import { Fragment } from 'solid-js/h/jsx-runtime';

const h = _h;

export { h, Fragment };
