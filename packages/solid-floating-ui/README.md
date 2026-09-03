# solid-floating-ui

> SolidJS bindings for [Floating UI](https://floating-ui.com/), covering the same surface as [`@floating-ui/react`](https://floating-ui.com/docs/react).

[![NPM](https://img.shields.io/npm/v/solid-floating-ui.svg)](https://www.npmjs.com/package/solid-floating-ui)

## Install

```bash
npm install --save @floating-ui/dom solid-floating-ui
```

```bash
yarn add @floating-ui/dom solid-floating-ui
```

```bash
pnpm add @floating-ui/dom solid-floating-ui
```

## Usage

`useFloating` positions a floating element against a reference element and
returns the context every interaction hook and floating component needs.

```jsx
import { createSignal, Show } from 'solid-js';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from 'solid-floating-ui';

function App() {
  const [open, setOpen] = createSignal(false);

  const floating = useFloating({
    get open() {
      return open();
    },
    onOpenChange: (value) => {
      setOpen(value);
    },
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const interactions = useInteractions([
    useClick(floating.context),
    useDismiss(floating.context),
    useRole(floating.context, { role: 'dialog' }),
  ]);

  return (
    <>
      <button
        {...interactions.getReferenceProps()}
        ref={(element) => floating.refs.setReference(element)}
      >
        Toggle
      </button>
      <Show when={open()}>
        <div
          {...interactions.getFloatingProps()}
          ref={(element) => floating.refs.setFloating(element)}
          style={floating.floatingStyles}
        >
          Floating content
        </div>
      </Show>
    </>
  );
}
```

### Options are read reactively

Every hook takes a plain options object whose properties are read lazily, the
way SolidJS reads component props. Pass a getter for anything that changes:

```jsx
useHover(floating.context, {
  get enabled() {
    return enabled();
  },
  delay: { open: 200, close: 100 },
});
```

The same holds for what the hooks return. `floating.placement`,
`floating.floatingStyles` and `floating.context.open` are live reads, so using
them inside JSX keeps the markup up to date without any extra wiring.

### Documentation

Run `pnpm dev` for the [playground](https://github.com/lxsmnsyc/solid-floating-ui/tree/main/examples/playground), an app
with a demo of every hook and component.

The [`docs/` directory](https://github.com/lxsmnsyc/solid-floating-ui/tree/main/docs) covers the whole surface:

- [Getting started](https://github.com/lxsmnsyc/solid-floating-ui/blob/main/docs/getting-started.md)
- [Reactivity](https://github.com/lxsmnsyc/solid-floating-ui/blob/main/docs/reactivity.md)
- [Positioning](https://github.com/lxsmnsyc/solid-floating-ui/blob/main/docs/positioning.md)
- [Interactions](https://github.com/lxsmnsyc/solid-floating-ui/blob/main/docs/interactions.md)
- [Components](https://github.com/lxsmnsyc/solid-floating-ui/blob/main/docs/components.md)
- [Transitions](https://github.com/lxsmnsyc/solid-floating-ui/blob/main/docs/transitions.md)
- [Utilities](https://github.com/lxsmnsyc/solid-floating-ui/blob/main/docs/utilities.md)
- [Recipes](https://github.com/lxsmnsyc/solid-floating-ui/blob/main/docs/recipes.md)
- [Migrating from `@floating-ui/react`](https://github.com/lxsmnsyc/solid-floating-ui/blob/main/docs/migrating-from-react.md)

### What is included

Positioning:

- `useFloating`, `usePosition`, `useFloatingRootContext`
- The middleware re-exported from `@floating-ui/dom`, plus an `arrow` that
  accepts a ref

Interactions, composed through `useInteractions`:

- `useClick`, `useClientPoint`, `useDismiss`, `useFocus`, `useHover`,
  `useListNavigation`, `useRole`, `useTypeahead`
- `safePolygon` for `useHover`

Components:

- `FloatingArrow`, `FloatingFocusManager`, `FloatingList` with `useListItem`,
  `FloatingOverlay`, `FloatingPortal`, `FloatingTree` with `FloatingNode`
- `FloatingDelayGroup` and the experimental `NextFloatingDelayGroup`
- `Composite` and `CompositeItem`

Utilities:

- `useId`, `useMergeRefs`, `useTransitionStatus`, `useTransitionStyles`
- `createRef` for the `{ current }` containers the library writes into, such as
  `elementsRef`
- `solid-floating-ui/utils` for the DOM helpers Floating UI exposes

### Differences from `@floating-ui/react`

- Options and returned values are reactive getters rather than values captured
  on render, so there is no dependency array anywhere.
- Anything the library only reads, such as `listRef` or an arrow element, is an
  accessor rather than a ref. `createRef()` is left for the containers the
  library writes into, such as `FloatingList`'s `elementsRef`.
- `Composite` and `CompositeItem` take a `render` callback only, because
  SolidJS has no `cloneElement`.
- Prop getters produce SolidJS event names, so `onFocusIn` and `onFocusOut`
  stand in for React's bubbling `onFocus` and `onBlur`.

### Updating the position

`useFloating` recomputes the position when the elements or the positioning
options change. Pass `autoUpdate` as `whileElementsMounted` to keep the
floating element anchored while scrolling and resizing:

```js
useFloating({
  whileElementsMounted: (reference, floating, update) =>
    autoUpdate(reference, floating, update, { animationFrame: true }),
});
```

You can also recompute at will:

```js
const floating = useFloating();

floating.update();
```

### Virtual elements

See [Virtual Elements](https://floating-ui.com/docs/virtual-elements) for
details. Pass one through `refs.setPositionReference`:

```js
const floating = useFloating();

floating.refs.setPositionReference({
  getBoundingClientRect() {
    return {/* ... */};
  },
});
```

## Sponsors

![Sponsors](https://github.com/lxsmnsyc/sponsors/blob/main/sponsors.svg?raw=true)

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
