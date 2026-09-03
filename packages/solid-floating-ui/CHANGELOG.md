# solid-floating-ui

## 1.0.0

### Major Changes

- cdf3e11: - `createRef` and the `Ref` type are gone. Anything the library reads from the caller is an accessor, and anything it produces arrives through a callback, so the state lives in a signal the caller owns.
  - `useListNavigation` takes `items` instead of `listRef`, and reports the virtually focused item through `onVirtualItemChange` instead of filling `virtualItemRef`.
  - `useTypeahead` takes `labels` instead of `listRef`.
  - `FloatingList` takes `onElementsChange` and `onLabelsChange` instead of `elementsRef` and `labelsRef`.
  - `inner` takes `items` and `scrollElement`, and reports the measured overflow through `onOverflowChange`. `useInnerOffset` reads it back through `overflow`.
  - The shared state on a floating context is `data` rather than `dataRef`, the floating tree exposes `nodes()` rather than `nodesRef`, and `useNextDelayGroup` returns `delay` rather than `delayRef`.
  - `refs` holds only the setters. Read the elements back through `elements`, which is reactive.
  - `useMergeRefs` takes callback refs only.
  - Comments no longer link to the Floating UI documentation for the React bindings, since those pages describe a different API.
- 737bb44: - `useFloating` now takes a single options object and returns `refs`, `elements`, `floatingStyles` and a `context`, replacing the previous `useFloating(reference, floating, options)` signature.
  - The interaction hooks from `@floating-ui/react` are available: `useClick`, `useClientPoint`, `useDismiss`, `useFocus`, `useHover`, `useListNavigation`, `useRole` and `useTypeahead`, composed with `useInteractions`.
  - The floating components are available: `FloatingArrow`, `FloatingFocusManager`, `FloatingList` with `useListItem`, `FloatingOverlay`, `FloatingPortal`, `FloatingTree` with `FloatingNode`, `FloatingDelayGroup`, `NextFloatingDelayGroup`, `Composite` and `CompositeItem`.
  - `safePolygon`, `inner`, `useInnerOffset`, `useTransitionStatus`, `useTransitionStyles`, `useId` and `useMergeRefs` are exported as well.
  - A `solid-floating-ui/utils` entry point exposes the DOM helpers Floating UI ships alongside its React package.
  - Options and returned values are reactive getters rather than values captured on render, so no dependency arrays are needed anywhere.
  - Options the library only reads, such as `listRef`, the `arrow` element, a portal `root` and the focus manager's `initialFocus` and `returnFocus`, take an accessor instead of a ref.
  - Containers the library writes into, such as `FloatingList`'s `elementsRef`, are created with the exported `createRef()`.
  - `Composite` and `CompositeItem` accept a `render` callback only, since SolidJS has no `cloneElement`.
  - Prop getters produce SolidJS event names, so `onFocusIn` and `onFocusOut` stand in for React's bubbling `onFocus` and `onBlur`.

### Patch Changes

- 9904386: - The README now points at a Claude Code plugin carrying a working recipe for every pattern.
- eca604e: - The README now links to a `docs/` directory covering positioning, interactions, components, transitions, utilities, recipes and migration from `@floating-ui/react`.
- f01f90b: - Documentation comments no longer describe the React implementation the bindings were ported from.
- 7c25d83: - The README now describes what the Claude Code plugin adds: the `solid-floating-ui` skill, the recipes it carries, and the two commands.
