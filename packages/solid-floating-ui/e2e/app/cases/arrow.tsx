import type { JSX } from '@solidjs/web';
import { FloatingArrow, arrow, offset, useFloating } from 'solid-floating-ui';
import { createSignal } from 'solid-js';

export default function ArrowCase(): JSX.Element {
  const [arrowElement, setArrowElement] = createSignal<Element | null>(null);

  const floating = useFloating({
    open: true,
    placement: 'bottom',
    middleware: [offset(12), arrow({ element: arrowElement })],
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
      >
        Floating
        <FloatingArrow
          ref={(element: SVGSVGElement) => {
            setArrowElement(element);
          }}
          context={floating.context}
          data-testid="arrow"
          fill="#222"
        />
      </div>
    </div>
  );
}
