// ============================================================================
// SIREEN — Global Type Declarations
// ============================================================================

// acquireVsCodeApi is injected by VS Code at runtime in the webview context.
declare function acquireVsCodeApi(): any;

// ============================================================================
// JSX Type Declarations for Solid.js (esbuild + solid-js/h)
// ============================================================================
// These types are intentionally permissive to match Solid.js JSX semantics:
// - style accepts CSSProperties (camelCase) or string
// - children can be any valid JSX child
// - all standard HTML/SVG attributes are supported

declare namespace JSX {
  interface CSSProperties {
    [key: string]: string | number | undefined;
  }

  interface HTMLAttributes<T> {
    // Standard HTML attributes
    id?: string;
    class?: string;
    style?: CSSProperties | string;
    role?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    'aria-hidden'?: boolean;
    'aria-expanded'?: boolean;
    'aria-controls'?: string;
    'aria-selected'?: boolean;
    'aria-pressed'?: boolean;
    'aria-disabled'?: boolean;
    'aria-current'?: string;
    'aria-live'?: string;
    'aria-atomic'?: boolean;
    'aria-busy'?: boolean;
    tabIndex?: number;
    title?: string;
    lang?: string;
    dir?: string;
    hidden?: boolean;
    draggable?: boolean;
    spellCheck?: boolean;
    contentEditable?: boolean;
    onClick?: (event: MouseEvent) => void;
    onChange?: (event: Event) => void;
    onInput?: (event: Event) => void;
    onKeyDown?: (event: KeyboardEvent) => void;
    onKeyUp?: (event: KeyboardEvent) => void;
    onFocus?: (event: FocusEvent) => void;
    onBlur?: (event: FocusEvent) => void;
    onMouseEnter?: (event: MouseEvent) => void;
    onMouseLeave?: (event: MouseEvent) => void;
    onSubmit?: (event: Event) => void;
    // Allow any other attributes
    [key: `data-${string}`]: string | undefined;
    [key: `aria-${string}`]: string | boolean | undefined;
    [key: string]: any;
  }

