import type { JSX } from '@solidjs/web';
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
import { Show, createSignal } from 'solid-js';

export default function DialogDemo(): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const [lockScroll, setLockScroll] = createSignal(true);

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
    useRole(floating.context, { role: 'alertdialog' }),
  ]);

  return (
    <>
      <div class="stage">
        <button
          type="button"
          class="trigger"
          {...interactions.getReferenceProps()}
          ref={(element) => {
            floating.refs.setReference(element);
          }}
        >
          Delete project
        </button>

        <Show when={open()}>
          <FloatingPortal>
            <FloatingOverlay class="overlay" lockScroll={lockScroll()}>
              <FloatingFocusManager context={floating.context} modal>
                <div
                  class="panel"
                  {...interactions.getFloatingProps()}
                  ref={(element) => {
                    floating.refs.setFloating(element);
                  }}
                >
                  <h3>Delete this project?</h3>
                  <p>This cannot be undone, and nothing here is actually deleted.</p>
                  <button
                    type="button"
                    class="trigger"
                    onClick={() => {
                      setOpen(false);
                    }}
                  >
                    Cancel
                  </button>{' '}
                  <button
                    type="button"
                    class="trigger"
                    onClick={() => {
                      setOpen(false);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </FloatingFocusManager>
            </FloatingOverlay>
          </FloatingPortal>
        </Show>
      </div>

      <div class="controls">
        <label class="control">
          <input
            type="checkbox"
            checked={lockScroll()}
            onChange={(event) => {
              setLockScroll(event.currentTarget.checked);
            }}
          />
          lockScroll
        </label>
      </div>

      <p class="note">
        The dialog is not positioned by <code>useFloating</code> at all here. The overlay centres
        it, and the hooks only handle the open state, dismissal and focus.
      </p>
    </>
  );
}
