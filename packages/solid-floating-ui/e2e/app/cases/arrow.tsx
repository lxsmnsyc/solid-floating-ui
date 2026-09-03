import { FloatingArrow, arrow, createRef, offset, useFloating } from 'solid-floating-ui';
import type { JSX } from 'solid-js';

export default function ArrowCase(): JSX.Element {
  const arrowRef = createRef<Element | null>(null);

  const floating = useFloating({
    open: true,
    placement: 'bottom',
    middleware: [offset(12), arrow({ element: arrowRef })],
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
            arrowRef.current = element;
          }}
          context={floating.context}
          data-testid="arrow"
          fill="#222"
        />
      </div>
    </div>
  );
}
