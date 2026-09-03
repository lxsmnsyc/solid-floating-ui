# Interactions

Interaction hooks do not attach listeners themselves. Each returns an
`ElementProps` object describing the props it wants on the reference element,
the floating element and the list items. `useInteractions` merges those
descriptions into prop getters you spread onto your markup.

```jsx
const interactions = useInteractions([
  useClick(floating.context),
  useDismiss(floating.context),
  useRole(floating.context),
]);
```

## `useInteractions`

Takes an array of `ElementProps`, and tolerates `undefined` entries so hooks
can be included conditionally.

Returns:

| Method                          | Description                      |
| ------------------------------- | -------------------------------- |
| `getReferenceProps(userProps?)` | Props for the reference element. |
| `getFloatingProps(userProps?)`  | Props for the floating element.  |
| `getItemProps(userProps?)`      | Props for a list item.           |

Handlers merge rather than overwrite. When you pass your own handler, it runs
first, and the library's handler runs after it. Other props overwrite in the
order the hooks appear in the array, with your `userProps` winning last.

```jsx
<button
  {...interactions.getReferenceProps({
    onClick: () => {
      analytics.track('opened');
    },
  })}
/>
```

`getItemProps` also accepts `active` and `selected` booleans, which the hooks
read to decide what to do with the item. They are consumed rather than
forwarded, so they never land in the DOM.

```jsx
<div
  {...interactions.getItemProps({
    active: activeIndex() === index,
    selected: selectedIndex() === index,
  })}
/>
```

## `useHover`

Opens the floating element while the cursor is over the reference.

| Option        | Type                          | Default | Description                                                                       |
| ------------- | ----------------------------- | ------- | --------------------------------------------------------------------------------- |
| `enabled`     | `boolean`                     | `true`  | Whether the hook runs at all.                                                     |
| `delay`       | `number \| { open?, close? }` | `0`     | Milliseconds to wait before changing the open state.                              |
| `restMs`      | `number`                      | `0`     | Wait until the cursor is at rest over the reference for this long before opening. |
| `mouseOnly`   | `boolean`                     | `false` | Ignore touch input. Pen input counts as mouse.                                    |
| `move`        | `boolean`                     | `true`  | Whether moving the cursor onto the reference opens it, without a hover event.     |
| `handleClose` | `HandleClose \| null`         | `null`  | Controls when the element closes as the cursor leaves. Pass `safePolygon()`.      |

`delay` and `restMs` may also be functions, which is convenient when the value
depends on a signal:

```js
useHover(floating.context, {
  get delay() {
    return grouped() ? 0 : { open: 400, close: 100 };
  },
});
```

### `safePolygon`

Keeps the element open while the cursor travels from the reference to the
floating element, by treating the triangle between them as still "inside".
Without it, a gap created by `offset()` closes the element as the cursor
crosses it.

```js
import { safePolygon, useHover } from 'solid-floating-ui';

useHover(floating.context, {
  handleClose: safePolygon({ buffer: 1, requireIntent: true }),
});
```

| Option               | Type      | Default | Description                                                                                       |
| -------------------- | --------- | ------- | ------------------------------------------------------------------------------------------------- |
| `buffer`             | `number`  | `0.5`   | Extra pixels around the polygon.                                                                  |
| `blockPointerEvents` | `boolean` | `false` | Block pointer events on the rest of the page while the cursor is inside the polygon.              |
| `requireIntent`      | `boolean` | `true`  | Require the cursor to move toward the floating element, rather than merely be inside the polygon. |

## `useClick`

Toggles the floating element when the reference is clicked, including keyboard
activation on non-button elements.

| Option             | Type                     | Default   | Description                                                                         |
| ------------------ | ------------------------ | --------- | ----------------------------------------------------------------------------------- |
| `enabled`          | `boolean`                | `true`    | Whether the hook runs at all.                                                       |
| `event`            | `'click' \| 'mousedown'` | `'click'` | Which mouse event counts as a click. Keyboard activation is unaffected.             |
| `toggle`           | `boolean`                | `true`    | Whether repeated clicks close the element again.                                    |
| `ignoreMouse`      | `boolean`                | `false`   | Ignore mouse input, for instance when `useHover` already handles it.                |
| `keyboardHandlers` | `boolean`                | `true`    | Add Enter and Space handling for non-button elements.                               |
| `stickIfOpen`      | `boolean`                | `true`    | If the element is already open from another event, keep it open on the first click. |

## `useFocus`

Opens the floating element when the reference receives focus.

| Option        | Type      | Default | Description                                                                           |
| ------------- | --------- | ------- | ------------------------------------------------------------------------------------- |
| `enabled`     | `boolean` | `true`  | Whether the hook runs at all.                                                         |
| `visibleOnly` | `boolean` | `true`  | Only react to focus that matches `:focus-visible`, so a mouse click does not open it. |

## `useDismiss`

