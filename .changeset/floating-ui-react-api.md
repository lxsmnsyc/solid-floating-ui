---
'solid-floating-ui': major
---

- `useFloating` now takes a single options object and returns `refs`, `elements`, `floatingStyles` and a `context`, replacing the previous `useFloating(reference, floating, options)` signature.
- The interaction hooks from `@floating-ui/react` are available: `useClick`, `useClientPoint`, `useDismiss`, `useFocus`, `useHover`, `useListNavigation`, `useRole` and `useTypeahead`, composed with `useInteractions`.
- The floating components are available: `FloatingArrow`, `FloatingFocusManager`, `FloatingList` with `useListItem`, `FloatingOverlay`, `FloatingPortal`, `FloatingTree` with `FloatingNode`, `FloatingDelayGroup`, `NextFloatingDelayGroup`, `Composite` and `CompositeItem`.
- `safePolygon`, `inner`, `useInnerOffset`, `useTransitionStatus`, `useTransitionStyles`, `useId` and `useMergeRefs` are exported as well.
- A `solid-floating-ui/utils` entry point exposes the DOM helpers Floating UI ships alongside its React package.
- Options and returned values are reactive getters rather than values captured on render, so no dependency arrays are needed anywhere.
- Mutable containers such as `listRef` are created with the exported `createRef()`.
- `Composite` and `CompositeItem` accept a `render` callback only, since SolidJS has no `cloneElement`.
- Prop getters produce SolidJS event names, so `onFocusIn` and `onFocusOut` stand in for React's bubbling `onFocus` and `onBlur`.