  interface IntrinsicElements {
    // HTML elements
    a: HTMLAttributes<HTMLAnchorElement> & { href?: string; target?: string; rel?: string };
    abbr: HTMLAttributes<HTMLElement>;
    address: HTMLAttributes<HTMLElement>;
    area: HTMLAttributes<HTMLAreaElement> & { coords?: string; shape?: string };
    article: HTMLAttributes<HTMLElement>;
    aside: HTMLAttributes<HTMLElement>;
    audio: HTMLAttributes<HTMLAudioElement> & { src?: string; controls?: boolean; loop?: boolean; autoplay?: boolean; muted?: boolean };
    b: HTMLAttributes<HTMLElement>;
    base: HTMLAttributes<HTMLBaseElement> & { href?: string; target?: string };
    bdi: HTMLAttributes<HTMLElement>;
    bdo: HTMLAttributes<HTMLElement>;
    blockquote: HTMLAttributes<HTMLQuoteElement> & { cite?: string };
    body: HTMLAttributes<HTMLBodyElement>;
    br: HTMLAttributes<HTMLBRElement>;
    button: HTMLAttributes<HTMLButtonElement> & { type?: 'button' | 'submit' | 'reset'; disabled?: boolean; form?: string; formAction?: string; formMethod?: string; formTarget?: string; formNoValidate?: boolean; formEnctype?: string; name?: string; value?: string };
    canvas: HTMLAttributes<HTMLCanvasElement> & { width?: number | string; height?: number | string };
    caption: HTMLAttributes<HTMLTableCaptionElement>;
    cite: HTMLAttributes<HTMLElement>;
    code: HTMLAttributes<HTMLElement>;
    col: HTMLAttributes<HTMLTableColElement> & { span?: number };
    colgroup: HTMLAttributes<HTMLTableColElement> & { span?: number };
    data: HTMLAttributes<HTMLDataElement> & { value?: string | number };
    datalist: HTMLAttributes<HTMLDataListElement>;
    dd: HTMLAttributes<HTMLElement>;
    del: HTMLAttributes<HTMLModElement> & { cite?: string; dateTime?: string };
    details: HTMLAttributes<HTMLDetailsElement> & { open?: boolean };
    dfn: HTMLAttributes<HTMLElement>;
    dialog: HTMLAttributes<HTMLDialogElement> & { open?: boolean };
    div: HTMLAttributes<HTMLDivElement>;
    dl: HTMLAttributes<HTMLDListElement>;
    dt: HTMLAttributes<HTMLElement>;
    em: HTMLAttributes<HTMLElement>;
    embed: HTMLAttributes<HTMLEmbedElement> & { src?: string; type?: string; width?: number | string; height?: number | string };
    fieldset: HTMLAttributes<HTMLFieldSetElement> & { disabled?: boolean; form?: string; name?: string };
    figcaption: HTMLAttributes<HTMLElement>;
    figure: HTMLAttributes<HTMLElement>;
    footer: HTMLAttributes<HTMLElement>;
    form: HTMLAttributes<HTMLFormElement> & { action?: string; method?: string; encType?: string; noValidate?: boolean; target?: string };
    h1: HTMLAttributes<HTMLHeadingElement>;
    h2: HTMLAttributes<HTMLHeadingElement>;
    h3: HTMLAttributes<HTMLHeadingElement>;
    h4: HTMLAttributes<HTMLHeadingElement>;
    h5: HTMLAttributes<HTMLHeadingElement>;
    h6: HTMLAttributes<HTMLHeadingElement>;
    head: HTMLAttributes<HTMLHeadElement>;
    header: HTMLAttributes<HTMLElement>;
    hgroup: HTMLAttributes<HTMLElement>;
    hr: HTMLAttributes<HTMLHRElement>;
    html: HTMLAttributes<HTMLHtmlElement>;
    i: HTMLAttributes<HTMLElement>;
    iframe: HTMLAttributes<HTMLIFrameElement> & { src?: string; width?: number | string; height?: number | string; frameBorder?: number | string; allowFullScreen?: boolean; sandbox?: string };
    img: HTMLAttributes<HTMLImageElement> & { src?: string; alt?: string; width?: number | string; height?: number | string; loading?: 'lazy' | 'eager'; decoding?: 'async' | 'sync' | 'auto' };
    input: HTMLAttributes<HTMLInputElement> & { type?: string; value?: string | number | readonly string[]; placeholder?: string; disabled?: boolean; readOnly?: boolean; required?: boolean; name?: string; autoComplete?: string; autoFocus?: boolean; checked?: boolean; min?: string | number; max?: string | number; step?: string | number; minLength?: number; maxLength?: number; pattern?: string; accept?: string; capture?: boolean | string; multiple?: boolean; list?: string; form?: string; formAction?: string; formMethod?: string; formTarget?: string; formNoValidate?: boolean; formEnctype?: string };
    ins: HTMLAttributes<HTMLModElement> & { cite?: string; dateTime?: string };
    kbd: HTMLAttributes<HTMLElement>;
    label: HTMLAttributes<HTMLLabelElement> & { htmlFor?: string; form?: string };
    legend: HTMLAttributes<HTMLLegendElement>;
    li: HTMLAttributes<HTMLLIElement> & { value?: number };
    link: HTMLAttributes<HTMLLinkElement> & { href?: string; rel?: string; media?: string; type?: string; sizes?: string; as?: string; crossOrigin?: string; referrerPolicy?: string; integrity?: string };
    main: HTMLAttributes<HTMLElement>;
    map: HTMLAttributes<HTMLMapElement> & { name?: string };
    mark: HTMLAttributes<HTMLElement>;
    menu: HTMLAttributes<HTMLMenuElement>;
    meta: HTMLAttributes<HTMLMetaElement> & { name?: string; content?: string; httpEquiv?: string; charSet?: string; property?: string };
    meter: HTMLAttributes<HTMLMeterElement> & { value?: number; min?: number; max?: number; low?: number; high?: number; optimum?: number };
    nav: HTMLAttributes<HTMLElement>;
    noscript: HTMLAttributes<HTMLElement>;
    object: HTMLAttributes<HTMLObjectElement> & { data?: string; type?: string; width?: number | string; height?: number | string; form?: string; name?: string; useMap?: string };
    ol: HTMLAttributes<HTMLOListElement> & { reversed?: boolean; start?: number; type?: string };
    optgroup: HTMLAttributes<HTMLOptGroupElement> & { disabled?: boolean; label?: string };
    option: HTMLAttributes<HTMLOptionElement> & { disabled?: boolean; label?: string; selected?: boolean; value?: string };
    output: HTMLAttributes<HTMLOutputElement> & { for?: string; form?: string; name?: string };
    p: HTMLAttributes<HTMLParagraphElement>;
    param: HTMLAttributes<HTMLParamElement> & { name?: string; value?: string };
    picture: HTMLAttributes<HTMLPictureElement>;
    pre: HTMLAttributes<HTMLPreElement>;
    progress: HTMLAttributes<HTMLProgressElement> & { value?: number; max?: number };
    q: HTMLAttributes<HTMLQuoteElement> & { cite?: string };
    rp: HTMLAttributes<HTMLElement>;
    rt: HTMLAttributes<HTMLElement>;
    ruby: HTMLAttributes<HTMLElement>;
    s: HTMLAttributes<HTMLElement>;
    samp: HTMLAttributes<HTMLElement>;
    script: HTMLAttributes<HTMLScriptElement> & { src?: string; type?: string; async?: boolean; defer?: boolean; crossOrigin?: string; integrity?: string; noModule?: boolean };
    section: HTMLAttributes<HTMLElement>;
    select: HTMLAttributes<HTMLSelectElement> & { multiple?: boolean; size?: number; name?: string; disabled?: boolean; required?: boolean; form?: string; autoFocus?: boolean; value?: string | readonly string[] };
    slot: HTMLAttributes<HTMLSlotElement> & { name?: string };
    small: HTMLAttributes<HTMLElement>;
    source: HTMLAttributes<HTMLSourceElement> & { src?: string; type?: string; media?: string; srcSet?: string; sizes?: string };
    span: HTMLAttributes<HTMLSpanElement>;
    strong: HTMLAttributes<HTMLElement>;
    style: HTMLAttributes<HTMLStyleElement> & { type?: string; media?: string; nonce?: string };
    sub: HTMLAttributes<HTMLElement>;
    summary: HTMLAttributes<HTMLElement>;
    sup: HTMLAttributes<HTMLElement>;
    table: HTMLAttributes<HTMLTableElement>;
    tbody: HTMLAttributes<HTMLTableSectionElement>;
    td: HTMLAttributes<HTMLTableCellElement> & { colSpan?: number; rowSpan?: number; headers?: string };
    template: HTMLAttributes<HTMLTemplateElement>;
    textarea: HTMLAttributes<HTMLTextAreaElement> & { value?: string; placeholder?: string; disabled?: boolean; readOnly?: boolean; required?: boolean; name?: string; autoComplete?: string; autoFocus?: boolean; rows?: number; cols?: number; minLength?: number; maxLength?: number; wrap?: 'soft' | 'hard'; form?: string };
    tfoot: HTMLAttributes<HTMLTableSectionElement>;
    th: HTMLAttributes<HTMLTableCellElement> & { colSpan?: number; rowSpan?: number; headers?: string; scope?: string; abbr?: string };
    thead: HTMLAttributes<HTMLTableSectionElement>;
    time: HTMLAttributes<HTMLTimeElement> & { dateTime?: string };
    title: HTMLAttributes<HTMLTitleElement>;
    tr: HTMLAttributes<HTMLTableRowElement>;
    track: HTMLAttributes<HTMLTrackElement> & { kind?: string; src?: string; srclang?: string; label?: string; default?: boolean };
    u: HTMLAttributes<HTMLElement>;
    ul: HTMLAttributes<HTMLUListElement>;
    var: HTMLAttributes<HTMLElement>;
    video: HTMLAttributes<HTMLVideoElement> & { src?: string; width?: number | string; height?: number | string; controls?: boolean; loop?: boolean; autoplay?: boolean; muted?: boolean; playsInline?: boolean; poster?: string; preload?: string; crossOrigin?: string };
    wbr: HTMLAttributes<HTMLElement>;

