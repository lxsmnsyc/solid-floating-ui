# Positioning

## `useFloating`

The main entry point. It positions the floating element and builds the context
object that every interaction hook and floating component consumes.

```js
const floating = useFloating(options);
```

### Options

| Option                 | Type                                          | Default      | Description                                                                                    |
| ---------------------- | --------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------- |
| `open`                 | `boolean`                                     | `false`      | Whether the floating element is open. Synchronized with `isPositioned`.                        |
| `onOpenChange`         | `(open, event?, reason?) => void`             |              | Called when a hook wants to open or close the element.                                         |
| `placement`            | `Placement`                                   | `'bottom'`   | Where to place the floating element.                                                           |
| `strategy`             | `'absolute' \| 'fixed'`                       | `'absolute'` | The CSS positioning strategy.                                                                  |
| `middleware`           | `Middleware[]`                                | `[]`         | The middleware to run, in order.                                                               |
| `transform`            | `boolean`                                     | `true`       | Position with `transform` instead of `top` and `left`.                                         |
| `whileElementsMounted` | `(reference, floating, update) => () => void` |              | Runs while both elements are mounted, cleaned up when either unmounts. Pass `autoUpdate` here. |
| `elements`             | `{ reference?, floating? }`                   |              | Externally controlled elements, instead of the refs.                                           |
| `platform`             | `Platform`                                    |              | A custom platform, for non-DOM environments.                                                   |
| `rootContext`          | `FloatingRootContext`                         |              | An existing root context to attach to, instead of creating one.                                |
| `nodeId`               | `string`                                      |              | The node id when the element lives in a `FloatingTree`.                                        |

### Return value

| Property         | Type                | Description                                                                                                                |
| ---------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `x`, `y`         | `number`            | The computed coordinates.                                                                                                  |
| `placement`      | `Placement`         | The final placement, after `flip()` and friends.                                                                           |
| `strategy`       | `Strategy`          | The strategy in use.                                                                                                       |
| `middlewareData` | `MiddlewareData`    | Data returned by each middleware, keyed by name.                                                                           |
| `isPositioned`   | `boolean`           | Whether a real measurement has happened.                                                                                   |
| `floatingStyles` | `JSX.CSSProperties` | The styles to apply to the floating element.                                                                               |
| `update()`       | `() => void`        | Recompute the position now.                                                                                                |
| `context`        | `FloatingContext`   | Passed to every interaction hook and component.                                                                            |
| `refs`           | `ExtendedRefs`      | `setReference`, `setFloating`, `setPositionReference`, and the underlying `reference`, `floating` and `domReference` refs. |
| `elements`       | `ExtendedElements`  | Live reads of `reference`, `floating` and `domReference`.                                                                  |

All of these except `update`, `refs`, `context` and `elements` are getters. See
[Reactivity](reactivity.md).

### Attaching the elements

```jsx
<button ref={(element) => { floating.refs.setReference(element); }} />
<div ref={(element) => { floating.refs.setFloating(element); }} style={floating.floatingStyles} />
```

If you already hold the elements in signals, pass them through `elements`
instead and skip the refs entirely:

```js
const floating = useFloating({
  get elements() {
    return { reference: reference(), floating: floatingElement() };
  },
});
```

## Middleware

Middleware are re-exported unchanged from `@floating-ui/dom`: `offset`,
`shift`, `flip`, `size`, `autoPlacement`, `hide`, `inline`, `limitShift`,
`detectOverflow`, `autoUpdate`, `computePosition`, `platform` and
`getOverflowAncestors`. Their documentation on
[floating-ui.com](https://floating-ui.com/docs/middleware) applies as written.

Order matters, and the usual order is `offset()`, then `shift()` or `flip()`,
then `size()`, then `arrow()`, then `hide()`:

```js
useFloating({
  middleware: [
    offset(8),
    flip({ fallbackAxisSideDirection: 'start' }),
    shift({ padding: 8 }),
    arrow({ element: arrowRef }),
  ],
});
```

Reading a signal inside the `middleware` getter re-runs positioning when it
changes:

```js
useFloating({
  get middleware() {
    return [offset(spacing()), flip()];
  },
});
```

### `arrow`

This package wraps the core `arrow` middleware so that `element` accepts a
`Ref` as well as an element. Nothing happens until the ref is filled, so the
middleware is safe to declare before the arrow renders.

```js
import { arrow, createRef } from 'solid-floating-ui';

const arrowRef = createRef(null);

useFloating({
  middleware: [arrow({ element: arrowRef, padding: 4 })],
});
```

| Option    | Type                                      | Default | Description                                                       |
| --------- | ----------------------------------------- | ------- | ----------------------------------------------------------------- |
| `element` | `Ref<Element \| null> \| Element \| null` |         | The arrow element, or a ref holding it.                           |
| `padding` | `Padding`                                 | `0`     | Space to keep between the arrow and the floating element's edges. |

See [`FloatingArrow`](components.md#floatingarrow) for a component that draws
the arrow and consumes this data for you.

## Keeping the position up to date

`useFloating` recomputes when the elements change and when any positioning
option changes. It does not watch for scrolling or resizing on its own, because
doing so costs listeners on every ancestor. Opt in with `autoUpdate`:

```js
import { autoUpdate, useFloating } from 'solid-floating-ui';

useFloating({ whileElementsMounted: autoUpdate });
```

Pass options to `autoUpdate` by wrapping it:

```js
useFloating({
  whileElementsMounted: (reference, floating, update) =>
    autoUpdate(reference, floating, update, { animationFrame: true }),
});
```

`animationFrame: true` tracks the reference element on every frame. It handles
CSS animations and layout the other strategies miss, at a real cost, so reach
for it only when the cheaper defaults are not enough.

You can also recompute manually, for instance after your own content changes:

```js
floating.update();
```

## Virtual elements

A reference does not have to be a DOM element. Anything with
`getBoundingClientRect` works, which is how context menus and cursor-following
elements are built:

```js
floating.refs.setPositionReference({
  getBoundingClientRect() {
    return {
      width: 0,
      height: 0,
      x: clientX,
      y: clientY,
      top: clientY,
      right: clientX,
      bottom: clientY,
      left: clientX,
    };
  },
});
```

`setPositionReference` sets what the position is measured against, while
`setReference` also registers the element for events. Set both when the
reference is a real element, and use `setPositionReference` alone when
positioning against a point or a rectangle that no element owns. See
[Virtual elements](https://floating-ui.com/docs/virtual-elements) for the full
contract, and [`useClientPoint`](interactions.md#useclientpoint) for a hook
that does this for the cursor.

## `usePosition`

The positioning half of `useFloating` with no interaction context attached. Use
it when you only need to anchor an element and will never add hooks or floating
components.

```js
const position = usePosition({
  get open() {
    return open();
  },
  placement: 'right',
  middleware: [offset(4)],
});
```

It takes the same positioning options as `useFloating` minus `onOpenChange`,
`rootContext` and `nodeId`, and returns everything except `context`.

## `useFloatingRootContext`

Creates the shared context without any positioning. This is the escape hatch
for cases where the elements are positioned by something else entirely, or
where a parent owns positioning and a child owns interactions.

```js
const rootContext = useFloatingRootContext({
  get open() {
    return open();
  },
  onOpenChange: setOpen,
  get elements() {
    return { reference: reference(), floating: floatingElement() };
  },
});

const floating = useFloating({ rootContext });
```

The `elements` option is required here, since there is nothing else to derive
them from.
