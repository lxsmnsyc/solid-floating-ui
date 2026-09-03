---
'solid-floating-ui': major
---

- `createRef` and the `Ref` type are gone. Anything the library reads from the caller is an accessor, and anything it produces arrives through a callback, so the state lives in a signal the caller owns.
- `useListNavigation` takes `items` instead of `listRef`, and reports the virtually focused item through `onVirtualItemChange` instead of filling `virtualItemRef`.
- `useTypeahead` takes `labels` instead of `listRef`.
- `FloatingList` takes `onElementsChange` and `onLabelsChange` instead of `elementsRef` and `labelsRef`.
- `inner` takes `items` and `scrollElement`, and reports the measured overflow through `onOverflowChange`. `useInnerOffset` reads it back through `overflow`.
- The shared state on a floating context is `data` rather than `dataRef`, the floating tree exposes `nodes()` rather than `nodesRef`, and `useNextDelayGroup` returns `delay` rather than `delayRef`.
- `refs` holds only the setters. Read the elements back through `elements`, which is reactive.
- `useMergeRefs` takes callback refs only.
- Comments no longer link to the Floating UI documentation for the React bindings, since those pages describe a different API.
