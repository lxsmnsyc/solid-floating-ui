# Migrating from `@floating-ui/react`

The public API is the same: the same hook names, the same option names, the
same components. What changes is how values are passed and read, because
SolidJS runs a component body once instead of on every render.

## Options are getters, not captured values

There are no dependency arrays, and nothing is recomputed by re-running the
component. Anything that changes is passed as a getter.

```jsx
// @floating-ui/react
const [open, setOpen] = useState(false);
const { refs, floatingStyles, context } = useFloating({
  open,
  onOpenChange: setOpen,
});

// solid-floating-ui
const [open, setOpen] = createSignal(false);
const floating = useFloating({
  get open() {
    return open();
  },
  onOpenChange: setOpen,
});
```

## The return value is one object

React's version returns a destructurable object. Here, destructuring would
freeze the values, so keep the object and read through it.

```jsx
// @floating-ui/react
const { x, y, refs, floatingStyles, context, placement } = useFloating();

// solid-floating-ui
const floating = useFloating();
floating.placement; // read where it is used
```

## No refs: accessors in, callbacks out

`@floating-ui/react` uses a `useRef` container in both directions. Here there
are no ref containers at all. Anything the library reads from you is an
accessor, and anything it produces for you arrives through a callback, so the
state lives in a signal you own.

| Option                                                 | `@floating-ui/react`           | `solid-floating-ui`                    |
| ------------------------------------------------------ | ------------------------------ | -------------------------------------- |
| `useListNavigation`, `inner` — the items               | `listRef: useRef([])`          | `items: () => T[]`                     |
| `useTypeahead` — the labels                            | `listRef: useRef([])`          | `labels: () => T[]`                    |
| `inner`, `useInnerOffset` — the scroll container       | `scrollRef: useRef(null)`      | `scrollElement: () => T`               |
| `arrow` — the arrow element                            | `element: useRef(null)`        | `element: () => T`                     |
| `FloatingPortal` — the root                            | `root: useRef(null)`           | `root: () => T`                        |
| `FloatingFocusManager` — `initialFocus`, `returnFocus` | `useRef(null)`                 | `() => T`                              |
| `FloatingList` — the collected items                   | `elementsRef`, `labelsRef`     | `onElementsChange`, `onLabelsChange`   |
| `useListNavigation` — the virtual item                 | `virtualItemRef: useRef(null)` | `onVirtualItemChange: (item) => void`  |
| `inner` — the measured overflow                        | `overflowRef: useRef(null)`    | `onOverflowChange: (overflow) => void` |
| `useInnerOffset` — the measured overflow               | `overflowRef: useRef(null)`    | `overflow: () => SideObject \| null`   |
| `FloatingTree` — the nodes                             | `nodesRef.current`             | `nodes()`                              |
| `useNextDelayGroup` — the delay                        | `delayRef.current`             | `delay`                                |
| `context` — the shared state                           | `dataRef.current`              | `data`                                 |
| `refs` — the elements                                  | `refs.floating.current`        | `elements.floating`                    |

A list is wired through one signal:

```jsx
const [items, setItems] = createSignal([]);

<FloatingList
  onElementsChange={(value) => {
    setItems(value);
  }}
>
  {/* ... */}
</FloatingList>;

useListNavigation(floating.context, { items /* ... */ });
```

`createRef` no longer exists, and neither does the `Ref` type.

## Prop getters are spread once

`getReferenceProps()` and `getFloatingProps()` return objects that recompute as
they are read, and SolidJS spreads inside a render effect, so a single spread
in the markup stays current. There is no re-render to trigger, and no memo to
add.

## Event names follow SolidJS

SolidJS does not synthesize bubbling focus events, so the prop getters emit
`onFocusIn` and `onFocusOut` where React would emit `onFocus` and `onBlur`.
Handlers you pass in are merged by the same names.

Style objects are `JSX.CSSProperties`, so keys are kebab-case strings:
`'transform-origin'`, not `transformOrigin`.

## `Composite` needs a `render` prop

SolidJS has no `cloneElement`, so `Composite` and `CompositeItem` cannot inject
props into a child element. Describe the element with a callback instead:

```jsx
// @floating-ui/react
<CompositeItem render={<button />} />;

// solid-floating-ui
<CompositeItem render={(props) => <button {...props} />} />;
```

Without `render`, both components fall back to a plain `div`.

## `useFloating` no longer takes positional arguments

Earlier versions of this package took `useFloating(reference, floating,
options)`. That signature is gone. Pass one options object, and attach the
elements through `floating.refs.setReference` and `floating.refs.setFloating`,
or through the `elements` option.

## What is unchanged

- Every middleware, and every option each middleware takes.
- Every interaction hook's defaults and semantics. Only the options that held a
  ref were renamed.
- `safePolygon` and its options.
- The ARIA attributes each `role` produces.
- The focus management behaviour of `FloatingFocusManager`, including guards,
  `order`, `modal` and `returnFocus`.
