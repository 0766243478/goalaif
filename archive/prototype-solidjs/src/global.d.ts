/// <reference types="solid-js" />

declare namespace JSX {
  interface ElementClass {}
  interface ElementAttributesProperty { props: {} }
  interface ElementChildrenAttribute { children: {} }
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface Element extends solid_js.Element {}
}

// Extend SolidJS JSX namespace to support Show and For properly
declare module 'solid-js' {
  namespace JSX {
    interface Element {}
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    interface ElementClass {}
    interface ElementAttributesProperty { props: {} }
    interface ElementChildrenAttribute { children: {} }
  }
}