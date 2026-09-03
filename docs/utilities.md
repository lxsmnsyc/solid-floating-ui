# Utilities

## `createRef`

Creates the `{ current }` container the library writes into.

```js
import { createRef } from 'solid-floating-ui';

const elementsRef = createRef([]);
```

It is not reactive. Writing `.current` schedules nothing, which is the point:
these containers hold values that would cause a loop if every write were
tracked, such as the list of DOM nodes a `FloatingList` collects while it
renders.

Use one only where an option asks for a `Ref`: `elementsRef` and `labelsRef` on
`FloatingList`, `virtualItemRef` on `useListNavigation`, and `overflowRef` on
`inner` and `useInnerOffset`. Everything the library merely reads takes an
accessor instead. See [Reactivity](reactivity.md).

## `useId`

A stable unique id, from `createUniqueId`.

```js
const id = useId();
```

The hooks already generate the ids they need, and `context.floatingId` gives
you the floating element's. Reach for `useId` for your own labelling.

## `useMergeRefs`

Combines several refs into one callback, for when a component has to hand its
element to more than one consumer.

```jsx
const setRef = useMergeRefs([floating.refs.setFloating, props.ref, localRef]);

<div ref={setRef} />;
```

Each entry may be a callback, a `Ref` container, or `undefined`.

## `solid-floating-ui/utils`

A second entry point with the DOM helpers the library uses internally. They are
exported for building your own interaction hooks, and they carry no SolidJS
reactivity of their own.

```js
import { getDocument, isTypeableElement } from 'solid-floating-ui/utils';
```

Elements:

`activeElement`, `contains`, `getDocument`, `getFloatingFocusElement`,
`getTarget`, `isEventTargetWithin`, `isRootElement`, `isTypeableCombobox`,
`isTypeableElement`, `matchesFocusVisible`

Events:

`isMouseLikePointerType`, `isVirtualClick`, `isVirtualPointerEvent`,
`stopEvent`

Tabbing and focus:

`disableFocusInside`, `enableFocusInside`, `getNextTabbable`,
`getPreviousTabbable`, `getTabbableOptions`, `isOutsideEvent`, `enqueueFocus`

List and grid navigation:

`createGridCellMap`, `findNonDisabledListIndex`, `getGridCellIndexOfCorner`,
`getGridCellIndices`, `getGridNavigatedIndex`, `getMaxListIndex`,
`getMinListIndex`, `isDifferentGridRow`, `isIndexOutOfListBounds`,
`isListIndexDisabled`

Floating trees:

`getDeepestNode`, `getNodeAncestors`, `getNodeChildren`

Platform detection:

`getPlatform`, `getUserAgent`, `isAndroid`, `isJSDOM`, `isMac`, `isSafari`

Miscellaneous:

`createAttribute`, `clearTimeoutIfSet`, `createRef`

`clearTimeoutIfSet(id)` clears a timeout and returns the id to store back, so
the caller can keep it in a plain `let`:

```js
let timeout;

timeout = clearTimeoutIfSet(timeout);
```

## Types

Every public type is exported from the root entry point, including
`FloatingContext`, `FloatingRootContext`, `ElementProps`, `OpenChangeReason`,
`ContextData`, `UseFloatingOptions`, `UseFloatingReturn` and `Ref`. The
positioning types from `@floating-ui/dom`, such as `Placement`, `Middleware`
and `Strategy`, are re-exported too, so a project rarely needs to import from
`@floating-ui/dom` directly.
