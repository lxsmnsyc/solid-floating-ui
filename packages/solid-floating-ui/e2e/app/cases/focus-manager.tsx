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

export default function FocusManagerCase(): JSX.Element {
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
    useRole(floating.context, { role: 'dialog' }),
  ]);

  return (
    <div>
      <button type="button" data-testid="before">
        Before
      </button>
      <button
        type="button"
        {...interactions.getReferenceProps()}
        ref={(element) => {
          floating.refs.setReference(element);
        }}
        data-testid="reference"
      >
        Open dialog
      </button>
      <Show when={open()}>
        <FloatingPortal>
          <FloatingOverlay lockScroll data-testid="overlay">
            <FloatingFocusManager context={floating.context} modal>
              <div
                {...interactions.getFloatingProps()}
                ref={(element) => {
                  floating.refs.setFloating(element);
                }}
                style={floating.floatingStyles}
                class="floating"
                data-testid="dialog"
              >
                <button type="button" data-testid="cancel">
                  Cancel
                </button>
                <button type="button" data-testid="confirm">
                  Confirm
                </button>
              </div>
            </FloatingFocusManager>
          </FloatingOverlay>
        </FloatingPortal>
      </Show>
    </div>
  );
}