Closes the floating element on the escape key, an outside press or an ancestor
scroll.

| Option                | Type                                       | Default         | Description                                            |
| --------------------- | ------------------------------------------ | --------------- | ------------------------------------------------------ |
| `enabled`             | `boolean`                                  | `true`          | Whether the hook runs at all.                          |
| `escapeKey`           | `boolean`                                  | `true`          | Close on the escape key.                               |
| `outsidePress`        | `boolean \| (event) => boolean`            | `true`          | Close when pressing outside the floating element.      |
| `outsidePressEvent`   | `'pointerdown' \| 'mousedown' \| 'click'`  | `'pointerdown'` | Which event counts as an outside press.                |
| `referencePress`      | `boolean`                                  | `false`         | Close when pressing the reference element.             |
| `referencePressEvent` | `'pointerdown' \| 'mousedown' \| 'click'`  | `'pointerdown'` | Which event counts as a reference press.               |
| `ancestorScroll`      | `boolean`                                  | `false`         | Close when an overflow ancestor scrolls.               |
| `bubbles`             | `boolean \| { escapeKey?, outsidePress? }` |                 | Whether the events bubble up through a `FloatingTree`. |
| `capture`             | `boolean \| { escapeKey?, outsidePress? }` |                 | Whether to listen in the capture phase.                |

`pointerdown` is eager on both mouse and touch. `mousedown` is eager on mouse
and lazy on touch. `click` is lazy on both. Choose `mousedown` or `click` when
a press outside should be allowed to complete first, such as a drag that starts
inside the floating element.

Guard the outside press when an element rendered elsewhere should not count:

```js
useDismiss(floating.context, {
  outsidePress: (event) => !event.target.closest('.toast'),
});
```

`normalizeProp` is exported alongside the hook, for turning the
`boolean | { escapeKey, outsidePress }` shape into a pair of booleans in your
own code.

## `useRole`

Adds the ARIA attributes for a role, on both the reference and the floating
element, and wires their ids together.

| Option    | Type      | Default    | Description                       |
| --------- | --------- | ---------- | --------------------------------- |
| `enabled` | `boolean` | `true`     | Whether the hook runs at all.     |
| `role`    | see below | `'dialog'` | The role of the floating element. |

`role` accepts `'tooltip'`, `'dialog'`, `'alertdialog'`, `'menu'`,
`'listbox'`, `'grid'`, `'tree'`, `'select'`, `'label'` and `'combobox'`. Each
expands into the full set of attributes the pattern needs, including
`aria-haspopup`, `aria-expanded`, `aria-controls` and `aria-labelledby`. Item
props gain the matching `role` for `'menu'`, `'listbox'` and `'select'`.

## `useListNavigation`

Arrow key navigation over a list of items, with all of the behaviour the ARIA
patterns ask for: looping, grids, typeahead-compatible focus, virtual focus and
nested submenus.

```jsx
const elementsRef = createRef([]);
const [activeIndex, setActiveIndex] = createSignal(null);

useListNavigation(floating.context, {
  listRef: () => elementsRef.current,
  get activeIndex() {
    return activeIndex();
  },
  onNavigate: setActiveIndex,
  loop: true,
});
```

`listRef` is an accessor, because the hook only reads the items. Point it at
whatever holds them: the container `FloatingList` fills in, as above, or a
signal you maintain yourself.

| Option               | Type                                   | Default      | Description                                                                                  |
| -------------------- | -------------------------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| `listRef`            | `Ref<(HTMLElement \| null)[]>`         |              | The items, in order. Required.                                                               |
| `activeIndex`        | `number \| null`                       | `null`       | The focused or highlighted item. Required.                                                   |
| `onNavigate`         | `(index: number \| null) => void`      |              | Called when navigation moves.                                                                |
| `enabled`            | `boolean`                              | `true`       | Whether the hook runs at all.                                                                |
| `selectedIndex`      | `number \| null`                       | `null`       | The selected item, which need not be the active one.                                         |
| `loop`               | `boolean`                              | `false`      | Wrap around at the ends.                                                                     |
| `allowEscape`        | `boolean`                              | `false`      | Allow navigating past the boundary to nothing selected. Requires `loop`.                     |
| `nested`             | `boolean`                              | `false`      | The list is a submenu of another list.                                                       |
| `rtl`                | `boolean`                              | `false`      | The layout is right to left.                                                                 |
| `virtual`            | `boolean`                              | `false`      | Use `aria-activedescendant` and keep DOM focus on the reference. Items need unique ids.      |
| `virtualItemRef`     | `Ref<HTMLElement \| null>`             |              | Holds the virtually focused item. Requires a `FloatingTree`.                                 |
| `orientation`        | `'vertical' \| 'horizontal' \| 'both'` | `'vertical'` | The navigation axis.                                                                         |
| `parentOrientation`  | `'vertical' \| 'horizontal' \| 'both'` |              | The parent list's axis, when it cannot be detected.                                          |
| `cols`               | `number`                               | `1`          | Number of columns, making the list a grid.                                                   |
| `itemSizes`          | `Dimensions[]`                         |              | Sizes of grid items that span more than one cell.                                            |
| `dense`              | `boolean`                              | `false`      | The grid is dense, as in `grid-auto-flow`.                                                   |
| `focusItemOnOpen`    | `boolean \| 'auto'`                    | `'auto'`     | Focus an item when the element opens. `'auto'` decides from the input type.                  |
| `focusItemOnHover`   | `boolean`                              | `true`       | Hovering an item makes it active.                                                            |
| `openOnArrowKeyDown` | `boolean`                              | `true`       | Pressing an arrow key on the main axis opens the element.                                    |
| `disabledIndices`    | `number[] \| (index) => boolean`       |              | Which indices to skip. By default, items carrying `disabled` or `aria-disabled` are skipped. |
| `scrollItemIntoView` | `boolean \| ScrollIntoViewOptions`     | `true`       | Scroll the active item into view.                                                            |

