# Dialog

A centred modal with a backdrop. Nothing here is positioned by `useFloating`:
the overlay centres the panel, and the hooks handle the open state, dismissal
and focus.

```tsx
import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from 'solid-floating-ui';
import { type JSX, Show, createSignal } from 'solid-js';

export interface DialogProps {
  label: string;
  title: string;
  destructive?: boolean;
  children: JSX.Element;
}

export function Dialog(props: DialogProps): JSX.Element {
  const [open, setOpen] = createSignal(false);

  const floating = useFloating({
    get open() {
      return open();
    },
    onOpenChange: (value) => {
      setOpen(value);
    },
  });

  const interactions = useInteractions([
    useClick(floating.context),
    useDismiss(floating.context, { outsidePressEvent: 'mousedown' }),
    useRole(floating.context, {
      get role() {
        return props.destructive ? 'alertdialog' : 'dialog';
      },
    }),
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
          <FloatingOverlay class="overlay" lockScroll>
            <FloatingFocusManager context={floating.context} modal>
              <div
                class="dialog"
                {...interactions.getFloatingProps()}
                ref={(element) => {
                  floating.refs.setFloating(element);
                }}
              >
                <h2>{props.title}</h2>
                {props.children}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                  }}
                >
                  Close
                </button>
              </div>
            </FloatingFocusManager>
          </FloatingOverlay>
        </FloatingPortal>
      </Show>
    </>
  );
}
```

```css
.overlay {
  background: rgb(0 0 0 / 45%);
  display: grid;
  place-items: center;
}
```

## Notes

- `lockScroll` handles the iOS Safari quirks and preserves the scroll position,
  which a plain `overflow: hidden` on the body does not.
- `outsidePressEvent: 'mousedown'` is deliberate. With the default
  `'pointerdown'`, a drag that starts inside the dialog and ends on the overlay
  closes it.
- `modal` traps Tab inside and hides the rest of the page from screen readers.
  Keep it on for a dialog.
- Use `'alertdialog'` only when the dialog interrupts to confirm something
  destructive.
- Add `visuallyHiddenDismiss` to `FloatingFocusManager` when the dialog has no
  visible close button, so touch screen readers can escape it.
- Delay focus until an entrance animation settles with
  `disabled={transition.status === 'initial'}`. See `transition.md`.
