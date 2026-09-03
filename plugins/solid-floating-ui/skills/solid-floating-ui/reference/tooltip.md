# Tooltip

A label that appears on hover and on keyboard focus. Not interactive: nothing
inside it should be clickable. If it needs a link or a button, build a popover
instead.

```tsx
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from 'solid-floating-ui';
import { type JSX, Show, createSignal } from 'solid-js';

export interface TooltipProps {
  label: string;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  children: JSX.Element;
}

export function Tooltip(props: TooltipProps): JSX.Element {
  const [open, setOpen] = createSignal(false);

  const floating = useFloating({
    get open() {
      return open();
    },
    onOpenChange: (value) => {
      setOpen(value);
    },
    get placement() {
      return props.placement ?? 'top';
    },
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const interactions = useInteractions([
    useHover(floating.context, { move: false, delay: { open: 300, close: 80 } }),
    useFocus(floating.context),
    useDismiss(floating.context),
    useRole(floating.context, { role: 'tooltip' }),
  ]);

  return (
    <>
      <span
        {...interactions.getReferenceProps()}
        ref={(element) => {
          floating.refs.setReference(element);
        }}
      >
        {props.children}
      </span>
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
            {props.label}
          </div>
        </FloatingPortal>
      </Show>
    </>
  );
}
```

## Notes

- `useFocus` is what makes it reachable by keyboard. Do not leave it out.
- `move: false` stops the tooltip opening when the pointer merely ends up over
  the reference without a hover event, such as after the page scrolls under a
  stationary cursor.
- `useRole` with `'tooltip'` puts `aria-describedby` on the reference, so the
  reference must be a real focusable control. Wrapping a `<span>` around a
  `<button>`, as above, keeps the trigger focusable; wrapping plain text does
  not.
- The reference is a `<span>` so the component composes. Spread the reference
  props onto the caller's own element instead when the trigger is fixed.
- For several tooltips in a row that should share one delay, see
  `delay-group.md`.
- For an exit animation, see `transition.md`.
