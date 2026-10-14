# Utilities

## `useMergeRefs`

Combines several callback refs into one, for when a component has to hand its
element to more than one consumer.

```jsx
const setRef = useMergeRefs([floating.refs.setFloating, props.ref]);

<div ref={setRef} />;
```

Entries may be `undefined`, which are skipped.

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

`createAttribute`, `clearTimeoutIfSet`

`clearTimeoutIfSet(id)` clears a timeout and returns the id to store back, so
the caller can keep it in a plain `let`:

```js
let timeout;

timeout = clearTimeoutIfSet(timeout);
```

## Types

Every public type is exported from the root entry point, including
`FloatingContext`, `FloatingRootContext`, `ElementProps`, `OpenChangeReason`,
`ContextData`, `UseFloatingOptions` and `UseFloatingReturn`. The
positioning types from `@floating-ui/dom`, such as `Placement`, `Middleware`
and `Strategy`, are re-exported too, so a project rarely needs to import from
`@floating-ui/dom` directly.