    // SVG elements
    svg: HTMLAttributes<SVGSVGElement> & { width?: number | string; height?: number | string; viewBox?: string; xmlns?: string };
    path: HTMLAttributes<SVGPathElement> & { d?: string };
    circle: HTMLAttributes<SVGCircleElement> & { cx?: number | string; cy?: number | string; r?: number | string };
    ellipse: HTMLAttributes<SVGEllipseElement> & { cx?: number | string; cy?: number | string; rx?: number | string; ry?: number | string };
    line: HTMLAttributes<SVGLineElement> & { x1?: number | string; y1?: number | string; x2?: number | string; y2?: number | string };
    rect: HTMLAttributes<SVGRectElement> & { x?: number | string; y?: number | string; width?: number | string; height?: number | string; rx?: number | string; ry?: number | string };
    polygon: HTMLAttributes<SVGPolygonElement> & { points?: string };
    polyline: HTMLAttributes<SVGPolylineElement> & { points?: string };
    g: HTMLAttributes<SVGGElement>;
    text: HTMLAttributes<SVGTextElement> & { x?: number | string; y?: number | string; textAnchor?: string; dominantBaseline?: string };
    tspan: HTMLAttributes<SVGTSpanElement> & { x?: number | string; y?: number | string; dx?: number | string; dy?: number | string };
    defs: HTMLAttributes<SVGDefsElement>;
    use: HTMLAttributes<SVGUseElement> & { href?: string; xlinkHref?: string; x?: number | string; y?: number | string; width?: number | string; height?: number | string };
    mask: HTMLAttributes<SVGMaskElement>;
    clipPath: HTMLAttributes<SVGClipPathElement>;
    linearGradient: HTMLAttributes<SVGLinearGradientElement> & { x1?: number | string; y1?: number | string; x2?: number | string; y2?: number | string; gradientTransform?: string; gradientUnits?: string };
    radialGradient: HTMLAttributes<SVGRadialGradientElement> & { cx?: number | string; cy?: number | string; r?: number | string; fx?: number | string; fy?: number | string; gradientTransform?: string; gradientUnits?: string };
    stop: HTMLAttributes<SVGStopElement> & { offset?: number | string; stopColor?: string; stopOpacity?: number | string };
    pattern: HTMLAttributes<SVGPatternElement> & { patternUnits?: string; patternContentUnits?: string; x?: number | string; y?: number | string; width?: number | string; height?: number | string };
    filter: HTMLAttributes<SVGFilterElement> & { x?: number | string; y?: number | string; width?: number | string; height?: number | string; filterUnits?: string; primitiveUnits?: string };
    feBlend: HTMLAttributes<SVGFEBlendElement> & { in?: string; in2?: string; mode?: string };
    feColorMatrix: HTMLAttributes<SVGFEColorMatrixElement> & { in?: string; type?: string; values?: string };
    feComponentTransfer: HTMLAttributes<SVGFEComponentTransferElement> & { in?: string };
    feComposite: HTMLAttributes<SVGFECompositeElement> & { in?: string; in2?: string; operator?: string; k1?: number; k2?: number; k3?: number; k4?: number };
    feConvolveMatrix: HTMLAttributes<SVGFEConvolveMatrixElement> & { in?: string; order?: number; kernelMatrix?: string; divisor?: number; bias?: number; targetX?: number; targetY?: number; edgeMode?: string; kernelUnitLength?: string; preserveAlpha?: boolean };
    feDiffuseLighting: HTMLAttributes<SVGFEDiffuseLightingElement> & { in?: string; surfaceScale?: number; diffuseConstant?: number; kernelUnitLength?: string; lightingColor?: string };
    feDisplacementMap: HTMLAttributes<SVGFEDisplacementMapElement> & { in?: string; in2?: string; scale?: number; xChannelSelector?: string; yChannelSelector?: string; primitiveUnits?: string };
    feDistantLight: HTMLAttributes<SVGFEDistantLightElement> & { azimuth?: number; elevation?: number };
    feDropShadow: HTMLAttributes<SVGFEDropShadowElement> & { in?: string; dx?: number; dy?: number; stdDeviation?: number; floodColor?: string; floodOpacity?: number };
    feFlood: HTMLAttributes<SVGFEFloodElement> & { floodColor?: string; floodOpacity?: number };
    feFuncA: HTMLAttributes<SVGFEFuncAElement> & { type?: string; tableValues?: string; slope?: number; intercept?: number; amplitude?: number; exponent?: number; offset?: number };
    feFuncB: HTMLAttributes<SVGFEFuncBElement> & { type?: string; tableValues?: string; slope?: number; intercept?: number; amplitude?: number; exponent?: number; offset?: number };
    feFuncG: HTMLAttributes<SVGFEFuncGElement> & { type?: string; tableValues?: string; slope?: number; intercept?: number; amplitude?: number; exponent?: number; offset?: number };
    feFuncR: HTMLAttributes<SVGFEFuncRElement> & { type?: string; tableValues?: string; slope?: number; intercept?: number; amplitude?: number; exponent?: number; offset?: number };
    feGaussianBlur: HTMLAttributes<SVGFEGaussianBlurElement> & { in?: string; stdDeviation?: string; edgeMode?: string };
    feImage: HTMLAttributes<SVGFEImageElement> & { href?: string; xlinkHref?: string; preserveAspectRatio?: string };
    feMerge: HTMLAttributes<SVGFEMergeElement> & { in?: string };
    feMergeNode: HTMLAttributes<SVGFEMergeNodeElement> & { in?: string };
    feMorphology: HTMLAttributes<SVGFEMorphologyElement> & { in?: string; operator?: string; radius?: number | string };
    feOffset: HTMLAttributes<SVGFEOffsetElement> & { in?: string; dx?: number; dy?: number };
    fePointLight: HTMLAttributes<SVGFEPointLightElement> & { x?: number; y?: number; z?: number };
    feSpecularLighting: HTMLAttributes<SVGFESpecularLightingElement> & { in?: string; surfaceScale?: number; specularConstant?: number; specularExponent?: number; kernelUnitLength?: string; lightingColor?: string };
    feSpotLight: HTMLAttributes<SVGFESpotLightElement> & { x?: number; y?: number; z?: number; pointsAtX?: number; pointsAtY?: number; pointsAtZ?: number; specularExponent?: number; limitingConeAngle?: number };
    feTile: HTMLAttributes<SVGFETileElement> & { in?: string };
    feTurbulence: HTMLAttributes<SVGFETurbulenceElement> & { type?: string; baseFrequency?: string; numOctaves?: number; seed?: number; stitchTiles?: string };
    foreignObject: HTMLAttributes<SVGForeignObjectElement> & { x?: number | string; y?: number | string; width?: number | string; height?: number | string };
    image: HTMLAttributes<SVGImageElement> & { href?: string; xlinkHref?: string; x?: number | string; y?: number | string; width?: number | string; height?: number | string; preserveAspectRatio?: string };
    marker: HTMLAttributes<SVGMarkerElement> & { markerUnits?: string; refX?: number | string; refY?: number | string; markerWidth?: number | string; markerHeight?: number | string; orient?: string | number };
    view: HTMLAttributes<SVGViewElement> & { viewBox?: string; preserveAspectRatio?: string };

    // Generic element for custom components
    [elemName: string]: any;
  }

  interface Element extends HTMLElement {}
  interface IntrinsicAttributes extends Record<string, any> {
    children?: any;
  }
  interface ElementChildrenAttribute { children: {}; }
  interface ElementClass { render(): any; }
  interface ElementAttributesProperty { props: {}; }
}