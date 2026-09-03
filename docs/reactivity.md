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

You never declare what an option depends on. A getter that reads a signal
subscribes the internal effect that reads it, and nothing else re-runs.

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

## Values you supply are accessors, values the library produces are callbacks

Anywhere the library reads something you own, the option is an accessor,
`() => T`:

```jsx
useListNavigation(floating.context, {
  items: () => items(),
  /* ... */
});

arrow({ element: arrowElement });

<FloatingFocusManager context={floating.context} initialFocus={() => confirmButton()}>
```

The accessor positions are `items` on `useListNavigation` and `inner`, `labels`
on `useTypeahead`, `scrollElement` on `inner` and `useInnerOffset`, `overflow`
on `useInnerOffset`, `element` on `arrow`, `root` on `FloatingPortal`, and
`initialFocus` and `returnFocus` on `FloatingFocusManager`.

Anywhere the library produces something for you, it hands it back through a
callback, the way `onOpenChange` already does:

```jsx
const [items, setItems] = createSignal([]);
const [labels, setLabels] = createSignal([]);

<FloatingList
  onElementsChange={(value) => {
    setItems(value);
  }}
  onLabelsChange={(value) => {
    setLabels(value);
  }}
>
  {/* items */}
</FloatingList>;
```

The callback positions are `onElementsChange` and `onLabelsChange` on
`FloatingList`, `onVirtualItemChange` on `useListNavigation`, and
`onOverflowChange` on `inner`.

There is no ref container anywhere in the API. State you own lives in a signal,
which is what SolidJS already gives you, and the two halves meet through it:

```jsx
const [items, setItems] = createSignal([]);

useListNavigation(floating.context, { items /* ... */ });

<FloatingList
  onElementsChange={(value) => {
    setItems(value);
  }}
>
  {/* ... */}
</FloatingList>;
```

## Mutable state that is not reactive

Two things are deliberately plain objects rather than signals, because writing
to them must not re-run anything:

- `context.data`, the state the hooks attached to one floating element share,
  such as `data.openEvent`.
- The bookkeeping inside a delay group.

Read them where you need the current value, not inside a memo expecting an
update.

## Effects run at render time

The library uses `createRenderEffect` rather than `createEffect`, so listeners
and positioning are set up before the browser paints. That matters for the
first measurement of a floating element, which would otherwise be visible for
a frame at the wrong position. `isPositioned` on the return value tells you
whether a real measurement has happened yet, if you would rather hide the
element until it has.
