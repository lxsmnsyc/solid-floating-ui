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

## Reading a value the library only reads is an accessor

`@floating-ui/react` uses a `useRef` container for both directions. Here, a
`Ref` survives only where the library writes into it, and everything read-only
takes `() => T`:

| Option                                                   | `@floating-ui/react` | `solid-floating-ui` |
| -------------------------------------------------------- | -------------------- | ------------------- |
| `useListNavigation`, `useTypeahead`, `inner` — `listRef` | `useRef([])`         | `() => items()`     |
| `inner`, `useInnerOffset` — `scrollRef`                  | `useRef(null)`       | `() => element()`   |
| `arrow` — `element`                                      | `useRef(null)`       | `() => element()`   |
| `FloatingPortal` — `root`                                | `useRef(null)`       | `() => element()`   |
| `FloatingFocusManager` — `initialFocus`, `returnFocus`   | `useRef(null)`       | `() => element()`   |
| `FloatingList` — `elementsRef`, `labelsRef`              | `useRef([])`         | `createRef([])`     |
| `useListNavigation` — `virtualItemRef`                   | `useRef(null)`       | `createRef(null)`   |
| `inner`, `useInnerOffset` — `overflowRef`                | `useRef(null)`       | `createRef(null)`   |

When `FloatingList` collects the items that `useListNavigation` reads, the two
meet through an accessor over the container:

```jsx
const elementsRef = createRef([]);

<FloatingList elementsRef={elementsRef}>{/* ... */}</FloatingList>;

useListNavigation(floating.context, {
  listRef: () => elementsRef.current,
  /* ... */
});
```

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
- Every interaction hook's option names, defaults and semantics.
- `safePolygon` and its options.
- The ARIA attributes each `role` produces.
- The focus management behaviour of `FloatingFocusManager`, including guards,
  `order`, `modal` and `returnFocus`.
