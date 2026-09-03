# Playground

An interactive app for trying `solid-floating-ui` out. It imports the library
from source through a Vite alias, so editing
[`packages/solid-floating-ui/src`](../../packages/solid-floating-ui/src) shows
up here immediately with no build step.

```bash
pnpm dev
```

Then open http://localhost:4320.

The demos, one per entry in the sidebar:

| Demo            | What it shows                                                                          |
| --------------- | -------------------------------------------------------------------------------------- |
| Positioning     | `useFloating` on its own, with live placement, offset, `flip()` and `shift()` controls |
| Arrow           | `FloatingArrow` reading its offset from the `arrow` middleware                         |
| Tooltip         | `useHover` and `useFocus`, with an adjustable open delay                               |
| Popover         | `useClick` with `FloatingPortal` and `FloatingFocusManager`, modal on or off           |
| Dialog          | `FloatingOverlay` with a scroll lock and modal focus trapping                          |
| Select          | `FloatingList`, `useListNavigation` and `useTypeahead` over a long list                |
| Nested menus    | `FloatingTree` with submenus opened by a `safePolygon` hover                           |
| Context menu    | `useClientPoint` with explicit coordinates                                             |
| Cursor tracking | `useClientPoint` following the pointer on one axis or both                             |
| Composite       | Arrow key navigation for a toolbar and a grid                                          |
| Transitions     | `useTransitionStyles` animating out of the current side                                |
| Delay group     | `FloatingDelayGroup` sharing one hover delay across a row                              |

Every demo is a single file in [`src/demos`](src/demos), written the way an
application would write it.
