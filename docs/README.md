# solid-floating-ui documentation

SolidJS bindings for [Floating UI](https://floating-ui.com/), covering the same
surface as [`@floating-ui/react`](https://floating-ui.com/docs/react).

Start here:

- [Getting started](getting-started.md) — install, first tooltip, mental model
- [Reactivity](reactivity.md) — how options and return values are read
- [Migrating from `@floating-ui/react`](migrating-from-react.md) — the complete
  list of differences

Reference:

- [Positioning](positioning.md) — `useFloating`, `usePosition`,
  `useFloatingRootContext`, middleware, virtual elements
- [Interactions](interactions.md) — `useInteractions` and the eight interaction
  hooks, plus `safePolygon`
- [Components](components.md) — `FloatingArrow`, `FloatingPortal`,
  `FloatingOverlay`, `FloatingFocusManager`, `FloatingList`, `FloatingTree`,
  the delay groups and `Composite`
- [Transitions](transitions.md) — `useTransitionStatus` and
  `useTransitionStyles`
- [Utilities](utilities.md) — `useId`, `useMergeRefs` and the
  `solid-floating-ui/utils` entry point

Patterns:

- [Playground](../examples/playground) — an app with a live demo of every hook
  and component, run with `pnpm dev`
- [Recipes](recipes.md) — tooltip, popover, dropdown menu, select, context menu
  and nested menus

Every page here documents this package. For the concepts behind the library,
the [Floating UI documentation](https://floating-ui.com/docs/getting-started)
remains the primary source, and the option names match it.
