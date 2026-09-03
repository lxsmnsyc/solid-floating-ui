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

Run `pnpm dev` for the [playground](examples/playground), an app
with a demo of every hook and component.

The [`docs/`](docs/) directory covers the whole surface:

- [Getting started](docs/getting-started.md)
- [Reactivity](docs/reactivity.md)
- [Positioning](docs/positioning.md)
- [Interactions](docs/interactions.md)
- [Components](docs/components.md)
- [Transitions](docs/transitions.md)
- [Utilities](docs/utilities.md)
- [Recipes](docs/recipes.md)
- [Migrating from `@floating-ui/react`](docs/migrating-from-react.md)

### Claude Code plugin

[`plugins/solid-floating-ui`](plugins/solid-floating-ui) is a Claude Code
plugin for building these patterns:

```
/plugin marketplace add lxsmnsyc/solid-floating-ui
/plugin install solid-floating-ui@solid-floating-ui
```

It adds one skill, `solid-floating-ui`, which loads on its own whenever the work
involves anchored or overlay UI in a SolidJS project. The skill carries the
reactivity rules that decide whether the result updates at all, plus a complete
working recipe for each pattern: tooltip, popover, dialog, select, nested menus,
context menu, cursor tracking, composite, transitions, delay groups and the
arrow.

Two commands come with it:

- `/floating-ui-recipe <name>` scaffolds one of those patterns into the current
  project, matching the conventions already in the codebase.
- `/floating-ui-audit [path]` reviews existing usage for the mistakes that
  type-check and render but silently stop updating.

### What is included

Positioning:

- `useFloating`, `usePosition`, `useFloatingRootContext`
- The middleware re-exported from `@floating-ui/dom`, plus an `arrow` that
  accepts an accessor

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
- `solid-floating-ui/utils` for the DOM helpers Floating UI exposes

### Differences from `@floating-ui/react`

- Options and returned values are reactive getters, read where they are used,
  rather than values captured on render.
- There are no ref containers. Anything the library reads from you is an
  accessor, such as `items` or the `arrow` element, and anything it produces
  arrives through a callback, such as `FloatingList`'s `onElementsChange`.
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
