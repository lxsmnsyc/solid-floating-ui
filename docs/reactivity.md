# Reactivity

`@floating-ui/react` re-runs a hook body on every render and uses dependency
arrays to decide what to recompute. SolidJS runs a component body once, so this
package works the way SolidJS component props do instead: every option is read
lazily, at the moment the value is needed, inside a tracking scope.

## Options are read, not captured

Pass a getter for anything that changes over time:

```jsx
useHover(floating.context, {
  get enabled() {
    return enabled();
  },
  get delay() {
    return isTouch() ? 0 : { open: 200, close: 100 };
  },
});
```

Pass a plain value for anything that does not:

```jsx
useHover(floating.context, { move: false, mouseOnly: true });
```

There is no dependency array anywhere in the library, and no equivalent of
`useMemo` for options. A getter that reads a signal subscribes the internal
effect that reads it, and nothing else re-runs.

The one thing to avoid is destructuring, which reads the property once and
freezes the value:

```jsx
// Wrong: `open` is read a single time.
const { open } = props;
useFloating({ open });

// Right: the getter re-reads it.
useFloating({
  get open() {
    return props.open;
  },
});
```

## Return values are read, not returned once

The same rule applies in reverse. `useFloating` returns an object whose
properties are getters:

```jsx
const floating = useFloating(/* ... */);

<div style={floating.floatingStyles}>{floating.placement}</div>;
```

Reading `floating.placement` inside JSX subscribes that piece of markup to the
placement, so it updates when the element flips. Reading it once into a
variable outside a tracking scope gives you a snapshot, which is rarely what
you want.

Live properties include `x`, `y`, `placement`, `strategy`, `middlewareData`,
`isPositioned`, `floatingStyles`, `context.open`, and everything under
`elements`.

## Prop getters stay live when spread

`useInteractions` returns `getReferenceProps`, `getFloatingProps` and
`getItemProps`. Each returns an object that recomputes as you read from it, so
spreading it once into JSX is enough:

```jsx
<div {...interactions.getFloatingProps()} />
```

SolidJS spreads inside a render effect, so when an interaction hook changes
which handlers or ARIA attributes it contributes, the spread picks the change
up without the component re-running. You do not need to wrap the call in a
memo, and you should not call it inside a loop over items; use `getItemProps`
for those.

User props merge in the same call, and your handler runs before the library's:

```jsx
<div
  {...interactions.getFloatingProps({
    onClick: (event) => {
      // Runs first.
    },
    class: 'menu',
  })}
/>
```

## Reading is an accessor, writing is a ref

Anywhere the library only reads a value you supply, the option takes an
accessor, `() => T`:

```jsx
useListNavigation(floating.context, {
  listRef: () => items(),
  /* ... */
});

arrow({ element: arrowElement });

<FloatingFocusManager context={floating.context} initialFocus={() => confirmButton()}>
```

The read-only positions are `listRef` on `useListNavigation`, `useTypeahead`
and `inner`, `scrollRef` on `inner` and `useInnerOffset`, `element` on `arrow`,
`root` on `FloatingPortal`, and `initialFocus` and `returnFocus` on
`FloatingFocusManager`.

A `Ref` object survives only where the library writes into a container for you.
You create one with `createRef`:

```jsx
import { createRef } from 'solid-floating-ui';

const elementsRef = createRef([]);
const labelsRef = createRef([]);
```

`createRef(value)` returns `{ current: value }`, nothing more. It is not
reactive, and writing to `.current` does not schedule an update. The positions
that take one are `elementsRef` and `labelsRef` on `FloatingList`,
`virtualItemRef` on `useListNavigation`, and `overflowRef` on `inner` and
`useInnerOffset`.

The two meet when `FloatingList` collects the items that `useListNavigation`
then reads, and the accessor spans the gap:

```jsx
const elementsRef = createRef([]);

useListNavigation(floating.context, {
  listRef: () => elementsRef.current,
  /* ... */
});
```

## Effects run at render time

The library uses `createRenderEffect` rather than `createEffect`, so listeners
and positioning are set up before the browser paints. That matters for the
first measurement of a floating element, which would otherwise be visible for
a frame at the wrong position. `isPositioned` on the return value tells you
whether a real measurement has happened yet, if you would rather hide the
element until it has.
