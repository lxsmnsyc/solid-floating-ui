import { autoUpdate, flip, offset, shift, useFloating } from 'solid-floating-ui';
import { type JSX, createSignal } from 'solid-js';

export default function PositioningCase(): JSX.Element {
  const [placement, setPlacement] = createSignal<'bottom-start' | 'right'>('bottom-start');

  const floating = useFloating({
    open: true,
    get placement() {
      return placement();
    },
    middleware: [offset(8), flip(), shift({ padding: 4 })],
    whileElementsMounted: autoUpdate,
  });

  return (
    <div>
      <button
        type="button"
        ref={(element) => {
          floating.refs.setReference(element);
        }}
        data-testid="reference"
      >
        Reference
      </button>
      <div
        ref={(element) => {
          floating.refs.setFloating(element);
        }}
        style={floating.floatingStyles}
        class="floating"
        data-testid="floating"
        data-placement={floating.placement}
        data-positioned={String(floating.isPositioned)}
      >
        Floating
      </div>
      <button
        type="button"
        data-testid="to-right"
        onClick={() => {
          setPlacement('right');
        }}
      >
        Place right
      </button>
    </div>
  );
}
