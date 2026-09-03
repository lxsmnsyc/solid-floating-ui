import { useClick, useDismiss, useFloating, useInteractions, useRole } from 'solid-floating-ui';
import { type JSX, Show, createSignal } from 'solid-js';

export default function ClickCase(): JSX.Element {
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
    useDismiss(floating.context),
    useRole(floating.context, { role: 'dialog' }),
  ]);

  return (
    <div>
      <button
        type="button"
        {...interactions.getReferenceProps()}
        ref={(element) => {
          floating.refs.setReference(element);
        }}
        data-testid="reference"
      >
        Toggle
      </button>
      <Show when={open()}>
        <div
          {...interactions.getFloatingProps()}
          ref={(element) => {
            floating.refs.setFloating(element);
          }}
          style={floating.floatingStyles}
          class="floating"
          data-testid="floating"
        >
          Floating content
        </div>
      </Show>
      <button type="button" data-testid="outside">
        Outside
      </button>
    </div>
  );
}
