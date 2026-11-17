import type { JSX } from '@solidjs/web';
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
import { Show, createSignal, onCleanup } from 'solid-js';

export default function PopoverDemo(): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const [modal, setModal] = createSignal(false);
  const [name, setName] = createSignal('');
  const [focused, setFocused] = createSignal('nothing');

  function onFocusIn(event: FocusEvent): void {
    const target = event.target;
    setFocused(target instanceof HTMLElement ? (target.dataset.name ?? 'nothing') : 'nothing');
  }

  document.addEventListener('focusin', onFocusIn);
  onCleanup(() => {
    document.removeEventListener('focusin', onFocusIn);
  });

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
        <button type="button" class="trigger" data-name="tab stop before">
          Tab stop before
        </button>
        <button
          type="button"
          class="trigger"
          data-name="trigger"
          {...interactions.getReferenceProps()}
          ref={(element) => {
            floating.refs.setReference(element);
          }}
        >
          Rename
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
                  data-name="name field"
                  onInput={(event) => {
                    setName(event.currentTarget.value);
                  }}
                />
                <button
                  type="button"
                  class="trigger"
                  data-name="done button"
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

        <button type="button" class="trigger" data-name="tab stop after">
          Tab stop after
        </button>
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

      <p class="readout">focus: {focused()}</p>
      <p class="note">
        The two plain buttons are there to be tabbed through. Open the popover and press Tab
        repeatedly while watching the readout: with <code>modal</code> off, focus leaves the popover
        and continues to the tab stop after it; with <code>modal</code> on, focus cycles inside the
        popover and never reaches either one.
      </p>
    </>
  );
}
