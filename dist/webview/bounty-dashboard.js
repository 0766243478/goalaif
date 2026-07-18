"use strict";
(() => {
  // node_modules/solid-js/dist/solid.js
  var sharedConfig = {
    context: void 0,
    registry: void 0,
    effects: void 0,
    done: false,
    getContextId() {
      return getContextId(this.context.count);
    },
    getNextContextId() {
      return getContextId(this.context.count++);
    }
  };
  function getContextId(count) {
    const num = String(count), len = num.length - 1;
    return sharedConfig.context.id + (len ? String.fromCharCode(96 + len) : "") + num;
  }
  function setHydrateContext(context) {
    sharedConfig.context = context;
  }
  function nextHydrateContext() {
    return {
      ...sharedConfig.context,
      id: sharedConfig.getNextContextId(),
      count: 0
    };
  }
  var IS_DEV = false;
  var equalFn = (a, b) => a === b;
  var $PROXY = Symbol("solid-proxy");
  var $TRACK = Symbol("solid-track");
  var $DEVCOMP = Symbol("solid-dev-component");
  var signalOptions = {
    equals: equalFn
  };
  var ERROR = null;
  var runEffects = runQueue;
  var STALE = 1;
  var PENDING = 2;
  var UNOWNED = {
    owned: null,
    cleanups: null,
    context: null,
    owner: null
  };
  var Owner = null;
  var Transition = null;
  var Scheduler = null;
  var ExternalSourceConfig = null;
  var Listener = null;
  var Updates = null;
  var Effects = null;
  var ExecCount = 0;
  function createRoot(fn, detachedOwner) {
    const listener = Listener, owner = Owner, unowned = fn.length === 0, current = detachedOwner === void 0 ? owner : detachedOwner, root2 = unowned ? UNOWNED : {
      owned: null,
      cleanups: null,
      context: current ? current.context : null,
      owner: current
    }, updateFn = unowned ? fn : () => fn(() => untrack(() => cleanNode(root2)));
    Owner = root2;
    Listener = null;
    try {
      return runUpdates(updateFn, true);
    } finally {
      Listener = listener;
      Owner = owner;
    }
  }
  function createSignal(value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    const s = {
      value,
      observers: null,
      observerSlots: null,
      comparator: options.equals || void 0
    };
    const setter = (value2) => {
      if (typeof value2 === "function") {
        if (Transition && Transition.running && Transition.sources.has(s))
          value2 = value2(s.tValue);
        else
          value2 = value2(s.value);
      }
      return writeSignal(s, value2);
    };
    return [readSignal.bind(s), setter];
  }
  function createRenderEffect(fn, value, options) {
    const c = createComputation(fn, value, false, STALE);
    if (Scheduler && Transition && Transition.running)
      Updates.push(c);
    else
      updateComputation(c);
  }
  function createMemo(fn, value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    const c = createComputation(fn, value, true, 0);
    c.observers = null;
    c.observerSlots = null;
    c.comparator = options.equals || void 0;
    if (Scheduler && Transition && Transition.running) {
      c.tState = STALE;
      Updates.push(c);
    } else
      updateComputation(c);
    return readSignal.bind(c);
  }
  function untrack(fn) {
    if (!ExternalSourceConfig && Listener === null)
      return fn();
    const listener = Listener;
    Listener = null;
    try {
      if (ExternalSourceConfig)
        return ExternalSourceConfig.untrack(fn);
      return fn();
    } finally {
      Listener = listener;
    }
  }
  function onCleanup(fn) {
    if (Owner === null)
      ;
    else if (Owner.cleanups === null)
      Owner.cleanups = [fn];
    else
      Owner.cleanups.push(fn);
    return fn;
  }
  function startTransition(fn) {
    if (Transition && Transition.running) {
      fn();
      return Transition.done;
    }
    const l = Listener;
    const o = Owner;
    return Promise.resolve().then(() => {
      Listener = l;
      Owner = o;
      let t;
      if (Scheduler || SuspenseContext) {
        t = Transition || (Transition = {
          sources: /* @__PURE__ */ new Set(),
          effects: [],
          promises: /* @__PURE__ */ new Set(),
          disposed: /* @__PURE__ */ new Set(),
          queue: /* @__PURE__ */ new Set(),
          running: true
        });
        t.done || (t.done = new Promise((res) => t.resolve = res));
        t.running = true;
      }
      runUpdates(fn, false);
      Listener = Owner = null;
      return t ? t.done : void 0;
    });
  }
  var [transPending, setTransPending] = /* @__PURE__ */ createSignal(false);
  var SuspenseContext;
  function readSignal() {
    const runningTransition = Transition && Transition.running;
    if (this.sources && (runningTransition ? this.tState : this.state)) {
      if ((runningTransition ? this.tState : this.state) === STALE)
        updateComputation(this);
      else {
        const updates = Updates;
        Updates = null;
        runUpdates(() => lookUpstream(this), false);
        Updates = updates;
      }
    }
    if (Listener) {
      const observers = this.observers;
      if (!observers || observers[observers.length - 1] !== Listener) {
        const sSlot = observers ? observers.length : 0;
        if (!Listener.sources) {
          Listener.sources = [this];
          Listener.sourceSlots = [sSlot];
        } else {
          Listener.sources.push(this);
          Listener.sourceSlots.push(sSlot);
        }
        if (!observers) {
          this.observers = [Listener];
          this.observerSlots = [Listener.sources.length - 1];
        } else {
          observers.push(Listener);
          this.observerSlots.push(Listener.sources.length - 1);
        }
      }
    }
    if (runningTransition && Transition.sources.has(this))
      return this.tValue;
    return this.value;
  }
  function writeSignal(node, value, isComp) {
    let current = Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value;
    if (!node.comparator || !node.comparator(current, value)) {
      if (Transition) {
        const TransitionRunning = Transition.running;
        if (TransitionRunning || !isComp && Transition.sources.has(node)) {
          Transition.sources.add(node);
          node.tValue = value;
        }
        if (!TransitionRunning)
          node.value = value;
      } else
        node.value = value;
      if (node.observers && node.observers.length) {
        runUpdates(() => {
          for (let i = 0; i < node.observers.length; i += 1) {
            const o = node.observers[i];
            const TransitionRunning = Transition && Transition.running;
            if (TransitionRunning && Transition.disposed.has(o))
              continue;
            if (TransitionRunning ? !o.tState : !o.state) {
              if (o.pure)
                Updates.push(o);
              else
                Effects.push(o);
              if (o.observers)
                markDownstream(o);
            }
            if (!TransitionRunning)
              o.state = STALE;
            else
              o.tState = STALE;
          }
          if (Updates.length > 1e6) {
            Updates = [];
            if (IS_DEV)
              ;
            throw new Error();
          }
        }, false);
      }
    }
    return value;
  }
  function updateComputation(node) {
    if (!node.fn)
      return;
    cleanNode(node);
    const time = ExecCount;
    runComputation(node, Transition && Transition.running && Transition.sources.has(node) ? node.tValue : node.value, time);
    if (Transition && !Transition.running && Transition.sources.has(node)) {
      queueMicrotask(() => {
        runUpdates(() => {
          Transition && (Transition.running = true);
          Listener = Owner = node;
          runComputation(node, node.tValue, time);
          Listener = Owner = null;
        }, false);
      });
    }
  }
  function runComputation(node, value, time) {
    let nextValue;
    const owner = Owner, listener = Listener;
    Listener = Owner = node;
    try {
      nextValue = node.fn(value);
    } catch (err) {
      if (node.pure) {
        if (Transition && Transition.running) {
          node.tState = STALE;
          node.tOwned && node.tOwned.forEach(cleanNode);
          node.tOwned = void 0;
        } else {
          node.state = STALE;
          node.owned && node.owned.forEach(cleanNode);
          node.owned = null;
        }
      }
      node.updatedAt = time + 1;
      return handleError(err);
    } finally {
      Listener = listener;
      Owner = owner;
    }
    if (!node.updatedAt || node.updatedAt <= time) {
      if (node.updatedAt != null && "observers" in node) {
        writeSignal(node, nextValue, true);
      } else if (Transition && Transition.running && node.pure) {
        if (!Transition.sources.has(node))
          node.value = nextValue;
        Transition.sources.add(node);
        node.tValue = nextValue;
      } else
        node.value = nextValue;
      node.updatedAt = time;
    }
  }
  function createComputation(fn, init, pure, state = STALE, options) {
    const c = {
      fn,
      state,
      updatedAt: null,
      owned: null,
      sources: null,
      sourceSlots: null,
      cleanups: null,
      value: init,
      owner: Owner,
      context: Owner ? Owner.context : null,
      pure
    };
    if (Transition && Transition.running) {
      c.state = 0;
      c.tState = state;
    }
    if (Owner === null)
      ;
    else if (Owner !== UNOWNED) {
      if (Transition && Transition.running && Owner.pure) {
        if (!Owner.tOwned)
          Owner.tOwned = [c];
        else
          Owner.tOwned.push(c);
      } else {
        if (!Owner.owned)
          Owner.owned = [c];
        else
          Owner.owned.push(c);
      }
    }
    if (ExternalSourceConfig && c.fn) {
      const sourceFn = c.fn;
      const [track, trigger] = createSignal(void 0, {
        equals: false
      });
      const ordinary = ExternalSourceConfig.factory(sourceFn, trigger);
      onCleanup(() => ordinary.dispose());
      let inTransition;
      const triggerInTransition = () => startTransition(trigger).then(() => {
        if (inTransition) {
          inTransition.dispose();
          inTransition = void 0;
        }
      });
      c.fn = (x) => {
        track();
        if (Transition && Transition.running) {
          if (!inTransition)
            inTransition = ExternalSourceConfig.factory(sourceFn, triggerInTransition);
          return inTransition.track(x);
        }
        return ordinary.track(x);
      };
    }
    return c;
  }
  function runTop(node) {
    const runningTransition = Transition && Transition.running;
    if ((runningTransition ? node.tState : node.state) === 0)
      return;
    if ((runningTransition ? node.tState : node.state) === PENDING)
      return lookUpstream(node);
    if (node.suspense && untrack(node.suspense.inFallback))
      return node.suspense.effects.push(node);
    const ancestors = [node];
    while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
      if (runningTransition && Transition.disposed.has(node))
        return;
      if (runningTransition ? node.tState : node.state)
        ancestors.push(node);
    }
    for (let i = ancestors.length - 1; i >= 0; i--) {
      node = ancestors[i];
      if (runningTransition) {
        let top = node, prev = ancestors[i + 1];
        while ((top = top.owner) && top !== prev) {
          if (Transition.disposed.has(top))
            return;
        }
      }
      if ((runningTransition ? node.tState : node.state) === STALE) {
        updateComputation(node);
      } else if ((runningTransition ? node.tState : node.state) === PENDING) {
        const updates = Updates;
        Updates = null;
        runUpdates(() => lookUpstream(node, ancestors[0]), false);
        Updates = updates;
      }
    }
  }
  function runUpdates(fn, init) {
    if (Updates)
      return fn();
    let wait = false;
    if (!init)
      Updates = [];
    if (Effects)
      wait = true;
    else
      Effects = [];
    ExecCount++;
    try {
      const res = fn();
      completeUpdates(wait);
      return res;
    } catch (err) {
      if (!wait)
        Effects = null;
      Updates = null;
      handleError(err);
    }
  }
  function completeUpdates(wait) {
    if (Updates) {
      if (Scheduler && Transition && Transition.running)
        scheduleQueue(Updates);
      else
        runQueue(Updates);
      Updates = null;
    }
    if (wait)
      return;
    let res;
    if (Transition) {
      if (!Transition.promises.size && !Transition.queue.size) {
        const sources = Transition.sources;
        const disposed = Transition.disposed;
        Effects.push.apply(Effects, Transition.effects);
        res = Transition.resolve;
        for (const e2 of Effects) {
          "tState" in e2 && (e2.state = e2.tState);
          delete e2.tState;
        }
        Transition = null;
        runUpdates(() => {
          for (const d of disposed)
            cleanNode(d);
          for (const v of sources) {
            v.value = v.tValue;
            if (v.owned) {
              for (let i = 0, len = v.owned.length; i < len; i++)
                cleanNode(v.owned[i]);
            }
            if (v.tOwned)
              v.owned = v.tOwned;
            delete v.tValue;
            delete v.tOwned;
            v.tState = 0;
          }
          setTransPending(false);
        }, false);
      } else if (Transition.running) {
        Transition.running = false;
        Transition.effects.push.apply(Transition.effects, Effects);
        Effects = null;
        setTransPending(true);
        return;
      }
    }
    const e = Effects;
    Effects = null;
    if (e.length)
      runUpdates(() => runEffects(e), false);
    if (res)
      res();
  }
  function runQueue(queue) {
    for (let i = 0; i < queue.length; i++)
      runTop(queue[i]);
  }
  function scheduleQueue(queue) {
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      const tasks = Transition.queue;
      if (!tasks.has(item)) {
        tasks.add(item);
        Scheduler(() => {
          tasks.delete(item);
          runUpdates(() => {
            Transition.running = true;
            runTop(item);
          }, false);
          Transition && (Transition.running = false);
        });
      }
    }
  }
  function lookUpstream(node, ignore) {
    const runningTransition = Transition && Transition.running;
    if (runningTransition)
      node.tState = 0;
    else
      node.state = 0;
    for (let i = 0; i < node.sources.length; i += 1) {
      const source = node.sources[i];
      if (source.sources) {
        const state = runningTransition ? source.tState : source.state;
        if (state === STALE) {
          if (source !== ignore && (!source.updatedAt || source.updatedAt < ExecCount))
            runTop(source);
        } else if (state === PENDING)
          lookUpstream(source, ignore);
      }
    }
  }
  function markDownstream(node) {
    const runningTransition = Transition && Transition.running;
    for (let i = 0; i < node.observers.length; i += 1) {
      const o = node.observers[i];
      if (runningTransition ? !o.tState : !o.state) {
        if (runningTransition)
          o.tState = PENDING;
        else
          o.state = PENDING;
        if (o.pure)
          Updates.push(o);
        else
          Effects.push(o);
        o.observers && markDownstream(o);
      }
    }
  }
  function cleanNode(node) {
    let i;
    if (node.sources) {
      while (node.sources.length) {
        const source = node.sources.pop(), index = node.sourceSlots.pop(), obs = source.observers;
        if (obs && obs.length) {
          const n = obs.pop(), s = source.observerSlots.pop();
          if (index < obs.length) {
            n.sourceSlots[s] = index;
            obs[index] = n;
            source.observerSlots[index] = s;
          }
        }
      }
    }
    if (node.tOwned) {
      for (i = node.tOwned.length - 1; i >= 0; i--)
        cleanNode(node.tOwned[i]);
      delete node.tOwned;
    }
    if (Transition && Transition.running && node.pure) {
      reset(node, true);
    } else if (node.owned) {
      for (i = node.owned.length - 1; i >= 0; i--)
        cleanNode(node.owned[i]);
      node.owned = null;
    }
    if (node.cleanups) {
      for (i = node.cleanups.length - 1; i >= 0; i--)
        node.cleanups[i]();
      node.cleanups = null;
    }
    if (Transition && Transition.running)
      node.tState = 0;
    else
      node.state = 0;
  }
  function reset(node, top) {
    if (!top) {
      node.tState = 0;
      Transition.disposed.add(node);
    }
    if (node.owned) {
      for (let i = 0; i < node.owned.length; i++)
        reset(node.owned[i]);
    }
  }
  function castError(err) {
    if (err instanceof Error)
      return err;
    return new Error(typeof err === "string" ? err : "Unknown error", {
      cause: err
    });
  }
  function runErrors(err, fns, owner) {
    try {
      for (const f of fns)
        f(err);
    } catch (e) {
      handleError(e, owner && owner.owner || null);
    }
  }
  function handleError(err, owner = Owner) {
    const fns = ERROR && owner && owner.context && owner.context[ERROR];
    const error = castError(err);
    if (!fns)
      throw error;
    if (Effects)
      Effects.push({
        fn() {
          runErrors(error, fns, owner);
        },
        state: STALE
      });
    else
      runErrors(error, fns, owner);
  }
  var FALLBACK = Symbol("fallback");
  function dispose(d) {
    for (let i = 0; i < d.length; i++)
      d[i]();
  }
  function mapArray(list, mapFn, options = {}) {
    let items = [], mapped = [], disposers = [], len = 0, indexes = mapFn.length > 1 ? [] : null;
    onCleanup(() => dispose(disposers));
    return () => {
      let newItems = list() || [], newLen = newItems.length, i, j;
      newItems[$TRACK];
      return untrack(() => {
        let newIndices, newIndicesNext, temp, tempdisposers, tempIndexes, start, end, newEnd, item;
        if (newLen === 0) {
          if (len !== 0) {
            dispose(disposers);
            disposers = [];
            items = [];
            mapped = [];
            len = 0;
            indexes && (indexes = []);
          }
          if (options.fallback) {
            items = [FALLBACK];
            mapped[0] = createRoot((disposer) => {
              disposers[0] = disposer;
              return options.fallback();
            });
            len = 1;
          }
        } else if (len === 0) {
          mapped = new Array(newLen);
          for (j = 0; j < newLen; j++) {
            items[j] = newItems[j];
            mapped[j] = createRoot(mapper);
          }
          len = newLen;
        } else {
          temp = new Array(newLen);
          tempdisposers = new Array(newLen);
          indexes && (tempIndexes = new Array(newLen));
          for (start = 0, end = Math.min(len, newLen); start < end && items[start] === newItems[start]; start++)
            ;
          for (end = len - 1, newEnd = newLen - 1; end >= start && newEnd >= start && items[end] === newItems[newEnd]; end--, newEnd--) {
            temp[newEnd] = mapped[end];
            tempdisposers[newEnd] = disposers[end];
            indexes && (tempIndexes[newEnd] = indexes[end]);
          }
          newIndices = /* @__PURE__ */ new Map();
          newIndicesNext = new Array(newEnd + 1);
          for (j = newEnd; j >= start; j--) {
            item = newItems[j];
            i = newIndices.get(item);
            newIndicesNext[j] = i === void 0 ? -1 : i;
            newIndices.set(item, j);
          }
          for (i = start; i <= end; i++) {
            item = items[i];
            j = newIndices.get(item);
            if (j !== void 0 && j !== -1) {
              temp[j] = mapped[i];
              tempdisposers[j] = disposers[i];
              indexes && (tempIndexes[j] = indexes[i]);
              j = newIndicesNext[j];
              newIndices.set(item, j);
            } else
              disposers[i]();
          }
          for (j = start; j < newLen; j++) {
            if (j in temp) {
              mapped[j] = temp[j];
              disposers[j] = tempdisposers[j];
              if (indexes) {
                indexes[j] = tempIndexes[j];
                indexes[j](j);
              }
            } else
              mapped[j] = createRoot(mapper);
          }
          mapped = mapped.slice(0, len = newLen);
          items = newItems.slice(0);
        }
        return mapped;
      });
      function mapper(disposer) {
        disposers[j] = disposer;
        if (indexes) {
          const [s, set] = createSignal(j);
          indexes[j] = set;
          return mapFn(newItems[j], s);
        }
        return mapFn(newItems[j]);
      }
    };
  }
  var hydrationEnabled = false;
  function createComponent(Comp, props) {
    if (hydrationEnabled) {
      if (sharedConfig.context) {
        const c = sharedConfig.context;
        setHydrateContext(nextHydrateContext());
        const r = untrack(() => Comp(props || {}));
        setHydrateContext(c);
        return r;
      }
    }
    return untrack(() => Comp(props || {}));
  }
  var narrowedError = (name) => `Stale read from <${name}>.`;
  function For(props) {
    const fallback = "fallback" in props && {
      fallback: () => props.fallback
    };
    return createMemo(mapArray(() => props.each, props.children, fallback || void 0));
  }
  function Show(props) {
    const keyed = props.keyed;
    const conditionValue = createMemo(() => props.when, void 0, void 0);
    const condition = keyed ? conditionValue : createMemo(conditionValue, void 0, {
      equals: (a, b) => !a === !b
    });
    return createMemo(() => {
      const c = condition();
      if (c) {
        const child = props.children;
        const fn = typeof child === "function" && child.length > 0;
        return fn ? untrack(() => child(keyed ? c : () => {
          if (!untrack(condition))
            throw narrowedError("Show");
          return conditionValue();
        })) : child;
      }
      return props.fallback;
    }, void 0, void 0);
  }

  // node_modules/solid-js/web/dist/web.js
  var booleans = [
    "allowfullscreen",
    "async",
    "alpha",
    "autofocus",
    "autoplay",
    "checked",
    "controls",
    "default",
    "disabled",
    "formnovalidate",
    "hidden",
    "indeterminate",
    "inert",
    "ismap",
    "loop",
    "multiple",
    "muted",
    "nomodule",
    "novalidate",
    "open",
    "playsinline",
    "readonly",
    "required",
    "reversed",
    "seamless",
    "selected",
    "adauctionheaders",
    "browsingtopics",
    "credentialless",
    "defaultchecked",
    "defaultmuted",
    "defaultselected",
    "defer",
    "disablepictureinpicture",
    "disableremoteplayback",
    "preservespitch",
    "shadowrootclonable",
    "shadowrootcustomelementregistry",
    "shadowrootdelegatesfocus",
    "shadowrootserializable",
    "sharedstoragewritable"
  ];
  var Properties = /* @__PURE__ */ new Set([
    "className",
    "value",
    "readOnly",
    "noValidate",
    "formNoValidate",
    "isMap",
    "noModule",
    "playsInline",
    "adAuctionHeaders",
    "allowFullscreen",
    "browsingTopics",
    "defaultChecked",
    "defaultMuted",
    "defaultSelected",
    "disablePictureInPicture",
    "disableRemotePlayback",
    "preservesPitch",
    "shadowRootClonable",
    "shadowRootCustomElementRegistry",
    "shadowRootDelegatesFocus",
    "shadowRootSerializable",
    "sharedStorageWritable",
    ...booleans
  ]);
  var ChildProperties = /* @__PURE__ */ new Set(["innerHTML", "textContent", "innerText", "children"]);
  var Aliases = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(null), {
    className: "class",
    htmlFor: "for"
  });
  var PropAliases = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(null), {
    class: "className",
    novalidate: {
      $: "noValidate",
      FORM: 1
    },
    formnovalidate: {
      $: "formNoValidate",
      BUTTON: 1,
      INPUT: 1
    },
    ismap: {
      $: "isMap",
      IMG: 1
    },
    nomodule: {
      $: "noModule",
      SCRIPT: 1
    },
    playsinline: {
      $: "playsInline",
      VIDEO: 1
    },
    readonly: {
      $: "readOnly",
      INPUT: 1,
      TEXTAREA: 1
    },
    adauctionheaders: {
      $: "adAuctionHeaders",
      IFRAME: 1
    },
    allowfullscreen: {
      $: "allowFullscreen",
      IFRAME: 1
    },
    browsingtopics: {
      $: "browsingTopics",
      IMG: 1
    },
    defaultchecked: {
      $: "defaultChecked",
      INPUT: 1
    },
    defaultmuted: {
      $: "defaultMuted",
      AUDIO: 1,
      VIDEO: 1
    },
    defaultselected: {
      $: "defaultSelected",
      OPTION: 1
    },
    disablepictureinpicture: {
      $: "disablePictureInPicture",
      VIDEO: 1
    },
    disableremoteplayback: {
      $: "disableRemotePlayback",
      AUDIO: 1,
      VIDEO: 1
    },
    preservespitch: {
      $: "preservesPitch",
      AUDIO: 1,
      VIDEO: 1
    },
    shadowrootclonable: {
      $: "shadowRootClonable",
      TEMPLATE: 1
    },
    shadowrootdelegatesfocus: {
      $: "shadowRootDelegatesFocus",
      TEMPLATE: 1
    },
    shadowrootserializable: {
      $: "shadowRootSerializable",
      TEMPLATE: 1
    },
    sharedstoragewritable: {
      $: "sharedStorageWritable",
      IFRAME: 1,
      IMG: 1
    }
  });
  function getPropAlias(prop, tagName) {
    const a = PropAliases[prop];
    return typeof a === "object" ? a[tagName] ? a["$"] : void 0 : a;
  }
  var DelegatedEvents = /* @__PURE__ */ new Set(["beforeinput", "click", "dblclick", "contextmenu", "focusin", "focusout", "input", "keydown", "keyup", "mousedown", "mousemove", "mouseout", "mouseover", "mouseup", "pointerdown", "pointermove", "pointerout", "pointerover", "pointerup", "touchend", "touchmove", "touchstart"]);
  var SVGElements = /* @__PURE__ */ new Set([
    "altGlyph",
    "altGlyphDef",
    "altGlyphItem",
    "animate",
    "animateColor",
    "animateMotion",
    "animateTransform",
    "circle",
    "clipPath",
    "color-profile",
    "cursor",
    "defs",
    "desc",
    "ellipse",
    "feBlend",
    "feColorMatrix",
    "feComponentTransfer",
    "feComposite",
    "feConvolveMatrix",
    "feDiffuseLighting",
    "feDisplacementMap",
    "feDistantLight",
    "feDropShadow",
    "feFlood",
    "feFuncA",
    "feFuncB",
    "feFuncG",
    "feFuncR",
    "feGaussianBlur",
    "feImage",
    "feMerge",
    "feMergeNode",
    "feMorphology",
    "feOffset",
    "fePointLight",
    "feSpecularLighting",
    "feSpotLight",
    "feTile",
    "feTurbulence",
    "filter",
    "font",
    "font-face",
    "font-face-format",
    "font-face-name",
    "font-face-src",
    "font-face-uri",
    "foreignObject",
    "g",
    "glyph",
    "glyphRef",
    "hkern",
    "image",
    "line",
    "linearGradient",
    "marker",
    "mask",
    "metadata",
    "missing-glyph",
    "mpath",
    "path",
    "pattern",
    "polygon",
    "polyline",
    "radialGradient",
    "rect",
    "set",
    "stop",
    "svg",
    "switch",
    "symbol",
    "text",
    "textPath",
    "tref",
    "tspan",
    "use",
    "view",
    "vkern"
  ]);
  var SVGNamespace = {
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace"
  };
  function reconcileArrays(parentNode, a, b) {
    let bLength = b.length, aEnd = a.length, bEnd = bLength, aStart = 0, bStart = 0, after = a[aEnd - 1].nextSibling, map = null;
    while (aStart < aEnd || bStart < bEnd) {
      if (a[aStart] === b[bStart]) {
        aStart++;
        bStart++;
        continue;
      }
      while (a[aEnd - 1] === b[bEnd - 1]) {
        aEnd--;
        bEnd--;
      }
      if (aEnd === aStart) {
        const node = bEnd < bLength ? bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart] : after;
        while (bStart < bEnd)
          parentNode.insertBefore(b[bStart++], node);
      } else if (bEnd === bStart) {
        while (aStart < aEnd) {
          if (!map || !map.has(a[aStart]))
            a[aStart].remove();
          aStart++;
        }
      } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
        const node = a[--aEnd].nextSibling;
        parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
        parentNode.insertBefore(b[--bEnd], node);
        a[aEnd] = b[bEnd];
      } else {
        if (!map) {
          map = /* @__PURE__ */ new Map();
          let i = bStart;
          while (i < bEnd)
            map.set(b[i], i++);
        }
        const index = map.get(a[aStart]);
        if (index != null) {
          if (bStart < index && index < bEnd) {
            let i = aStart, sequence = 1, t;
            while (++i < aEnd && i < bEnd) {
              if ((t = map.get(a[i])) == null || t !== index + sequence)
                break;
              sequence++;
            }
            if (sequence > index - bStart) {
              const node = a[aStart];
              while (bStart < index)
                parentNode.insertBefore(b[bStart++], node);
            } else
              parentNode.replaceChild(b[bStart++], a[aStart++]);
          } else
            aStart++;
        } else
          a[aStart++].remove();
      }
    }
  }
  var $$EVENTS = "_$DX_DELEGATE";
  function render(code, element, init, options = {}) {
    let disposer;
    createRoot((dispose2) => {
      disposer = dispose2;
      element === document ? code() : insert(element, code(), element.firstChild ? null : void 0, init);
    }, options.owner);
    return () => {
      disposer();
      element.textContent = "";
    };
  }
  function delegateEvents(eventNames, document2 = window.document) {
    const e = document2[$$EVENTS] || (document2[$$EVENTS] = /* @__PURE__ */ new Set());
    for (let i = 0, l = eventNames.length; i < l; i++) {
      const name = eventNames[i];
      if (!e.has(name)) {
        e.add(name);
        document2.addEventListener(name, eventHandler);
      }
    }
  }
  function setAttribute(node, name, value) {
    if (isHydrating(node))
      return;
    if (value == null)
      node.removeAttribute(name);
    else
      node.setAttribute(name, value);
  }
  function setAttributeNS(node, namespace, name, value) {
    if (isHydrating(node))
      return;
    if (value == null)
      node.removeAttributeNS(namespace, name);
    else
      node.setAttributeNS(namespace, name, value);
  }
  function setBoolAttribute(node, name, value) {
    if (isHydrating(node))
      return;
    value ? node.setAttribute(name, "") : node.removeAttribute(name);
  }
  function className(node, value) {
    if (isHydrating(node))
      return;
    if (value == null)
      node.removeAttribute("class");
    else
      node.className = value;
  }
  function addEventListener(node, name, handler, delegate) {
    if (delegate) {
      if (Array.isArray(handler)) {
        node[`$$${name}`] = handler[0];
        node[`$$${name}Data`] = handler[1];
      } else
        node[`$$${name}`] = handler;
    } else if (Array.isArray(handler)) {
      const handlerFn = handler[0];
      node.addEventListener(name, handler[0] = (e) => handlerFn.call(node, handler[1], e));
    } else
      node.addEventListener(name, handler, typeof handler !== "function" && handler);
  }
  function classList(node, value, prev = {}) {
    const classKeys = Object.keys(value || {}), prevKeys = Object.keys(prev);
    let i, len;
    for (i = 0, len = prevKeys.length; i < len; i++) {
      const key = prevKeys[i];
      if (!key || key === "undefined" || value[key])
        continue;
      toggleClassKey(node, key, false);
      delete prev[key];
    }
    for (i = 0, len = classKeys.length; i < len; i++) {
      const key = classKeys[i], classValue = !!value[key];
      if (!key || key === "undefined" || prev[key] === classValue || !classValue)
        continue;
      toggleClassKey(node, key, true);
      prev[key] = classValue;
    }
    return prev;
  }
  function style(node, value, prev) {
    if (!value)
      return prev ? setAttribute(node, "style") : value;
    const nodeStyle = node.style;
    if (typeof value === "string")
      return nodeStyle.cssText = value;
    typeof prev === "string" && (nodeStyle.cssText = prev = void 0);
    prev || (prev = {});
    value || (value = {});
    let v, s;
    for (s in prev) {
      value[s] == null && nodeStyle.removeProperty(s);
      delete prev[s];
    }
    for (s in value) {
      v = value[s];
      if (v !== prev[s]) {
        nodeStyle.setProperty(s, v);
        prev[s] = v;
      }
    }
    return prev;
  }
  function spread(node, props = {}, isSVG, skipChildren) {
    const prevProps = {};
    if (!skipChildren) {
      createRenderEffect(() => prevProps.children = insertExpression(node, props.children, prevProps.children));
    }
    createRenderEffect(() => typeof props.ref === "function" && use(props.ref, node));
    createRenderEffect(() => assign(node, props, isSVG, true, prevProps, true));
    return prevProps;
  }
  function dynamicProperty(props, key) {
    const src = props[key];
    Object.defineProperty(props, key, {
      get() {
        return src();
      },
      enumerable: true
    });
    return props;
  }
  function use(fn, element, arg) {
    return untrack(() => fn(element, arg));
  }
  function insert(parent, accessor, marker, initial) {
    if (marker !== void 0 && !initial)
      initial = [];
    if (typeof accessor !== "function")
      return insertExpression(parent, accessor, initial, marker);
    createRenderEffect((current) => insertExpression(parent, accessor(), current, marker), initial);
  }
  function assign(node, props, isSVG, skipChildren, prevProps = {}, skipRef = false) {
    props || (props = {});
    for (const prop in prevProps) {
      if (!(prop in props)) {
        if (prop === "children")
          continue;
        prevProps[prop] = assignProp(node, prop, null, prevProps[prop], isSVG, skipRef, props);
      }
    }
    for (const prop in props) {
      if (prop === "children") {
        if (!skipChildren)
          insertExpression(node, props.children);
        continue;
      }
      const value = props[prop];
      prevProps[prop] = assignProp(node, prop, value, prevProps[prop], isSVG, skipRef, props);
    }
  }
  function isHydrating(node) {
    return !!sharedConfig.context && !sharedConfig.done && (!node || node.isConnected);
  }
  function toPropertyName(name) {
    return name.toLowerCase().replace(/-([a-z])/g, (_, w) => w.toUpperCase());
  }
  function toggleClassKey(node, key, value) {
    const classNames = key.trim().split(/\s+/);
    for (let i = 0, nameLen = classNames.length; i < nameLen; i++)
      node.classList.toggle(classNames[i], value);
  }
  function assignProp(node, prop, value, prev, isSVG, skipRef, props) {
    let isCE, isProp, isChildProp, propAlias, forceProp;
    if (prop === "style")
      return style(node, value, prev);
    if (prop === "classList")
      return classList(node, value, prev);
    if (value === prev)
      return prev;
    if (prop === "ref") {
      if (!skipRef)
        value(node);
    } else if (prop.slice(0, 3) === "on:") {
      const e = prop.slice(3);
      prev && node.removeEventListener(e, prev, typeof prev !== "function" && prev);
      value && node.addEventListener(e, value, typeof value !== "function" && value);
    } else if (prop.slice(0, 10) === "oncapture:") {
      const e = prop.slice(10);
      prev && node.removeEventListener(e, prev, true);
      value && node.addEventListener(e, value, true);
    } else if (prop.slice(0, 2) === "on") {
      const name = prop.slice(2).toLowerCase();
      const delegate = DelegatedEvents.has(name);
      if (!delegate && prev) {
        const h3 = Array.isArray(prev) ? prev[0] : prev;
        node.removeEventListener(name, h3);
      }
      if (delegate || value) {
        addEventListener(node, name, value, delegate);
        delegate && delegateEvents([name]);
      }
    } else if (prop.slice(0, 5) === "attr:") {
      setAttribute(node, prop.slice(5), value);
    } else if (prop.slice(0, 5) === "bool:") {
      setBoolAttribute(node, prop.slice(5), value);
    } else if ((forceProp = prop.slice(0, 5) === "prop:") || (isChildProp = ChildProperties.has(prop)) || !isSVG && ((propAlias = getPropAlias(prop, node.tagName)) || (isProp = Properties.has(prop))) || (isCE = node.nodeName.includes("-") || "is" in props)) {
      if (forceProp) {
        prop = prop.slice(5);
        isProp = true;
      } else if (isHydrating(node))
        return value;
      if (prop === "class" || prop === "className")
        className(node, value);
      else if (isCE && !isProp && !isChildProp)
        node[toPropertyName(prop)] = value;
      else
        node[propAlias || prop] = value;
    } else {
      const ns = isSVG && prop.indexOf(":") > -1 && SVGNamespace[prop.split(":")[0]];
      if (ns)
        setAttributeNS(node, ns, prop, value);
      else
        setAttribute(node, Aliases[prop] || prop, value);
    }
    return value;
  }
  function eventHandler(e) {
    if (sharedConfig.registry && sharedConfig.events) {
      if (sharedConfig.events.find(([el, ev]) => ev === e))
        return;
    }
    let node = e.target;
    const key = `$$${e.type}`;
    const oriTarget = e.target;
    const oriCurrentTarget = e.currentTarget;
    const retarget = (value) => Object.defineProperty(e, "target", {
      configurable: true,
      value
    });
    const handleNode = () => {
      const handler = node[key];
      if (handler && !node.disabled) {
        const data = node[`${key}Data`];
        data !== void 0 ? handler.call(node, data, e) : handler.call(node, e);
        if (e.cancelBubble)
          return;
      }
      node.host && typeof node.host !== "string" && !node.host._$host && node.contains(e.target) && retarget(node.host);
      return true;
    };
    const walkUpTree = () => {
      while (handleNode() && (node = node._$host || node.parentNode || node.host))
        ;
    };
    Object.defineProperty(e, "currentTarget", {
      configurable: true,
      get() {
        return node || document;
      }
    });
    if (sharedConfig.registry && !sharedConfig.done)
      sharedConfig.done = _$HY.done = true;
    if (e.composedPath) {
      const path = e.composedPath();
      retarget(path[0]);
      for (let i = 0; i < path.length - 2; i++) {
        node = path[i];
        if (!handleNode())
          break;
        if (node._$host) {
          node = node._$host;
          walkUpTree();
          break;
        }
        if (node.parentNode === oriCurrentTarget) {
          break;
        }
      }
    } else
      walkUpTree();
    retarget(oriTarget);
  }
  function insertExpression(parent, value, current, marker, unwrapArray) {
    const hydrating = isHydrating(parent);
    if (hydrating) {
      !current && (current = [...parent.childNodes]);
      let cleaned = [];
      for (let i = 0; i < current.length; i++) {
        const node = current[i];
        if (node.nodeType === 8 && node.data.slice(0, 2) === "!$")
          node.remove();
        else
          cleaned.push(node);
      }
      current = cleaned;
    }
    while (typeof current === "function")
      current = current();
    if (value === current)
      return current;
    const t = typeof value, multi = marker !== void 0;
    parent = multi && current[0] && current[0].parentNode || parent;
    if (t === "string" || t === "number") {
      if (hydrating)
        return current;
      if (t === "number") {
        value = value.toString();
        if (value === current)
          return current;
      }
      if (multi) {
        let node = current[0];
        if (node && node.nodeType === 3) {
          node.data !== value && (node.data = value);
        } else
          node = document.createTextNode(value);
        current = cleanChildren(parent, current, marker, node);
      } else {
        if (current !== "" && typeof current === "string") {
          current = parent.firstChild.data = value;
        } else
          current = parent.textContent = value;
      }
    } else if (value == null || t === "boolean") {
      if (hydrating)
        return current;
      current = cleanChildren(parent, current, marker);
    } else if (t === "function") {
      createRenderEffect(() => {
        let v = value();
        while (typeof v === "function")
          v = v();
        current = insertExpression(parent, v, current, marker);
      });
      return () => current;
    } else if (Array.isArray(value)) {
      const array = [];
      const currentArray = current && Array.isArray(current);
      if (normalizeIncomingArray(array, value, current, unwrapArray)) {
        createRenderEffect(() => current = insertExpression(parent, array, current, marker, true));
        return () => current;
      }
      if (hydrating) {
        if (!array.length)
          return current;
        if (marker === void 0)
          return current = [...parent.childNodes];
        let node = array[0];
        if (node.parentNode !== parent)
          return current;
        const nodes = [node];
        while ((node = node.nextSibling) !== marker)
          nodes.push(node);
        return current = nodes;
      }
      if (array.length === 0) {
        current = cleanChildren(parent, current, marker);
        if (multi)
          return current;
      } else if (currentArray) {
        if (current.length === 0) {
          appendNodes(parent, array, marker);
        } else
          reconcileArrays(parent, current, array);
      } else {
        current && cleanChildren(parent);
        appendNodes(parent, array);
      }
      current = array;
    } else if (value.nodeType) {
      if (hydrating && value.parentNode)
        return current = multi ? [value] : value;
      if (Array.isArray(current)) {
        if (multi)
          return current = cleanChildren(parent, current, marker, value);
        cleanChildren(parent, current, null, value);
      } else if (current == null || current === "" || !parent.firstChild) {
        parent.appendChild(value);
      } else
        parent.replaceChild(value, parent.firstChild);
      current = value;
    } else
      ;
    return current;
  }
  function normalizeIncomingArray(normalized, array, current, unwrap) {
    let dynamic = false;
    for (let i = 0, len = array.length; i < len; i++) {
      let item = array[i], prev = current && current[normalized.length], t;
      if (item == null || item === true || item === false)
        ;
      else if ((t = typeof item) === "object" && item.nodeType) {
        normalized.push(item);
      } else if (Array.isArray(item)) {
        dynamic = normalizeIncomingArray(normalized, item, prev) || dynamic;
      } else if (t === "function") {
        if (unwrap) {
          while (typeof item === "function")
            item = item();
          dynamic = normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item], Array.isArray(prev) ? prev : [prev]) || dynamic;
        } else {
          normalized.push(item);
          dynamic = true;
        }
      } else {
        const value = String(item);
        if (prev && prev.nodeType === 3 && prev.data === value)
          normalized.push(prev);
        else
          normalized.push(document.createTextNode(value));
      }
    }
    return dynamic;
  }
  function appendNodes(parent, array, marker = null) {
    for (let i = 0, len = array.length; i < len; i++)
      parent.insertBefore(array[i], marker);
  }
  function cleanChildren(parent, current, marker, replacement) {
    if (marker === void 0)
      return parent.textContent = "";
    const node = replacement || document.createTextNode("");
    if (current.length) {
      let inserted = false;
      for (let i = current.length - 1; i >= 0; i--) {
        const el = current[i];
        if (node !== el) {
          const isParent = el.parentNode === parent;
          if (!inserted && !i)
            isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);
          else
            isParent && el.remove();
        } else
          inserted = true;
      }
    } else
      parent.insertBefore(node, marker);
    return [node];
  }
  var RequestContext = Symbol();

  // node_modules/solid-js/h/dist/h.js
  var $ELEMENT = Symbol("hyper-element");
  function createHyperScript(r) {
    function h3() {
      let args = [].slice.call(arguments), e, classes = [], multiExpression = false;
      while (Array.isArray(args[0]))
        args = args[0];
      if (args[0][$ELEMENT])
        args.unshift(h3.Fragment);
      typeof args[0] === "string" && detectMultiExpression(args);
      const ret = () => {
        while (args.length)
          item(args.shift());
        if (e instanceof Element && classes.length)
          e.classList.add(...classes);
        return e;
      };
      ret[$ELEMENT] = true;
      return ret;
      function item(l) {
        const type = typeof l;
        if (l == null)
          ;
        else if ("string" === type) {
          if (!e)
            parseClass(l);
          else
            e.appendChild(document.createTextNode(l));
        } else if ("number" === type || "boolean" === type || "bigint" === type || "symbol" === type || l instanceof Date || l instanceof RegExp) {
          e.appendChild(document.createTextNode(l.toString()));
        } else if (Array.isArray(l)) {
          for (let i = 0; i < l.length; i++)
            item(l[i]);
        } else if (l instanceof Element) {
          r.insert(e, l, multiExpression ? null : void 0);
        } else if ("object" === type) {
          let dynamic = false;
          const d = Object.getOwnPropertyDescriptors(l);
          for (const k in d) {
            if (k === "class" && classes.length !== 0) {
              const fixedClasses = classes.join(" "), value = typeof d["class"].value === "function" ? () => fixedClasses + " " + d["class"].value() : fixedClasses + " " + l["class"];
              Object.defineProperty(l, "class", {
                ...d[k],
                value
              });
              classes = [];
            }
            if (k !== "ref" && k.slice(0, 2) !== "on" && typeof d[k].value === "function") {
              r.dynamicProperty(l, k);
              dynamic = true;
            } else if (d[k].get)
              dynamic = true;
          }
          dynamic ? r.spread(e, l, e instanceof SVGElement, !!args.length) : r.assign(e, l, e instanceof SVGElement, !!args.length);
        } else if ("function" === type) {
          if (!e) {
            let props, next = args[0];
            if (next == null || typeof next === "object" && !Array.isArray(next) && !(next instanceof Element))
              props = args.shift();
            props || (props = {});
            if (args.length) {
              props.children = args.length > 1 ? args : args[0];
            }
            const d = Object.getOwnPropertyDescriptors(props);
            for (const k in d) {
              if (Array.isArray(d[k].value)) {
                const list = d[k].value;
                props[k] = () => {
                  for (let i = 0; i < list.length; i++) {
                    while (list[i][$ELEMENT])
                      list[i] = list[i]();
                  }
                  return list;
                };
                r.dynamicProperty(props, k);
              } else if (typeof d[k].value === "function" && !d[k].value.length)
                r.dynamicProperty(props, k);
            }
            e = r.createComponent(l, props);
            args = [];
          } else {
            while (l[$ELEMENT])
              l = l();
            r.insert(e, l, multiExpression ? null : void 0);
          }
        }
      }
      function parseClass(string) {
        const m = string.split(/([\.#]?[^\s#.]+)/);
        if (/^\.|#/.test(m[1]))
          e = document.createElement("div");
        for (let i = 0; i < m.length; i++) {
          const v = m[i], s = v.substring(1, v.length);
          if (!v)
            continue;
          if (!e)
            e = r.SVGElements.has(v) ? document.createElementNS("http://www.w3.org/2000/svg", v) : document.createElement(v);
          else if (v[0] === ".")
            classes.push(s);
          else if (v[0] === "#")
            e.setAttribute("id", s);
        }
      }
      function detectMultiExpression(list) {
        for (let i = 1; i < list.length; i++) {
          if (typeof list[i] === "function") {
            multiExpression = true;
            return;
          } else if (Array.isArray(list[i])) {
            detectMultiExpression(list[i]);
          }
        }
      }
    }
    h3.Fragment = (props) => props.children;
    return h3;
  }
  var h2 = createHyperScript({
    spread,
    assign,
    insert,
    createComponent,
    dynamicProperty,
    SVGElements
  });

  // src/webview/jsx-shim.js
  var h = h2;

  // src/webview/components/Button.tsx
  function Button(props) {
    const variant = props.variant || "secondary";
    const size = props.size || "md";
    const disabled = props.disabled || props.loading;
    const baseStyle = {
      display: "inline-flex",
      "align-items": "center",
      "justify-content": "center",
      gap: "4px",
      "font-family": "var(--vscode-font-family)",
      "font-size": "var(--vscode-font-size)",
      "font-weight": "500",
      "line-height": "var(--vscode-line-height)",
      border: "1px solid transparent",
      "border-radius": "3px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? "0.5" : "1",
      transition: "background-color 80ms ease, border-color 80ms ease, color 80ms ease",
      "white-space": "nowrap",
      "user-select": "none",
      outline: "none",
      "-webkit-font-smoothing": "antialiased"
    };
    const sizeStyles = {
      sm: {
        height: "22px",
        padding: "0 8px",
        "font-size": "11px"
      },
      md: {
        height: "28px",
        padding: "0 12px",
        "font-size": "var(--vscode-font-size)"
      },
      lg: {
        height: "32px",
        padding: "0 16px",
        "font-size": "var(--vscode-font-size)"
      }
    };
    const variantStyles2 = {
      primary: {
        background: "var(--vscode-button-background)",
        color: "var(--vscode-button-foreground)",
        "border-color": "transparent"
      },
      secondary: {
        background: "var(--vscode-button-secondaryBackground)",
        color: "var(--vscode-button-secondaryForeground)",
        "border-color": "var(--vscode-button-border)"
      },
      ghost: {
        background: "transparent",
        color: "var(--vscode-button-secondaryForeground)",
        "border-color": "transparent"
      },
      danger: {
        background: "var(--vscode-inputValidation-errorBackground)",
        color: "var(--vscode-inputValidation-errorForeground)",
        "border-color": "transparent"
      }
    };
    const combinedStyle = {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles2[variant],
      ...props.style || {}
    };
    const handleClick = (e) => {
      if (!disabled)
        props.onClick?.(e);
    };
    const handleKeyDown = (e) => {
      if (!disabled && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        handleClick(e);
      }
    };
    return /* @__PURE__ */ h(
      "button",
      {
        style: combinedStyle,
        class: props.class || "",
        disabled,
        onClick: handleClick,
        onKeyDown: handleKeyDown,
        title: props.title,
        "aria-label": props["aria-label"],
        "data-testid": props["data-testid"],
        tabIndex: disabled ? -1 : 0
      },
      props.loading ? /* @__PURE__ */ h(
        "span",
        {
          style: {
            width: "12px",
            height: "12px",
            border: "2px solid currentColor",
            "border-top-color": "transparent",
            "border-radius": "50%",
            animation: "spin 600ms linear infinite",
            display: "inline-block"
          },
          "aria-hidden": "true"
        }
      ) : props.icon ? /* @__PURE__ */ h("span", { style: { display: "flex", "align-items": "center" }, "aria-hidden": "true" }, props.icon) : null,
      props.children
    );
  }

  // src/webview/components/Card.tsx
  var paddingValues = {
    none: "0",
    sm: "6px",
    md: "8px",
    lg: "12px"
  };
  function Panel(props) {
    const variant = props.variant || "default";
    const pad = props.padding || "md";
    const baseStyle = {
      "font-family": "var(--vscode-font-family)",
      "font-size": "var(--vscode-font-size)",
      "line-height": "var(--vscode-line-height)",
      color: "var(--vscode-editor-foreground)",
      background: "var(--vscode-editor-background)",
      padding: paddingValues[pad],
      ...props.style || {}
    };
    const variantStyles2 = {
      default: {
        border: "none"
      },
      inset: {
        background: "var(--vscode-textBlockQuote-background)",
        border: "none"
      },
      bordered: {
        border: "1px solid var(--vscode-panel-border)",
        background: "var(--vscode-panel-background)"
      }
    };
    const combinedStyle = {
      ...baseStyle,
      ...variantStyles2[variant]
    };
    const handleClick = (e) => {
      props.onClick?.(e);
    };
    const handleKeyDown = (e) => {
      if (props.onClick && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        props.onClick(e);
      }
    };
    const isInteractive = !!props.onClick;
    return /* @__PURE__ */ h(
      "div",
      {
        style: combinedStyle,
        class: props.class || "",
        onClick: handleClick,
        onKeyDown: handleKeyDown,
        tabIndex: isInteractive ? 0 : void 0,
        role: isInteractive ? "button" : void 0
      },
      props.children
    );
  }

  // src/webview/components/Badge.tsx
  var variantStyles = {
    critical: {
      background: "var(--vscode-testing-iconFailed)",
      color: "var(--vscode-editor-background)"
    },
    high: {
      background: "var(--vscode-testing-iconErrored)",
      color: "var(--vscode-editor-background)"
    },
    medium: {
      background: "var(--vscode-testing-iconQueued)",
      color: "var(--vscode-editor-background)"
    },
    low: {
      background: "var(--vscode-testing-iconPassed)",
      color: "var(--vscode-editor-background)"
    },
    info: {
      background: "var(--vscode-badge-background)",
      color: "var(--vscode-badge-foreground)"
    },
    none: {
      background: "var(--vscode-badge-background)",
      color: "var(--vscode-badge-foreground)"
    },
    default: {
      background: "var(--vscode-badge-background)",
      color: "var(--vscode-badge-foreground)"
    },
    success: {
      background: "var(--vscode-testing-iconPassed)",
      color: "var(--vscode-editor-background)"
    },
    warning: {
      background: "var(--vscode-testing-iconQueued)",
      color: "var(--vscode-editor-background)"
    },
    danger: {
      background: "var(--vscode-testing-iconFailed)",
      color: "var(--vscode-editor-background)"
    }
  };
  function Badge(props) {
    const variant = props.variant || "default";
    const size = props.size || "md";
    const styles = variantStyles[variant];
    const baseStyle = {
      display: "inline-flex",
      "align-items": "center",
      gap: size === "sm" ? "3px" : "4px",
      padding: size === "sm" ? "1px 5px" : "2px 6px",
      "font-family": "var(--vscode-font-family)",
      "font-size": size === "sm" ? "10px" : "var(--vscode-font-size)",
      "line-height": size === "sm" ? "1.2" : "var(--vscode-line-height)",
      "font-weight": "500",
      "border-radius": "2px",
      "white-space": "nowrap",
      "user-select": "none",
      "-webkit-font-smoothing": "antialiased",
      ...styles,
      ...props.style || {}
    };
    return /* @__PURE__ */ h("span", { style: baseStyle, class: props.class || "", role: "status" }, props.dot && /* @__PURE__ */ h(
      "span",
      {
        style: {
          width: "4px",
          height: "4px",
          "border-radius": "50%",
          background: "currentColor",
          "flex-shrink": "0"
        },
        "aria-hidden": "true"
      }
    ), props.children);
  }

  // src/webview/design-system/icons.tsx
  var CODICONS = {
    // Core
    shield: "\uEAD9",
    search: "\uEA84",
    plus: "\uEA8B",
    settings: "\uE73D",
    bug: "\uE7A6",
    graph: "\uE9E6",
    clock: "\uE94B",
    eye: "\uE74E",
    check: "\uE73E",
    x: "\uE8CE",
    alert: "\uE7BA",
    terminal: "\uE751",
    brain: "\uE9E6",
    fileCode: "\uEAF6",
    arrowRight: "\uEAB2",
    copy: "\uEABF",
    download: "\uE770",
    play: "\uE74E",
    pause: "\uE74D",
    stop: "\uE75B",
    maximize: "\uE741",
    minimize: "\uE740",
    refresh: "\uE72D",
    filter: "\uE795",
    externalLink: "\uE8A7",
    target: "\uE759",
    server: "\uE760",
    file: "\uE8A5",
    message: "\uE74C",
    send: "\uE88F",
    loader: "\uE78C",
    history: "\uE77C",
    trash: "\uE8ED",
    tag: "\uE8BE",
    pin: "\uE8B4",
    more: "\uE7A9",
    zap: "\uE7D8",
    bookmark: "\uE8B1",
    star: "\uE8C3",
    bell: "\uE7CE",
    gear: "\uE73D",
    key: "\uE7C9",
    lock: "\uE72E",
    unlock: "\uE8F6",
    warning: "\uE7BA",
    error: "\uE7BA",
    info: "\uE7BD",
    success: "\uE73E",
    debug: "\uE7D4",
    output: "\uE7D2",
    terminalIcon: "\uE751",
    test: "\uE7D3",
    testPassed: "\uE73E",
    testFailed: "\uE7BA",
    testQueued: "\uE78C",
    testRunning: "\uE78C",
    run: "\uE74E",
    runAll: "\uE74E",
    stopCircle: "\uE75B",
    restart: "\uE72D",
    github: "\uE80A",
    gitBranch: "\uE725",
    gitCommit: "\uE729",
    gitMerge: "\uE727",
    gitPullRequest: "\uE72B",
    gitCompare: "\uE72B",
    sync: "\uE72D",
    cloud: "\uE753",
    cloudDownload: "\uE754",
    cloudUpload: "\uE755",
    database: "\uE756",
    container: "\uE757",
    vm: "\uE758",
    device: "\uE759",
    mobile: "\uE75A",
    desktop: "\uE75B",
    browser: "\uE75C",
    extension: "\uE75D",
    marketplace: "\uE75E",
    account: "\uE70B",
    organization: "\uE70C",
    team: "\uE70D",
    user: "\uE70B",
    users: "\uE70C",
    mail: "\uE70E",
    comment: "\uE7F9",
    discussion: "\uE7FA",
    mention: "\uE7FB",
    review: "\uE7FC",
    approved: "\uE73E",
    rejected: "\uE7BA",
    changesRequested: "\uE7BA",
    pending: "\uE78C",
    draft: "\uE78C",
    merged: "\uE73E",
    closed: "\uE7BA",
    open: "\uE73E",
    milestone: "\uE7B1",
    label: "\uE8BE",
    assignee: "\uE70B",
    reviewer: "\uE70B",
    linked: "\uE7F7",
    branch: "\uE725",
    commit: "\uE729",
    tagV2: "\uE8BF",
    release: "\uE8C0",
    package: "\uE75D",
    dependency: "\uE7F7",
    npm: "\uE75D",
    yarn: "\uE75D",
    docker: "\uE75D",
    kubernetes: "\uE75D",
    helm: "\uE75D",
    terraform: "\uE75D",
    ansible: "\uE75D",
    jenkins: "\uE75D",
    githubActions: "\uE75D",
    circleci: "\uE75D",
    travis: "\uE75D",
    azureDevOps: "\uE75D",
    bitbucket: "\uE75D",
    gitlab: "\uE75D",
    sourceControl: "\uE725",
    changes: "\uE729",
    staged: "\uE729",
    unstaged: "\uE729",
    conflict: "\uE7BA",
    resolved: "\uE73E",
    ignored: "\uE78C",
    untracked: "\uE78C",
    submodule: "\uE75D",
    stash: "\uE75D",
    cherryPick: "\uE75D",
    rebase: "\uE75D",
    merge: "\uE727",
    squash: "\uE75D",
    amend: "\uE75D",
    reset: "\uE75D",
    revert: "\uE75D",
    bisect: "\uE75D",
    blame: "\uE75D",
    log: "\uE75D",
    show: "\uE75D",
    diff: "\uE75D",
    patch: "\uE75D",
    apply: "\uE75D",
    format: "\uE75D",
    lint: "\uE75D",
    build: "\uE75D",
    deploy: "\uE75D",
    publish: "\uE75D",
    install: "\uE75D",
    update: "\uE75D",
    remove: "\uE8ED",
    add: "\uEA8B",
    edit: "\uE77B",
    delete: "\uE8ED",
    rename: "\uE75D",
    move: "\uE75D",
    paste: "\uE75D",
    cut: "\uE75D",
    select: "\uE75D",
    selectAll: "\uE75D",
    find: "\uEA84",
    replace: "\uE75D",
    goTo: "\uE75D",
    goToLine: "\uE75D",
    goToFile: "\uE75D",
    goToSymbol: "\uE75D",
    goToDefinition: "\uE75D",
    goToReferences: "\uE75D",
    goToImplementation: "\uE75D",
    goToTypeDefinition: "\uE75D",
    peek: "\uE75D",
    hover: "\uE75D",
    signature: "\uE75D",
    completion: "\uE75D",
    parameter: "\uE75D",
    signatureHelp: "\uE75D",
    quickFix: "\uE75D",
    refactor: "\uE75D",
    extract: "\uE75D",
    inline: "\uE75D",
    convert: "\uE75D",
    generate: "\uE75D",
    organize: "\uE75D",
    sort: "\uE75D",
    fold: "\uE75D",
    unfold: "\uE75D",
    foldAll: "\uE75D",
    unfoldAll: "\uE75D",
    uncomment: "\uE75D",
    toggleComment: "\uE75D",
    blockComment: "\uE75D",
    lineComment: "\uE75D",
    indent: "\uE75D",
    outdent: "\uE75D",
    trim: "\uE75D",
    join: "\uE75D",
    split: "\uE75D",
    duplicate: "\uE75D",
    deleteLine: "\uE75D",
    moveLine: "\uE75D",
    copyLine: "\uE75D",
    insertLine: "\uE75D",
    insertLineBefore: "\uE75D",
    insertLineAfter: "\uE75D",
    selectLine: "\uE75D",
    expandSelection: "\uE75D",
    shrinkSelection: "\uE75D",
    columnSelection: "\uE75D",
    cursor: "\uE75D",
    multiCursor: "\uE75D",
    findAll: "\uE75D",
    replaceAll: "\uE75D",
    matchCase: "\uE75D",
    matchWord: "\uE75D",
    regex: "\uE75D",
    preserveCase: "\uE75D",
    wholeWord: "\uE75D",
    searchScope: "\uE75D",
    searchHistory: "\uE75D",
    searchResults: "\uE75D",
    searchFile: "\uE75D",
    searchFolder: "\uE75D",
    searchWorkspace: "\uE75D",
    searchAll: "\uE75D",
    searchNext: "\uE75D",
    searchPrevious: "\uE75D",
    clearSearch: "\uE75D",
    group: "\uE75D",
    view: "\uE74E",
    layout: "\uE75D",
    splitEditor: "\uE75D",
    joinEditor: "\uE75D",
    focusEditor: "\uE75D",
    closeEditor: "\uE75D",
    closeAllEditors: "\uE75D",
    closeOtherEditors: "\uE75D",
    closeEditorsToLeft: "\uE75D",
    closeEditorsToRight: "\uE75D",
    closeSavedEditors: "\uE75D",
    closeUnsavedEditors: "\uE75D",
    reopenClosedEditor: "\uE75D",
    keepEditor: "\uE75D",
    openNextEditor: "\uE75D",
    openPreviousEditor: "\uE75D",
    openRecent: "\uE75D",
    quickOpen: "\uE75D",
    quickOpenFile: "\uE75D",
    quickOpenSymbol: "\uE75D",
    quickOpenLine: "\uE75D",
    quickOpenView: "\uE75D",
    quickOpenCommand: "\uE75D",
    quickOpenSetting: "\uE75D",
    quickOpenTheme: "\uE75D",
    quickOpenSnippet: "\uE75D",
    quickOpenKeybinding: "\uE75D",
    quickOpenExtension: "\uE75D",
    quickOpenWorkspace: "\uE75D",
    quickOpenFolder: "\uE75D",
    quickOpenFileInFolder: "\uE75D",
    quickOpenFileInWorkspace: "\uE75D",
    quickOpenFileInProject: "\uE75D",
    quickOpenFileInSolution: "\uE75D",
    quickOpenFileInGit: "\uE75D",
    quickOpenFileInHistory: "\uE75D",
    quickOpenFileInSearch: "\uE75D",
    quickOpenFileInExplorer: "\uE75D",
    quickOpenFileInTerminal: "\uE75D",
    quickOpenFileInDebug: "\uE75D",
    quickOpenFileInTest: "\uE75D",
    quickOpenFileInProblems: "\uE75D",
    quickOpenFileInOutput: "\uE75D",
    quickOpenFileInConsole: "\uE75D",
    quickOpenFileInDebugConsole: "\uE75D",
    quickOpenFileInIntegratedTerminal: "\uE75D",
    quickOpenFileInExternalTerminal: "\uE75D",
    quickOpenFileInSSH: "\uE75D",
    quickOpenFileInWSL: "\uE75D",
    quickOpenFileInContainer: "\uE75D",
    quickOpenFileInCodespace: "\uE75D",
    quickOpenFileInRemote: "\uE75D",
    quickOpenFileInTunnel: "\uE75D",
    quickOpenFileInPortForward: "\uE75D",
    quickOpenFileInDevContainer: "\uE75D",
    quickOpenFileInGitHubCodespace: "\uE75D",
    quickOpenFileInGitHubRepository: "\uE75D",
    quickOpenFileInGitHubGist: "\uE75D",
    quickOpenFileInGitHubWiki: "\uE75D",
    quickOpenFileInGitHubPages: "\uE75D",
    quickOpenFileInGitHubActions: "\uE75D",
    quickOpenFileInGitHubPackages: "\uE75D",
    quickOpenFileInGitHubProjects: "\uE75D",
    quickOpenFileInGitHubIssues: "\uE75D",
    quickOpenFileInGitHubPullRequests: "\uE75D",
    quickOpenFileInGitHubDiscussions: "\uE75D",
    quickOpenFileInGitHubWikis: "\uE75D",
    quickOpenFileInGitHubReleases: "\uE75D",
    quickOpenFileInGitHubTags: "\uE75D",
    quickOpenFileInGitHubCommits: "\uE75D",
    quickOpenFileInGitHubBranches: "\uE75D",
    quickOpenFileInGitHubForks: "\uE75D",
    quickOpenFileInGitHubStars: "\uE75D",
    quickOpenFileInGitHubWatchers: "\uE75D",
    quickOpenFileInGitHubFollowers: "\uE75D",
    quickOpenFileInGitHubFollowing: "\uE75D",
    quickOpenFileInGitHubOrganizations: "\uE75D",
    quickOpenFileInGitHubTeams: "\uE75D",
    quickOpenFileInGitHubRepositories: "\uE75D",
    quickOpenFileInGitHubTopics: "\uE75D",
    quickOpenFileInGitHubLabels: "\uE75D",
    quickOpenFileInGitHubMilestones: "\uE75D",
    quickOpenFileInGitHubAssignees: "\uE75D",
    quickOpenFileInGitHubReviewers: "\uE75D",
    quickOpenFileInGitHubApprovals: "\uE75D",
    quickOpenFileInGitHubChanges: "\uE75D",
    quickOpenFileInGitHubChecks: "\uE75D",
    quickOpenFileInGitHubStatus: "\uE75D",
    quickOpenFileInGitHubWorkflows: "\uE75D"
  };
  function createIcon(name) {
    return function Icon(props = {}) {
      const { size = 16, class: className2, style: style2 = {}, "aria-hidden": ariaHidden = true } = props;
      return /* @__PURE__ */ h(
        "span",
        {
          className: className2,
          style: {
            display: "inline-flex",
            "align-items": "center",
            "justify-content": "center",
            width: size,
            height: size,
            "font-family": '"codicon"',
            "font-size": size,
            "font-style": "normal",
            "font-weight": "normal",
            "font-variant": "normal",
            "text-rendering": "auto",
            "line-height": 1,
            "-webkit-font-smoothing": "antialiased",
            ...style2
          },
          "aria-hidden": ariaHidden
        },
        CODICONS[name] || CODICONS.shield
      );
    };
  }
  var IconShield = createIcon("shield");
  var IconSearch = createIcon("search");
  var IconPlus = createIcon("plus");
  var IconSettings = createIcon("settings");
  var IconBug = createIcon("bug");
  var IconGraph = createIcon("graph");
  var IconClock = createIcon("clock");
  var IconEye = createIcon("eye");
  var IconCheck = createIcon("check");
  var IconX = createIcon("x");
  var IconAlert = createIcon("alert");
  var IconAlertCircle = createIcon("alert");
  var IconTerminal = createIcon("terminal");
  var IconBrain = createIcon("brain");
  var IconFileCode = createIcon("fileCode");
  var IconArrowRight = createIcon("arrowRight");
  var IconCopy = createIcon("copy");
  var IconDownload = createIcon("download");
  var IconPlay = createIcon("play");
  var IconPause = createIcon("pause");
  var IconStop = createIcon("stop");
  var IconMaximize = createIcon("maximize");
  var IconMinimize = createIcon("minimize");
  var IconRefreshCw = createIcon("refresh");
  var IconFilter = createIcon("filter");
  var IconExternalLink = createIcon("externalLink");
  var IconTarget = createIcon("target");
  var IconServer = createIcon("server");
  var IconFile = createIcon("file");
  var IconMessage = createIcon("message");
  var IconSend = createIcon("send");
  var IconLoader = createIcon("loader");
  var IconHistory = createIcon("history");
  var IconTrash2 = createIcon("trash");
  var IconTag = createIcon("tag");
  var IconPin = createIcon("pin");
  var IconMoreHorizontal = createIcon("more");
  var IconZap = createIcon("zap");
  var IconBookmark = createIcon("bookmark");
  var IconStar = createIcon("star");
  var IconBell = createIcon("bell");
  var IconGear = createIcon("gear");
  var IconKey = createIcon("key");
  var IconLock = createIcon("lock");
  var IconUnlock = createIcon("unlock");
  var IconWarning = createIcon("warning");
  var IconError = createIcon("error");
  var IconInfo = createIcon("info");
  var IconSuccess = createIcon("success");
  var IconDollar = createIcon("dollar");
  var IconGlobe = createIcon("globe");
  var IconActivity = createIcon("activity");
  var IconDebug = createIcon("debug");
  var IconOutput = createIcon("output");
  var IconTest = createIcon("test");
  var IconTestPassed = createIcon("testPassed");
  var IconTestFailed = createIcon("testFailed");
  var IconTestQueued = createIcon("testQueued");
  var IconTestRunning = createIcon("testRunning");
  var IconRun = createIcon("run");
  var IconRunAll = createIcon("runAll");
  var IconStopCircle = createIcon("stopCircle");
  var IconRestart = createIcon("restart");
  var IconGitHub = createIcon("github");
  var IconGitBranch = createIcon("gitBranch");
  var IconGitCommit = createIcon("gitCommit");
  var IconGitMerge = createIcon("gitMerge");
  var IconGitPullRequest = createIcon("gitPullRequest");
  var IconSync = createIcon("sync");
  var IconCloud = createIcon("cloud");
  var IconContainer = createIcon("container");
  var IconVM = createIcon("vm");
  var IconDevice = createIcon("device");
  var IconMobile = createIcon("mobile");
  var IconDesktop = createIcon("desktop");
  var IconBrowser = createIcon("browser");
  var IconExtension = createIcon("extension");
  var IconMarketplace = createIcon("marketplace");
  var IconAccount = createIcon("account");
  var IconOrganization = createIcon("organization");
  var IconTeam = createIcon("team");
  var IconUser = createIcon("user");
  var IconUsers = createIcon("users");
  var IconMail = createIcon("mail");
  var IconComment = createIcon("comment");
  var IconDiscussion = createIcon("discussion");
  var IconMention = createIcon("mention");
  var IconReview = createIcon("review");
  var IconApproved = createIcon("approved");
  var IconRejected = createIcon("rejected");
  var IconChangesRequested = createIcon("changesRequested");
  var IconPending = createIcon("pending");
  var IconDraft = createIcon("draft");
  var IconMerged = createIcon("merged");
  var IconClosed = createIcon("closed");
  var IconOpen = createIcon("open");
  var IconMilestone = createIcon("milestone");
  var IconLabel = createIcon("label");
  var IconAssignee = createIcon("assignee");
  var IconReviewer = createIcon("reviewer");
  var IconLinked = createIcon("linked");
  var IconBranch = createIcon("branch");
  var IconCommit = createIcon("commit");
  var IconRelease = createIcon("release");
  var IconPackage = createIcon("package");
  var IconDependency = createIcon("dependency");
  var IconNpm = createIcon("npm");
  var IconYarn = createIcon("yarn");
  var IconDocker = createIcon("docker");
  var IconKubernetes = createIcon("kubernetes");
  var IconHelm = createIcon("helm");
  var IconTerraform = createIcon("terraform");
  var IconAnsible = createIcon("ansible");
  var IconJenkins = createIcon("jenkins");
  var IconGitHubActions = createIcon("githubActions");
  var IconCircleCI = createIcon("circleci");
  var IconTravis = createIcon("travis");
  var IconAzureDevOps = createIcon("azureDevOps");
  var IconBitbucket = createIcon("bitbucket");
  var IconGitLab = createIcon("gitlab");

  // src/webview/design-system/tokens.css
  var tokens_default = "/* ===========================================================================\n   SIREEN \u2014 VS Code Native Design Tokens\n   ===========================================================================\n   Uses ONLY official VS Code theme tokens.\n   No custom colors, spacing, or typography.\n   Works automatically with: Dark+, Light+, High Contrast, Custom themes.\n   =========================================================================== */\n\n:root {\n  /* ------------------------------------------------------------------ */\n  /*  Colors \u2014 VS Code Theme Tokens                                     */\n  /* ------------------------------------------------------------------ */\n  --color-bg-primary: var(--vscode-editor-background);\n  --color-bg-secondary: var(--vscode-sideBar-background);\n  --color-bg-tertiary: var(--vscode-sideBarSectionHeader-background);\n  --color-bg-elevated: var(--vscode-editor-background);\n  --color-bg-hover: var(--vscode-list-hoverBackground);\n  --color-bg-active: var(--vscode-list-activeSelectionBackground);\n  --color-bg-input: var(--vscode-input-background);\n  --color-bg-card: var(--vscode-editor-background);\n  --color-bg-sidebar: var(--vscode-sideBar-background);\n  --color-bg-inset: var(--vscode-textBlockQuote-background);\n\n  --color-border: var(--vscode-panel-border);\n  --color-border-light: var(--vscode-sideBar-border);\n  --color-border-hover: var(--vscode-focusBorder);\n  --color-border-focus: var(--vscode-focusBorder);\n\n  --color-text-primary: var(--vscode-editor-foreground);\n  --color-text-secondary: var(--vscode-descriptionForeground);\n  --color-text-tertiary: var(--vscode-descriptionForeground);\n  --color-text-inverse: var(--vscode-editor-background);\n  --color-text-link: var(--vscode-textLink-foreground);\n\n  --color-accent: var(--vscode-button-background);\n  --color-accent-hover: var(--vscode-button-hoverBackground);\n  --color-accent-soft: var(--vscode-button-secondaryBackground);\n  --color-accent-soft-hover: var(--vscode-button-secondaryHoverBackground);\n\n  --color-danger: var(--vscode-inputValidation-errorBackground);\n  --color-danger-hover: var(--vscode-inputValidation-errorBorder);\n  --color-danger-soft: var(--vscode-inputValidation-errorBackground);\n  --color-warning: var(--vscode-inputValidation-warningBackground);\n  --color-warning-soft: var(--vscode-inputValidation-warningBackground);\n  --color-success: var(--vscode-testing-iconPassed);\n  --color-success-soft: var(--vscode-testing-iconPassed);\n  --color-info: var(--vscode-textLink-foreground);\n  --color-info-soft: var(--vscode-textLink-foreground);\n\n  --color-severity-critical: var(--vscode-testing-iconFailed);\n  --color-severity-high: var(--vscode-testing-iconErrored);\n  --color-severity-medium: var(--vscode-testing-iconQueued);\n  --color-severity-low: var(--vscode-testing-iconPassed);\n  --color-severity-info: var(--vscode-descriptionForeground);\n\n  --color-focus-ring: var(--vscode-focusBorder);\n\n  --color-scrollbar-thumb: var(--vscode-scrollbarSlider-background);\n  --color-scrollbar-thumb-hover: var(--vscode-scrollbarSlider-hoverBackground);\n  --color-scrollbar-track: var(--vscode-scrollbarSlider-background);\n\n  --color-skeleton: var(--vscode-progressBar-background);\n  --color-skeleton-shimmer: var(--vscode-progressBar-background);\n\n  --color-overlay: var(--vscode-editorWidget-background);\n\n  /* Button variants using VS Code tokens */\n  --color-button-primary-bg: var(--vscode-button-background);\n  --color-button-primary-fg: var(--vscode-button-foreground);\n  --color-button-primary-hover: var(--vscode-button-hoverBackground);\n\n  --color-button-secondary-bg: var(--vscode-button-secondaryBackground);\n  --color-button-secondary-fg: var(--vscode-button-secondaryForeground);\n  --color-button-secondary-hover: var(--vscode-button-secondaryHoverBackground);\n  --color-button-secondary-border: var(--vscode-button-border);\n\n  --color-button-ghost-bg: transparent;\n  --color-button-ghost-fg: var(--vscode-button-secondaryForeground);\n  --color-button-ghost-hover: var(--vscode-button-secondaryHoverBackground);\n\n  --color-button-danger-bg: var(--vscode-inputValidation-errorBackground);\n  --color-button-danger-fg: var(--vscode-inputValidation-errorForeground);\n  --color-button-danger-hover: var(--vscode-inputValidation-errorBorder);\n\n  /* Badge variants */\n  --color-badge-default-bg: var(--vscode-badge-background);\n  --color-badge-default-fg: var(--vscode-badge-foreground);\n  --color-badge-info-bg: var(--vscode-badge-background);\n  --color-badge-info-fg: var(--vscode-badge-foreground);\n  --color-badge-success-bg: var(--vscode-testing-iconPassed);\n  --color-badge-success-fg: var(--vscode-editor-background);\n  --color-badge-warning-bg: var(--vscode-testing-iconQueued);\n  --color-badge-warning-fg: var(--vscode-editor-background);\n  --color-badge-danger-bg: var(--vscode-testing-iconFailed);\n  --color-badge-danger-fg: var(--vscode-editor-background);\n\n  /* ------------------------------------------------------------------ */\n  /*  Typography \u2014 VS Code Editor Font                                  */\n  /* ------------------------------------------------------------------ */\n  --font-family: var(--vscode-font-family);\n  --font-mono: var(--vscode-editor-font-family);\n\n  --text-xs: var(--vscode-font-size);\n  --text-sm: var(--vscode-font-size);\n  --text-base: var(--vscode-font-size);\n  --text-lg: calc(var(--vscode-font-size) + 1px);\n  --text-xl: calc(var(--vscode-font-size) + 2px);\n  --text-2xl: calc(var(--vscode-font-size) + 4px);\n  --text-3xl: calc(var(--vscode-font-size) + 6px);\n\n  --text-xs-lh: calc(var(--vscode-line-height) * 1.2);\n  --text-sm-lh: calc(var(--vscode-line-height) * 1.3);\n  --text-base-lh: var(--vscode-line-height);\n  --text-lg-lh: calc(var(--vscode-line-height) + 0.1);\n  --text-xl-lh: calc(var(--vscode-line-height) + 0.2);\n  --text-2xl-lh: calc(var(--vscode-line-height) + 0.3);\n  --text-3xl-lh: calc(var(--vscode-line-height) + 0.4);\n\n  --font-weight-normal: 400;\n  --font-weight-medium: 500;\n  --font-weight-semibold: 600;\n  --font-weight-bold: 700;\n\n  --letter-spacing-tight: -0.01em;\n  --letter-spacing-normal: 0;\n  --letter-spacing-wide: 0.02em;\n\n  /* ------------------------------------------------------------------ */\n  /*  Border Radius \u2014 VS Code Standard                                  */\n  /* ------------------------------------------------------------------ */\n  --radius-sm: 2px;\n  --radius-md: 3px;\n  --radius-lg: 4px;\n  --radius-xl: 6px;\n  --radius-2xl: 8px;\n  --radius-full: 9999px;\n\n  /* ------------------------------------------------------------------ */\n  /*  Shadows \u2014 Minimal, VS Code Style                                  */\n  /* ------------------------------------------------------------------ */\n  --shadow-sm: none;\n  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.15);\n  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.2);\n  --shadow-xl: 0 8px 32px rgba(0, 0, 0, 0.25);\n\n  /* ------------------------------------------------------------------ */\n  /*  Animation / Transition \u2014 Fast, Native                             */\n  /* ------------------------------------------------------------------ */\n  --transition-fast: 80ms ease;\n  --transition-base: 120ms ease;\n  --transition-slow: 200ms ease;\n\n  --duration-instant: 0ms;\n  --duration-fast: 80ms;\n  --duration-base: 120ms;\n  --duration-slow: 200ms;\n\n  /* ------------------------------------------------------------------ */\n  /*  Z-Index System                                                    */\n  /* ------------------------------------------------------------------ */\n  --z-base: 1;\n  --z-dropdown: 100;\n  --z-sticky: 200;\n  --z-modal-backdrop: 300;\n  --z-modal: 400;\n  --z-toast: 500;\n  --z-tooltip: 600;\n\n  /* ------------------------------------------------------------------ */\n  /*  Sizing                                                            */\n  /* ------------------------------------------------------------------ */\n  --sidebar-width: 300px;\n  --header-height: 35px;\n  --input-height: 28px;\n  --tab-height: 28px;\n  --badge-height: 20px;\n  --icon-size-sm: 14px;\n  --icon-size-md: 16px;\n  --icon-size-lg: 18px;\n  --icon-size-xl: 20px;\n\n  /* Spacing \u2014 VS Code uses 4px base */\n  --space-0: 0;\n  --space-1: 2px;\n  --space-2: 4px;\n  --space-3: 6px;\n  --space-4: 8px;\n  --space-5: 10px;\n  --space-6: 12px;\n  --space-8: 16px;\n  --space-10: 20px;\n  --space-12: 24px;\n  --space-16: 32px;\n}\n\n/* High Contrast adjustments are automatic via VS Code theme tokens */\n\n/* ------------------------------------------------------------------ */\n/*  Codicon Font (multiple fallbacks for theme compatibility)         */\n/* ------------------------------------------------------------------ */\n@font-face {\n  font-family: 'codicon';\n  src: url('vscode-resource:/codicon.ttf') format('truetype'),\n       url('https://cdn.jsdelivr.net/npm/@vscode/codicons@latest/dist/codicon/codicon.ttf') format('truetype');\n  font-display: swap;\n}\n\n/* =========================================================================\n   VS CODE COMPONENT TOKENS\n   ========================================================================= */\n\n/* Button */\n--button-height-sm: 24px;\n--button-height-md: 28px;\n--button-height-lg: 32px;\n--button-padding-sm: 0 8px;\n--button-padding-md: 0 12px;\n--button-padding-lg: 0 16px;\n--button-font-size: var(--vscode-font-size);\n--button-font-weight: 500;\n--button-border-radius: var(--radius-md);\n\n/* Input */\n--input-height: 28px;\n--input-padding: 0 8px;\n--input-font-size: var(--vscode-font-size);\n--input-border-radius: var(--radius-md);\n\n/* Card/Panel */\n--panel-border: var(--vscode-panel-border);\n--panel-background: var(--vscode-panel-background);\n\n/* Tab */\n--tab-height: 28px;\n--tab-padding: 0 12px;\n--tab-font-size: var(--vscode-font-size);\n--tab-border-radius: var(--radius-sm);\n\n/* List/Tree */\n--list-row-height: 24px;\n--list-hover-bg: var(--vscode-list-hoverBackground);\n--list-active-bg: var(--vscode-list-activeSelectionBackground);\n--list-focus-bg: var(--vscode-list-focusBackground);\n--list-focus-outline: var(--vscode-focusBorder);";

  // src/webview/design-system/styles.ts
  var stylesInjected = false;
  function injectGlobalStyles() {
    if (stylesInjected || typeof document === "undefined")
      return;
    const style2 = document.createElement("style");
    style2.id = "sireen-design-tokens";
    style2.textContent = tokens_default;
    document.head.appendChild(style2);
    stylesInjected = true;
  }

  // src/webview/providers/vscode-api.ts
  var _vscode = null;
  var _messageListeners = [];
  function getVscodeApi() {
    if (!_vscode) {
      try {
        _vscode = acquireVsCodeApi();
      } catch {
        _vscode = {
          postMessage: (msg) => console.log("[Sireen] postMessage:", msg),
          getState: () => null,
          setState: (s) => {
          }
        };
      }
    }
    return _vscode;
  }
  function postMessage(message) {
    getVscodeApi().postMessage(message);
  }
  function dispatchMessage(message) {
    for (const handler of _messageListeners) {
      try {
        handler(message);
      } catch (err) {
        console.error("[vscode-api] Message handler error:", err);
      }
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("message", (event) => {
      const message = event.data;
      if (message && typeof message === "object") {
        dispatchMessage(message);
      }
    });
  }

  // src/webview/screens/bounty-dashboard.tsx
  var PLATFORM_CONFIG = {
    immunefi: { color: "var(--vscode-testing-iconFailed)", label: "Immunefi", icon: IconBug },
    hackenproof: { color: "#8b5cf6", label: "HackenProof", icon: IconShield },
    code4rena: { color: "var(--vscode-testing-iconQueued)", label: "Code4rena", icon: IconGraph },
    sherlock: { color: "#10b981", label: "Sherlock", icon: IconTarget },
    cantina: { color: "#f59e0b", label: "Cantina", icon: IconZap },
    custom: { color: "var(--vscode-descriptionForeground)", label: "Custom", icon: IconFileCode }
  };
  var PROGRAMS = [
    {
      id: "immunefi-aave",
      name: "Aave V3",
      platform: "immunefi",
      status: "active",
      maxReward: "$250,000",
      chain: "Ethereum",
      scope: ["AaveV3Pool", "AaveV3Core", "AaveV3InterestRate"],
      languages: ["Solidity"],
      deadline: "2026-12-31",
      url: "https://immunefi.com/bounty/aave/",
      tags: ["defi", "lending", "high-value"],
      description: "Aave V3 protocol bug bounty. Focus on liquidation logic, interest rate models, and flash loan integrations."
    },
    {
      id: "immunefi-uniswap",
      name: "Uniswap V4",
      platform: "immunefi",
      status: "active",
      maxReward: "$500,000",
      chain: "Ethereum",
      scope: ["PoolManager", "Hooks", "ERC6909"],
      languages: ["Solidity"],
      deadline: "2026-11-15",
      url: "https://immunefi.com/bounty/uniswapv4/",
      tags: ["dex", "hooks", "concentrated-liquidity"],
      description: "Uniswap V4 with hooks architecture. Novel attack surface around custom pool logic."
    },
    {
      id: "code4rena-eigenlayer",
      name: "EigenLayer",
      platform: "code4rena",
      status: "active",
      maxReward: "$100,000",
      chain: "Ethereum",
      scope: ["StrategyManager", "DelegationManager", "RewardsCoordinator"],
      languages: ["Solidity"],
      deadline: "2026-10-20",
      url: "https://code4rena.com/contests/eigenlayer",
      tags: ["restaking", "middleware", "new-protocol"],
      description: "EigenLayer restaking protocol audit competition. Focus on slashing conditions and delegation logic."
    },
    {
      id: "sherlock-pendle",
      name: "Pendle Finance",
      platform: "sherlock",
      status: "active",
      maxReward: "$75,000",
      chain: "Ethereum",
      scope: ["PendleV2", "SY", "PT", "YT"],
      languages: ["Solidity"],
      deadline: "2026-09-30",
      url: "https://audits.sherlock.xyz/contests/pendle",
      tags: ["yield", "tokenization", "fixed-income"],
      description: "Pendle V2 yield tokenization. Look for precision loss, rounding errors, and oracle dependencies."
    },
    {
      id: "hackenproof-gmx",
      name: "GMX V2",
      platform: "hackenproof",
      status: "upcoming",
      maxReward: "$200,000",
      chain: "Arbitrum",
      scope: ["GMXV2", "GLP", "OrderBook"],
      languages: ["Solidity"],
      deadline: "2026-11-01",
      url: "https://hackenproof.com/gmx",
      tags: ["perp-dex", "oracle", "leverage"],
      description: "GMX V2 perpetual DEX. Oracle manipulation and position management logic are key areas."
    },
    {
      id: "custom-private",
      name: "Private Program: Protocol X",
      platform: "custom",
      status: "active",
      maxReward: "$50,000",
      chain: "Base",
      scope: ["CoreRouter", "Vault", "Strategy"],
      languages: ["Solidity"],
      url: "#",
      tags: ["private", "invite-only", "l2"],
      description: "Invite-only private program. Contact for access."
    }
  ];
  var SUBMISSIONS = [
    { id: "sub-1", programId: "immunefi-aave", title: "Incorrect Liquidation Threshold Calculation", severity: "high", status: "accepted", submittedAt: "2026-06-15", reward: "$45,000", txHash: "0xabc...def" },
    { id: "sub-2", programId: "code4rena-eigenlayer", title: "Slashing Condition Bypass", severity: "critical", status: "triaged", submittedAt: "2026-07-01", reward: "Pending" },
    { id: "sub-3", programId: "sherlock-pendle", title: "YT Token Precision Loss on Redeem", severity: "medium", status: "rejected", submittedAt: "2026-06-28" },
    { id: "sub-4", programId: "immunefi-uniswap", title: "Hook Reentrancy in beforeSwap", severity: "high", status: "submitted", submittedAt: "2026-07-10" },
    { id: "sub-5", programId: "hackenproof-gmx", title: "Oracle Staleness Check Bypass", severity: "medium", status: "paid", submittedAt: "2026-05-20", reward: "$12,500", txHash: "0x123...456" }
  ];
  var SEVERITY_CONFIG = {
    critical: { color: "var(--vscode-testing-iconFailed)", label: "Critical" },
    high: { color: "var(--vscode-testing-iconErrored)", label: "High" },
    medium: { color: "var(--vscode-testing-iconQueued)", label: "Medium" },
    low: { color: "var(--vscode-testing-iconPassed)", label: "Low" }
  };
  var STATUS_CONFIG = {
    active: { color: "var(--vscode-testing-iconPassed)", label: "Active" },
    upcoming: { color: "var(--vscode-testing-iconQueued)", label: "Upcoming" },
    paused: { color: "#f59e0b", label: "Paused" },
    ended: { color: "var(--vscode-descriptionForeground)", label: "Ended" }
  };
  function severityBadge(s) {
    switch (s) {
      case "critical":
        return "danger";
      case "high":
        return "warning";
      case "medium":
        return "warning";
      default:
        return "success";
    }
  }
  function statusBadge(s) {
    switch (s) {
      case "accepted":
        return "success";
      case "rejected":
        return "danger";
      case "paid":
        return "info";
      case "triaged":
        return "info";
      default:
        return "default";
    }
  }
  function BountyDashboard() {
    injectGlobalStyles();
    const [programs] = createSignal(PROGRAMS);
    const [submissions] = createSignal(SUBMISSIONS);
    const [filterPlatform, setFilterPlatform] = createSignal("all");
    const [filterStatus, setFilterStatus] = createSignal("all");
    const [searchQuery, setSearchQuery] = createSignal("");
    const [tab, setTab] = createSignal("programs");
    const [selectedProgram, setSelectedProgram] = createSignal(null);
    const filteredPrograms = createMemo(
      () => programs().filter(
        (p) => (filterPlatform() === "all" || p.platform === filterPlatform()) && (filterStatus() === "all" || p.status === filterStatus()) && (p.name.toLowerCase().includes(searchQuery().toLowerCase()) || p.chain.toLowerCase().includes(searchQuery().toLowerCase()) || p.scope.some((s) => s.toLowerCase().includes(searchQuery().toLowerCase())) || p.tags.some((t) => t.toLowerCase().includes(searchQuery().toLowerCase())))
      )
    );
    const platformStats = createMemo(() => {
      const stats = {};
      programs().forEach((p) => {
        const cfg = PLATFORM_CONFIG[p.platform];
        const max = parseInt(p.maxReward.replace(/[^0-9]/g, ""));
        if (!stats[p.platform])
          stats[p.platform] = { count: 0, totalMax: 0 };
        stats[p.platform].count++;
        stats[p.platform].totalMax += max;
      });
      return stats;
    });
    const handleOpenProgram = (p) => {
      setSelectedProgram(p);
      postMessage({ type: "bounty:open", payload: { url: p.url } });
    };
    return /* @__PURE__ */ h("div", { style: {
      display: "flex",
      "flex-direction": "column",
      height: "100%",
      background: "var(--vscode-editor-background)",
      color: "var(--vscode-editor-foreground)",
      "font-family": "var(--vscode-font-family)",
      "font-size": "var(--vscode-font-size)",
      overflow: "hidden"
    } }, /* @__PURE__ */ h("div", { style: {
      display: "flex",
      "align-items": "center",
      "justify-content": "space-between",
      padding: "8px 12px",
      "border-bottom": "1px solid var(--vscode-panel-border)",
      background: "var(--vscode-panel-background)"
    } }, /* @__PURE__ */ h("div", { style: { display: "flex", "align-items": "center", gap: "8px" } }, /* @__PURE__ */ h(IconTarget, { size: 16, style: { color: "var(--vscode-button-background)" } }), /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("span", { style: { "font-weight": 600 } }, "Bounty Dashboard"), /* @__PURE__ */ h("div", { style: { "font-size": "10px", color: "var(--vscode-descriptionForeground)" } }, programs().length, " programs \xB7 ", Object.values(platformStats()).reduce((a, b) => a + b.count, 0), " platforms"))), /* @__PURE__ */ h("div", { style: { display: "flex", "align-items": "center", gap: "8px" } }, /* @__PURE__ */ h(Badge, { variant: "warning", size: "sm" }, "Coming Soon"), /* @__PURE__ */ h(Button, { variant: "secondary", size: "sm", icon: /* @__PURE__ */ h(IconRefreshCw, { size: 12 }), onClick: () => postMessage({ type: "bounty:refresh" }) }, "Refresh"))), /* @__PURE__ */ h("div", { style: {
      display: "flex",
      gap: "1px",
      padding: "4px 8px",
      "border-bottom": "1px solid var(--vscode-panel-border)",
      background: "var(--vscode-panel-background)"
    } }, /* @__PURE__ */ h(For, { each: ["programs", "submissions", "stats"] }, (t) => /* @__PURE__ */ h(
      "button",
      {
        onClick: () => setTab(t),
        style: {
          padding: "4px 10px",
          "font-size": "11px",
          "font-weight": 500,
          color: tab() === t ? "var(--vscode-editor-foreground)" : "var(--vscode-descriptionForeground)",
          background: tab() === t ? "var(--vscode-list-activeSelectionBackground)" : "transparent",
          border: "none",
          "border-radius": "2px",
          cursor: "pointer"
        }
      },
      t.charAt(0).toUpperCase() + t.slice(1)
    ))), /* @__PURE__ */ h("div", { style: {
      display: "flex",
      "align-items": "center",
      gap: "8px",
      padding: "6px 12px",
      "border-bottom": "1px solid var(--vscode-panel-border)",
      background: "var(--vscode-panel-background)"
    } }, /* @__PURE__ */ h("div", { style: { flex: 1, "max-width": 300 } }, /* @__PURE__ */ h(
      "input",
      {
        type: "search",
        placeholder: "Search programs...",
        value: searchQuery(),
        onInput: (e) => setSearchQuery(e.target.value),
        style: {
          width: "100%",
          padding: "4px 8px",
          "font-size": "11px",
          background: "var(--vscode-input-background)",
          border: "1px solid var(--vscode-input-border)",
          "border-radius": "2px",
          color: "var(--vscode-input-foreground)",
          outline: "none"
        }
      }
    )), /* @__PURE__ */ h(
      "select",
      {
        value: filterPlatform(),
        onChange: (e) => setFilterPlatform(e.target.value),
        style: { padding: "4px 8px", "font-size": "11px", background: "var(--vscode-dropdown-background)", border: "1px solid var(--vscode-dropdown-border)", "border-radius": "2px", color: "var(--vscode-dropdown-foreground)", outline: "none" }
      },
      /* @__PURE__ */ h("option", { value: "all" }, "All Platforms"),
      /* @__PURE__ */ h("option", { value: "immunefi" }, "Immunefi"),
      /* @__PURE__ */ h("option", { value: "code4rena" }, "Code4rena"),
      /* @__PURE__ */ h("option", { value: "sherlock" }, "Sherlock"),
      /* @__PURE__ */ h("option", { value: "hackenproof" }, "HackenProof"),
      /* @__PURE__ */ h("option", { value: "cantina" }, "Cantina"),
      /* @__PURE__ */ h("option", { value: "custom" }, "Custom")
    ), /* @__PURE__ */ h(
      "select",
      {
        value: filterStatus(),
        onChange: (e) => setFilterStatus(e.target.value),
        style: { padding: "4px 8px", "font-size": "11px", background: "var(--vscode-dropdown-background)", border: "1px solid var(--vscode-dropdown-border)", "border-radius": "2px", color: "var(--vscode-dropdown-foreground)", outline: "none" }
      },
      /* @__PURE__ */ h("option", { value: "all" }, "All Status"),
      /* @__PURE__ */ h("option", { value: "active" }, "Active"),
      /* @__PURE__ */ h("option", { value: "upcoming" }, "Upcoming"),
      /* @__PURE__ */ h("option", { value: "paused" }, "Paused"),
      /* @__PURE__ */ h("option", { value: "ended" }, "Ended")
    )), /* @__PURE__ */ h("div", { style: { flex: 1, overflow: "auto" } }, /* @__PURE__ */ h(Show, { when: tab() === "programs" }, () => /* @__PURE__ */ h("div", { style: { padding: "12px", display: "flex", "flex-direction": "column", gap: "8px" } }, /* @__PURE__ */ h(For, { each: filteredPrograms() }, (p) => {
      const pcfg = PLATFORM_CONFIG[p.platform];
      const scfg = STATUS_CONFIG[p.status];
      const Icon = pcfg.icon;
      return /* @__PURE__ */ h(
        Panel,
        {
          variant: "bordered",
          padding: "md",
          onClick: () => handleOpenProgram(p),
          style: { cursor: "pointer", transition: "border-color 120ms", borderColor: selectedProgram()?.id === p.id ? pcfg.color : void 0 }
        },
        /* @__PURE__ */ h("div", { style: { display: "flex", "align-items": "flex-start", gap: "12px" } }, /* @__PURE__ */ h("div", { style: { width: 4, height: "100%", "border-radius": "2px", background: pcfg.color, "flex-shrink": 0, marginTop: "2px" } }), /* @__PURE__ */ h("div", { style: { flex: 1, "min-width": 0 } }, /* @__PURE__ */ h("div", { style: { display: "flex", "align-items": "center", gap: "8px", "margin-bottom": "4px", "flex-wrap": "wrap" } }, /* @__PURE__ */ h(Icon, { style: { width: 14, height: 14, color: pcfg.color, "flex-shrink": 0 } }), /* @__PURE__ */ h("span", { style: { "font-weight": 600 } }, p.name), /* @__PURE__ */ h(Badge, { variant: "default", size: "sm", style: { background: pcfg.color, color: "var(--vscode-editor-background)" } }, pcfg.label), /* @__PURE__ */ h(Badge, { variant: p.status === "active" ? "success" : p.status === "upcoming" ? "info" : p.status === "paused" ? "warning" : "default", size: "sm" }, scfg.label), /* @__PURE__ */ h("span", { style: { "font-size": "10px", color: "var(--vscode-descriptionForeground)", marginLeft: "auto", display: "flex", "align-items": "center", gap: "4px" } }, /* @__PURE__ */ h(IconDollar, { size: 11 }), " ", p.maxReward)), /* @__PURE__ */ h("p", { style: { margin: 0, "font-size": "10px", color: "var(--vscode-descriptionForeground)", "line-height": 1.5, "margin-bottom": "8px" } }, p.description), /* @__PURE__ */ h("div", { style: { display: "flex", "flex-wrap": "wrap", gap: "6px", "margin-bottom": "8px", "font-size": "10px" } }, /* @__PURE__ */ h("span", { style: { display: "flex", "align-items": "center", gap: "3px", color: "var(--vscode-descriptionForeground)" } }, /* @__PURE__ */ h(IconGlobe, { size: 11 }), " ", p.chain), /* @__PURE__ */ h("span", { style: { display: "flex", "align-items": "center", gap: "3px", color: "var(--vscode-descriptionForeground)" } }, /* @__PURE__ */ h(IconClock, { size: 11 }), " ", p.deadline || "No deadline"), p.scope.slice(0, 3).map((s) => /* @__PURE__ */ h("span", { key: s, style: { padding: "1px 6px", background: "var(--vscode-textBlockQuote-background)", "border-radius": "2px", color: "var(--vscode-descriptionForeground)" } }, s)), p.scope.length > 3 && /* @__PURE__ */ h("span", { style: { color: "var(--vscode-descriptionForeground)" } }, "+", p.scope.length - 3, " more")), /* @__PURE__ */ h("div", { style: { display: "flex", "flex-wrap": "wrap", gap: "4px" } }, p.tags.map((tag) => /* @__PURE__ */ h("span", { key: tag, style: { "font-size": "9px", padding: "1px 6px", background: "var(--vscode-textBlockQuote-background)", "border-radius": "2px", color: "var(--vscode-descriptionForeground)" } }, tag)))), /* @__PURE__ */ h("div", { style: { display: "flex", "flex-direction": "column", gap: "4px", "align-items": "flex-end" } }, /* @__PURE__ */ h(Button, { variant: "primary", size: "sm", icon: /* @__PURE__ */ h(IconArrowRight, { size: 12 }), onClick: (e) => {
          e.stopPropagation();
          handleOpenProgram(p);
        } }, "View")))
      );
    }), filteredPrograms().length === 0 && /* @__PURE__ */ h("div", { style: { padding: "24px", "text-align": "center", color: "var(--vscode-descriptionForeground)" } }, /* @__PURE__ */ h(IconSearch, { style: { width: 32, height: 32, marginBottom: "8px", opacity: 0.3 } }), /* @__PURE__ */ h("p", null, "No programs match your filter")))), /* @__PURE__ */ h(Show, { when: tab() === "submissions" }, () => /* @__PURE__ */ h("div", { style: { padding: "12px", display: "flex", "flex-direction": "column", gap: "8px" } }, /* @__PURE__ */ h(For, { each: submissions().sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()) }, (sub) => {
      const program = programs().find((p) => p.id === sub.programId);
      const pcfg = program ? PLATFORM_CONFIG[program.platform] : { color: "var(--vscode-descriptionForeground)", label: "Unknown", icon: IconFileCode };
      return /* @__PURE__ */ h(Panel, { variant: "bordered", padding: "md" }, /* @__PURE__ */ h("div", { style: { display: "flex", "align-items": "flex-start", gap: "12px" } }, /* @__PURE__ */ h("div", { style: { width: 4, height: "100%", "border-radius": "2px", background: SEVERITY_CONFIG[sub.severity].color, "flex-shrink": 0, marginTop: "2px" } }), /* @__PURE__ */ h("div", { style: { flex: 1, "min-width": 0 } }, /* @__PURE__ */ h("div", { style: { display: "flex", "align-items": "center", gap: "8px", "margin-bottom": "4px", "flex-wrap": "wrap" } }, /* @__PURE__ */ h("span", { style: { "font-weight": 600 } }, sub.title), /* @__PURE__ */ h(Badge, { variant: severityBadge(sub.severity), size: "sm" }, SEVERITY_CONFIG[sub.severity].label), /* @__PURE__ */ h(Badge, { variant: statusBadge(sub.status), size: "sm" }, sub.status), program && /* @__PURE__ */ h(Badge, { variant: "default", size: "sm", style: { background: pcfg.color, color: "var(--vscode-editor-background)" } }, pcfg.label), /* @__PURE__ */ h("span", { style: { "font-size": "10px", color: "var(--vscode-descriptionForeground)", marginLeft: "auto" } }, new Date(sub.submittedAt).toLocaleDateString())), sub.reward && /* @__PURE__ */ h("div", { style: { display: "flex", "align-items": "center", gap: "12px", "font-size": "10px", color: "var(--vscode-descriptionForeground)" } }, /* @__PURE__ */ h("span", { style: { display: "flex", "align-items": "center", gap: "3px" } }, /* @__PURE__ */ h(IconDollar, { size: 11 }), " Reward: ", sub.reward), sub.txHash && /* @__PURE__ */ h("span", { style: { display: "flex", "align-items": "center", gap: "3px", "font-family": "var(--vscode-editor-font-family)" } }, /* @__PURE__ */ h(IconExternalLink, { size: 11 }), " ", sub.txHash))), /* @__PURE__ */ h("div", { style: { display: "flex", "flex-direction": "column", gap: "4px" } }, /* @__PURE__ */ h(Button, { variant: "ghost", size: "sm", onClick: () => postMessage({ type: "bounty:viewSubmission", payload: { id: sub.id } }) }, /* @__PURE__ */ h(IconEye, { size: 12 }), " Details"))));
    }), submissions().length === 0 && /* @__PURE__ */ h("div", { style: { padding: "24px", "text-align": "center", color: "var(--vscode-descriptionForeground)" } }, /* @__PURE__ */ h(IconHistory, { style: { width: 32, height: 32, marginBottom: "8px", opacity: 0.3 } }), /* @__PURE__ */ h("p", null, "No submissions yet")))), /* @__PURE__ */ h(Show, { when: tab() === "stats" }, () => /* @__PURE__ */ h("div", { style: { padding: "16px", display: "flex", "flex-direction": "column", gap: "16px" } }, /* @__PURE__ */ h("div", { style: { display: "grid", "grid-template-columns": "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" } }, /* @__PURE__ */ h(Panel, { variant: "bordered", padding: "md", style: { "text-align": "center" } }, /* @__PURE__ */ h("div", { style: { "font-size": "28px", "font-weight": 700, color: "var(--vscode-button-background)" } }, programs().length), /* @__PURE__ */ h("div", { style: { "font-size": "10px", color: "var(--vscode-descriptionForeground)", "text-transform": "uppercase", "letter-spacing": "0.5px" } }, "Total Programs")), /* @__PURE__ */ h(Panel, { variant: "bordered", padding: "md", style: { "text-align": "center" } }, /* @__PURE__ */ h("div", { style: { "font-size": "28px", "font-weight": 700, color: "var(--vscode-testing-iconPassed)" } }, programs().filter((p) => p.status === "active").length), /* @__PURE__ */ h("div", { style: { "font-size": "10px", color: "var(--vscode-descriptionForeground)", "text-transform": "uppercase", "letter-spacing": "0.5px" } }, "Active")), /* @__PURE__ */ h(Panel, { variant: "bordered", padding: "md", style: { "text-align": "center" } }, /* @__PURE__ */ h("div", { style: { "font-size": "28px", "font-weight": 700, color: "var(--vscode-testing-iconQueued)" } }, programs().filter((p) => p.status === "upcoming").length), /* @__PURE__ */ h("div", { style: { "font-size": "10px", color: "var(--vscode-descriptionForeground)", "text-transform": "uppercase", "letter-spacing": "0.5px" } }, "Upcoming")), /* @__PURE__ */ h(Panel, { variant: "bordered", padding: "md", style: { "text-align": "center" } }, /* @__PURE__ */ h("div", { style: { "font-size": "28px", "font-weight": 700, color: "var(--vscode-testing-iconFailed)" } }, submissions().filter((s) => s.status === "accepted" || s.status === "paid").length), /* @__PURE__ */ h("div", { style: { "font-size": "10px", color: "var(--vscode-descriptionForeground)", "text-transform": "uppercase", "letter-spacing": "0.5px" } }, "Accepted / Paid"))), /* @__PURE__ */ h("div", { style: { display: "grid", "grid-template-columns": "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" } }, /* @__PURE__ */ h(Panel, { variant: "bordered", padding: "md" }, /* @__PURE__ */ h("h4", { style: { margin: "0 0 12px", "font-size": "11px", "font-weight": 600, color: "var(--vscode-descriptionForeground)", "text-transform": "uppercase", "letter-spacing": "0.5px" } }, "By Platform"), /* @__PURE__ */ h("div", { style: { display: "flex", "flex-direction": "column", gap: "8px" } }, Object.entries(platformStats()).map(([platform, stats]) => {
      const pcfg = PLATFORM_CONFIG[platform];
      return /* @__PURE__ */ h("div", { key: platform, style: { display: "flex", "align-items": "center", gap: "8px" } }, /* @__PURE__ */ h("span", { style: { width: 8, height: 8, "border-radius": "50%", background: pcfg.color } }), /* @__PURE__ */ h("span", { style: { flex: 1, "font-size": "var(--vscode-font-size)" } }, pcfg.label), /* @__PURE__ */ h("span", { style: { "font-size": "10px", color: "var(--vscode-descriptionForeground)" } }, stats.count, " programs"), /* @__PURE__ */ h("span", { style: { "font-size": "10px", "font-weight": 500 } }, "~$", stats.totalMax.toLocaleString(), "K max"));
    }))), /* @__PURE__ */ h(Panel, { variant: "bordered", padding: "md" }, /* @__PURE__ */ h("h4", { style: { margin: "0 0 12px", "font-size": "11px", "font-weight": 600, color: "var(--vscode-descriptionForeground)", "text-transform": "uppercase", "letter-spacing": "0.5px" } }, "Submission Status"), /* @__PURE__ */ h("div", { style: { display: "flex", "flex-direction": "column", gap: "8px" } }, Object.entries(
      submissions().reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {})
    ).map(([status, count]) => /* @__PURE__ */ h("div", { key: status, style: { display: "flex", "align-items": "center", gap: "8px" } }, /* @__PURE__ */ h(Badge, { variant: statusBadge(status), size: "sm" }, status), /* @__PURE__ */ h("span", { style: { flex: 1, "font-size": "var(--vscode-font-size)" } }, count))))), /* @__PURE__ */ h(Panel, { variant: "bordered", padding: "md" }, /* @__PURE__ */ h("h4", { style: { margin: "0 0 12px", "font-size": "11px", "font-weight": 600, color: "var(--vscode-descriptionForeground)", "text-transform": "uppercase", "letter-spacing": "0.5px" } }, "By Chain"), /* @__PURE__ */ h("div", { style: { display: "flex", "flex-direction": "column", gap: "6px" } }, Object.entries(
      programs().reduce((acc, p) => {
        acc[p.chain] = (acc[p.chain] || 0) + 1;
        return acc;
      }, {})
    ).map(([chain, count]) => /* @__PURE__ */ h("div", { key: chain, style: { display: "flex", "justify-content": "space-between", "font-size": "var(--vscode-font-size)" } }, /* @__PURE__ */ h("span", { style: { display: "flex", "align-items": "center", gap: "6px" } }, /* @__PURE__ */ h(IconGlobe, { size: 11, style: { color: "var(--vscode-descriptionForeground)" } }), chain), /* @__PURE__ */ h("span", { style: { "font-weight": 500 } }, count))))))))));
  }
  var root = document.getElementById("root");
  if (root) {
    render(() => /* @__PURE__ */ h(BountyDashboard, null), root);
  }
})();
//# sourceMappingURL=bounty-dashboard.js.map
