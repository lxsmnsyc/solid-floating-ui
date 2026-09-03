import {
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
import { For, Show, createSignal } from 'solid-js';

const ACTIONS = ['Cut', 'Copy', 'Paste', 'Delete'];

export default function ContextMenuDemo() {
  const [open, setOpen] = createSignal(false);
  const [point, setPoint] = createSignal({ x: 0, y: 0 });
  const [chosen, setChosen] = createSignal('nothing yet');

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
      <div class="stage">
        <div
          class="context-target"
          onContextMenu={(event) => {
            event.preventDefault();
            setPoint({ x: event.clientX, y: event.clientY });
            setOpen(true);
          }}
        >
          Right click anywhere in here
        </div>

        <Show when={open()}>
          <FloatingPortal>
            <div
              class="menu"
              {...interactions.getFloatingProps()}
              ref={(element) => {
                floating.refs.setFloating(element);
              }}
              style={floating.floatingStyles}
            >
              <For each={ACTIONS}>
                {(action) => (
                  <div
                    class="option"
                    role="menuitem"
                    tabindex={-1}
                    onClick={() => {
                      setChosen(action);
                      setOpen(false);
                    }}
                  >
                    {action}
                  </div>
                )}
              </For>
            </div>
          </FloatingPortal>
        </Show>
      </div>

      <p class="readout">last chosen: {chosen()}</p>
      <p class="note">
        There is no reference element here. <code>useClientPoint</code> installs a virtual element
        at the stored coordinates, and <code>flip()</code> and <code>shift()</code> keep the menu on
        screen near the edges.
      </p>
    </>
  );
}
