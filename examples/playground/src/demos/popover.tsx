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
import { Show, createSignal } from 'solid-js';

export default function PopoverDemo() {
  const [open, setOpen] = createSignal(false);
  const [modal, setModal] = createSignal(false);
  const [name, setName] = createSignal('');

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
      <div class="stage">
        <button type="button" class="trigger">
          Before
        </button>
        <button
          type="button"
          class="trigger"
          {...interactions.getReferenceProps()}
          ref={(element) => {
            floating.refs.setReference(element);
          }}
        >
          Rename
        </button>
        <button type="button" class="trigger">
          After
        </button>

        <Show when={open()}>
          <FloatingPortal>
            <FloatingFocusManager context={floating.context} modal={modal()}>
              <div
                class="panel"
                {...interactions.getFloatingProps()}
                ref={(element) => {
                  floating.refs.setFloating(element);
                }}
                style={floating.floatingStyles}
              >
                <h3>Rename document</h3>
                <p>Focus lands on the input, and returns to the trigger when this closes.</p>
                <input
                  value={name()}
                  placeholder="Untitled"
                  onInput={(event) => {
                    setName(event.currentTarget.value);
                  }}
                />
                <button
                  type="button"
                  class="trigger"
                  onClick={() => {
                    setOpen(false);
                  }}
                >
                  Done
                </button>
              </div>
            </FloatingFocusManager>
          </FloatingPortal>
        </Show>
      </div>

      <div class="controls">
        <label class="control">
          <input
            type="checkbox"
            checked={modal()}
            onChange={(event) => {
              setModal(event.currentTarget.checked);
            }}
          />
          modal
        </label>
      </div>

      <p class="note">
        With <code>modal</code> off, Tab leaves the popover and continues through the page. With it
        on, focus is trapped and the rest of the page is hidden from screen readers.
      </p>
    </>
  );
}
