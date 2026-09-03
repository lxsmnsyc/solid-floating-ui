import { useClick, useFloating, useInteractions, useTransitionStyles } from 'solid-floating-ui';
import { type JSX, Show, createSignal } from 'solid-js';

export default function TransitionCase(): JSX.Element {
  const [open, setOpen] = createSignal(false);

  const floating = useFloating({
    get open() {
      return open();
    },
    onOpenChange: (value) => {
      setOpen(value);
    },
  });

  const interactions = useInteractions([useClick(floating.context)]);
  const transition = useTransitionStyles(floating.context, {
    duration: 120,
    initial: { opacity: 0 },
  });

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
      <Show when={transition.isMounted}>
        <div
          {...interactions.getFloatingProps()}
          ref={(element) => {
            floating.refs.setFloating(element);
          }}
          style={{ ...floating.floatingStyles, ...transition.styles }}
          class="floating"
          data-testid="floating"
        >
          Fading content
        </div>
      </Show>
    </div>
  );
}
