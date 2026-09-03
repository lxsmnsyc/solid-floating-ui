# Popover

A panel anchored to a control, opened by clicking it. Interactive: it may hold
inputs, links and buttons.

```tsx
import {
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from 'solid-floating-ui';
import { type JSX, Show, createSignal } from 'solid-js';

export interface PopoverProps {
  label: string;
  modal?: boolean;
  children: JSX.Element;
}

export function Popover(props: PopoverProps): JSX.Element {
  const [open, setOpen] = createSignal(false);

  const floating = useFloating({
    get open() {
      return open();
    },
    onOpenChange: (value) => {
      setOpen(value);
    },
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const interactions = useInteractions([
    useClick(floating.context),
    useDismiss(floating.context),
    useRole(floating.context, { role: 'dialog' }),
  ]);

  return (
    <>
      <button
        type="button"
        {...interactions.getReferenceProps()}
        ref={(element) => {
          floating.refs.setReference(element);
        }}
      >
        {props.label}
      </button>

      <Show when={open()}>
        <FloatingPortal>
          <FloatingFocusManager context={floating.context} modal={props.modal ?? false}>
            <div
              class="popover"
              {...interactions.getFloatingProps()}
              ref={(element) => {
                floating.refs.setFloating(element);
              }}
              style={floating.floatingStyles}
            >
              {props.children}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      </Show>
    </>
  );
}
```

## Notes

- Render the `FloatingPortal` block immediately after the trigger in the
  markup. The portal renders its outside focus guards at that position, so
  placing it later makes a non-modal popover hand focus to the wrong element on
  Tab.
- `modal={false}` is right for a popover: the page keeps working around it, and
  Tab leaves it in visual order. Use `modal` for something that demands an
  answer, and then see `dialog.md` for the backdrop.
- Focus lands on the first tabbable child. Override with
  `initialFocus={() => element()}` for a specific element, or
  `initialFocus={-1}` to focus nothing.
- Focus returns to the trigger on close. Pass
  `returnFocus={() => element()}` to send it elsewhere.
- Add `useHover(floating.context, { handleClose: safePolygon() })` alongside
  `useClick` when it should also open on hover.
