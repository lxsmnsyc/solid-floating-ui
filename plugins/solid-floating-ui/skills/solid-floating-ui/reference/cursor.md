# Cursor tracking

An element that follows the pointer. The important decision is the axis: on
`'both'` the element sits under the cursor and can never be reached, so an
interactive one must be restricted to a single axis.

```tsx
import {
  FloatingPortal,
  autoUpdate,
  offset,
  safePolygon,
  shift,
  useClientPoint,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
  useRole,
} from 'solid-floating-ui';
import { type JSX, Show, createSignal } from 'solid-js';

export function CursorTooltip(props: { children: JSX.Element }): JSX.Element {
  const [open, setOpen] = createSignal(false);

  const floating = useFloating({
    get open() {
      return open();
    },
    onOpenChange: (value) => {
      setOpen(value);
    },
    placement: 'bottom',
    middleware: [offset(12), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useClientPoint(floating.context, { axis: 'x' });

  const interactions = useInteractions([
    useHover(floating.context, { handleClose: safePolygon() }),
    useDismiss(floating.context),
    useRole(floating.context, { role: 'tooltip' }),
  ]);

  return (
    <>
      <div
        {...interactions.getReferenceProps()}
        ref={(element) => {
          floating.refs.setReference(element);
        }}
      >
        {props.children}
      </div>

      <Show when={open()}>
        <FloatingPortal>
          <div
            class="tooltip"
            {...interactions.getFloatingProps()}
            ref={(element) => {
              floating.refs.setFloating(element);
            }}
            style={floating.floatingStyles}
          >
            Follows the pointer horizontally
          </div>
        </FloatingPortal>
      </Show>
    </>
  );
}
```

## Notes

- `axis: 'x'` tracks the pointer horizontally and stays anchored to the
  reference vertically, which leaves a stable path for the pointer to travel
  into the element. `axis: 'y'` is the same idea rotated.
- `axis: 'both'`, the default, is only appropriate for something purely
  decorative that the pointer never has to reach.
- `safePolygon` protects that path. `requireIntent: false` makes it forgiving
  of a slow or wandering pointer, at the cost of keeping the element open
  longer.
- Pass explicit `x` and `y` instead of tracking to pin the element to a point.
  See `context-menu.md`.
- Touch input does not produce the pointer stream this relies on, so pair it
  with a non-tracking fallback when touch matters.
