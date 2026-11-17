import type { JSX } from '@solidjs/web';
import { useFloating, useHover, useInteractions } from 'solid-floating-ui';
import { Show, createSignal } from 'solid-js';

export default function HoverCase(): JSX.Element {
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
    useHover(floating.context, { delay: { open: 40, close: 40 } }),
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
        Hover me
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
          Tooltip
        </div>
      </Show>
    </div>
  );
}
