# API rules

## Options are read, not captured

Every hook takes a plain options object whose properties are read lazily, the
way SolidJS reads component props. Pass a getter for anything that changes, and
a plain value for anything that does not.

```jsx
const floating = useFloating({
  get open() {
    return open();
  },
  onOpenChange: (value, event, reason) => {
    setOpen(value);
  },
  placement: 'bottom-start',
  get middleware() {
    return [offset(spacing()), flip(), shift({ padding: 8 })];
  },
  whileElementsMounted: autoUpdate,
});
```

Destructuring freezes the value and is the most common way to break a
component:

```jsx
// Wrong.
const { open } = props;
useFloating({ open });

// Right.
useFloating({
  get open() {
    return props.open;
  },
});
```

`onOpenChange` receives the originating event and a reason: `'outside-press'`,
`'escape-key'`, `'ancestor-scroll'`, `'reference-press'`, `'click'`, `'hover'`,
`'focus'`, `'focus-out'`, `'list-navigation'` or `'safe-polygon'`.

## Return values are read where they are used

```jsx
const floating = useFloating(/* ... */);

<div style={floating.floatingStyles}>{floating.placement}</div>;
```

Live properties: `x`, `y`, `placement`, `strategy`, `middlewareData`,
`isPositioned`, `floatingStyles`, `context.open`, and everything under
`elements`.

## Accessors in, callbacks out

The library takes an accessor wherever it only reads a value you own:

| Option                                                  | Type                                      |
| ------------------------------------------------------- | ----------------------------------------- |
| `items` on `useListNavigation`, `inner`                 | `() => (HTMLElement \| null)[]`           |
| `labels` on `useTypeahead`                              | `() => (string \| null)[]`                |
| `scrollElement` on `inner`, `useInnerOffset`            | `() => HTMLElement \| null`               |
| `overflow` on `useInnerOffset`                          | `() => SideObject \| null`                |
| `element` on `arrow`                                    | `() => Element \| null`                   |
| `root` on `FloatingPortal`                              | `() => HTMLElement \| ShadowRoot \| null` |
| `initialFocus`, `returnFocus` on `FloatingFocusManager` | `() => HTMLElement \| null`               |

It hands values back through a callback wherever it produces one:

| Option                                       | Type                                          |
| -------------------------------------------- | --------------------------------------------- |
| `onElementsChange` on `FloatingList`         | `(elements: (HTMLElement \| null)[]) => void` |
| `onLabelsChange` on `FloatingList`           | `(labels: (string \| null)[]) => void`        |
| `onVirtualItemChange` on `useListNavigation` | `(item: HTMLElement \| null) => void`         |
| `onOverflowChange` on `inner`                | `(overflow: SideObject) => void`              |

There is no ref container in the API. The two halves meet through a signal you
own:

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

Two things are plain mutable objects rather than signals, because writing to
them must not re-run anything: `context.data`, the state the hooks share, and
the bookkeeping inside a delay group.

## Attaching the elements

```jsx
<button
  {...interactions.getReferenceProps()}
  ref={(element) => {
    floating.refs.setReference(element);
  }}
/>

<div
  {...interactions.getFloatingProps()}
  ref={(element) => {
    floating.refs.setFloating(element);
  }}
  style={floating.floatingStyles}
/>
```

Use a block body in the ref callback. An expression body returns the call's
value, which a `void` context rejects under a strict lint setup.

## Prop getters

`useInteractions` merges what each hook contributes. Your own handlers merge in
rather than overwrite, and run first:

```jsx
{...interactions.getReferenceProps({
  onClick: () => {
    track('opened');
  },
  class: 'trigger',
})}
```

`getItemProps` also takes `active` and `selected` booleans, which the hooks
consume rather than forward to the DOM.

Prop getters emit SolidJS event names, so focus is handled through `onFocusIn`
and `onFocusOut`. Style keys are kebab-case strings such as
`'transform-origin'`.

## Positioning stays put unless told otherwise

`useFloating` recomputes when the elements or options change, not on scroll or
resize. Pass `autoUpdate` as `whileElementsMounted` for that, and wrap it when
it needs options:

```js
useFloating({
  whileElementsMounted: (reference, floating, update) =>
    autoUpdate(reference, floating, update, { animationFrame: true }),
});
```

`animationFrame: true` tracks the reference every frame. It handles cases the
cheaper strategies miss, at a real cost, so reach for it last.

## Middleware order

`offset()`, then `flip()` or `shift()`, then `size()`, then `arrow()`, then
`hide()`. Everything from `@floating-ui/dom` is re-exported, so import from
`solid-floating-ui` rather than reaching for the DOM package.

## Common failures

| Symptom                                    | Cause                                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Nothing updates when a signal changes      | An option was passed as a value instead of a getter, or destructured.                               |
| The element is clipped or behind something | It needs `FloatingPortal`.                                                                          |
| It never moves while scrolling             | `whileElementsMounted: autoUpdate` is missing.                                                      |
| Escape or an outside click does nothing    | `useDismiss` is missing.                                                                            |
| The list index is always -1                | `useListItem`'s `ref` is not attached, or `FloatingList` is not an ancestor.                        |
| Typeahead matches nothing                  | `onLabelsChange` is not passed to `FloatingList`, or the signal it fills is not passed as `labels`. |
| Screen readers announce nothing useful     | `useRole` is missing, or the wrong `role` was chosen.                                               |
| Focus escapes a modal                      | `FloatingFocusManager` is missing or has `modal={false}`.                                           |
| The exit animation never plays             | The element is unmounted on `open()` instead of on `transition.isMounted`.                          |