Collecting the items into `listRef` by hand is tedious, so
[`FloatingList`](components.md#floatinglist-and-uselistitem) does it for you.

## `useTypeahead`

Matches items as the user types, the way a native `<select>` does.

```jsx
const labelsRef = createRef([]);

useTypeahead(floating.context, {
  listRef: () => labelsRef.current,
  get activeIndex() {
    return activeIndex();
  },
  onMatch: setActiveIndex,
});
```

| Option           | Type                                    | Default | Description                                                   |
| ---------------- | --------------------------------------- | ------- | ------------------------------------------------------------- |
| `listRef`        | `Ref<(string \| null)[]>`               |         | The item labels, in the same order as the elements. Required. |
| `activeIndex`    | `number \| null`                        | `null`  | The active item. Required.                                    |
| `onMatch`        | `(index: number) => void`               |         | Called with the matched index.                                |
| `onTypingChange` | `(isTyping: boolean) => void`           |         | Called as typing starts and stops.                            |
| `enabled`        | `boolean`                               | `true`  | Whether the hook runs at all.                                 |
| `findMatch`      | `(list, typedString) => string \| null` |         | Replace the default case-insensitive prefix match.            |
| `resetMs`        | `number`                                | `750`   | How long before the typed string resets.                      |
| `ignoreKeys`     | `string[]`                              | `[]`    | Keys that should not contribute to the string.                |
| `selectedIndex`  | `number \| null`                        | `null`  | The selected item, used to start matching after it.           |

## `useClientPoint`

Positions the floating element at a client point, following the cursor by
default. It works by installing a virtual element as the position reference, so
it composes with `useHover` for cursor-following tooltips and with a stored
coordinate for context menus.

| Option    | Type                   | Default  | Description                                                                 |
| --------- | ---------------------- | -------- | --------------------------------------------------------------------------- |
| `enabled` | `boolean`              | `true`   | Whether the hook runs at all.                                               |
| `axis`    | `'x' \| 'y' \| 'both'` | `'both'` | Restrict following to one axis and use the reference element for the other. |
| `x`       | `number \| null`       | `null`   | An explicit client x coordinate. Stops cursor following.                    |
| `y`       | `number \| null`       | `null`   | An explicit client y coordinate. Stops cursor following.                    |

Restricting to one axis is what makes a tooltip interactive: with
`axis: 'x'` the element tracks the cursor horizontally but stays anchored to
the reference vertically, so there is a stable path to move into it.

## `useInnerOffset` and `inner`

The pieces behind a macOS-style select, where the floating element overlaps the
reference and the selected item sits exactly on top of it. `inner` is a
middleware that positions the list by its active item, and `useInnerOffset`
lets the user scroll the list beyond its bounds to reveal the rest.

```js
import { createRef, inner, useInnerOffset } from 'solid-floating-ui';

const elementsRef = createRef([]);
const overflowRef = createRef(null);
const [innerOffset, setInnerOffset] = createSignal(0);

const floating = useFloating({
  get middleware() {
    return [
      inner({
        listRef: () => elementsRef.current,
        get index() {
          return selectedIndex();
        },
        offset: innerOffset(),
        overflowRef,
        onFallbackChange: setFallback,
      }),
    ];
  },
});

useInnerOffset(floating.context, {
  overflowRef,
  onChange: setInnerOffset,
});
```

`inner` takes the `DetectOverflowOptions` as well as `listRef`, `index`,
`offset`, `overflowRef`, `scrollRef`, `minItemsVisible` (default `4`),
`referenceOverflowThreshold` (default `0`) and `onFallbackChange`. `overflowRef`
is a `Ref`, since both `inner` and `useInnerOffset` write the measured overflow
into it, while `listRef` and `scrollRef` are accessors. When the list cannot
fit, `onFallbackChange` fires and you fall back to a regular anchored listbox.
