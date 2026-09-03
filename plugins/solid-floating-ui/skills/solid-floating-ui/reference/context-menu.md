# Context menu

A menu placed where the user right-clicked. There is no reference element:
`useClientPoint` installs a virtual one at the stored coordinates.

```tsx
import {
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClientPoint,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from 'solid-floating-ui';
import { For, type JSX, Show, createSignal } from 'solid-js';

export interface ContextMenuProps {
  actions: { label: string; run: () => void }[];
  children: JSX.Element;
}

export function ContextMenu(props: ContextMenuProps): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const [point, setPoint] = createSignal({ x: 0, y: 0 });

  const floating = useFloating({
    get open() {
      return open();
    },
    onOpenChange: (value) => {
      setOpen(value);
    },
    placement: 'bottom-start',
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useClientPoint(floating.context, {
    get x() {
      return point().x;
    },
    get y() {
      return point().y;
    },
  });

  const interactions = useInteractions([
    useDismiss(floating.context),
    useRole(floating.context, { role: 'menu' }),
  ]);

  return (
    <>
      <div
        onContextMenu={(event) => {
          event.preventDefault();
          setPoint({ x: event.clientX, y: event.clientY });
          setOpen(true);
        }}
      >
        {props.children}
      </div>

      <Show when={open()}>
        <FloatingPortal>
          <FloatingFocusManager context={floating.context} modal={false} initialFocus={0}>
            <div
              class="menu"
              {...interactions.getFloatingProps()}
              ref={(element) => {
                floating.refs.setFloating(element);
              }}
              style={floating.floatingStyles}
            >
              <For each={props.actions}>
                {(action) => (
                  <div
                    class="option"
                    role="menuitem"
                    tabindex={-1}
                    onClick={() => {
                      action.run();
                      setOpen(false);
                    }}
                  >
                    {action.label}
                  </div>
                )}
              </For>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      </Show>
    </>
  );
}
```

## Notes

- Passing explicit `x` and `y` stops `useClientPoint` from following the
  cursor, so the menu stays where it was opened.
- `flip()` and `shift()` matter more here than anywhere else, because a press
  near the viewport edge would otherwise put the menu off screen.
- Setting `point` and then `open` in the same handler is fine: the position is
  computed before the element paints.
- Reopening at a new point while already open works without closing first,
  since the virtual element is re-read.
- Add `useListNavigation` with a `FloatingList` when the menu should support
  arrow keys. See `menu.md` for that wiring.
