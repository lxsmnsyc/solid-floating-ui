# Arrow

A pointer on the floating element that stays aimed at the reference, including
after `shift()` slides the element along its side.

```tsx
import {
  FloatingArrow,
  arrow,
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from 'solid-floating-ui';
import { createSignal } from 'solid-js';

const [arrowElement, setArrowElement] = createSignal<Element | null>(null);

const floating = useFloating({
  get open() {
    return open();
  },
  onOpenChange: (value) => {
    setOpen(value);
  },
  placement: 'top',
  middleware: [
    offset(12),
    flip(),
    shift({ padding: 8 }),
    arrow({ element: arrowElement, padding: 6 }),
  ],
  whileElementsMounted: autoUpdate,
});
```

```tsx
<div
  class="floating"
  ref={(element) => {
    floating.refs.setFloating(element);
  }}
  style={floating.floatingStyles}
>
  Content
  <FloatingArrow
    ref={(element: SVGSVGElement) => {
      setArrowElement(element);
    }}
    context={floating.context}
    fill="var(--floating-bg)"
  />
</div>
```

## Notes

- `element` is an accessor, so the middleware may be declared before the arrow
  renders. It does nothing until the accessor returns a node.
- `offset()` must be at least the arrow's height, otherwise the arrow overlaps
  the reference. The default arrow is 14 wide and 7 tall.
- `fill` should match the floating element's background. Add `stroke` and
  `strokeWidth` to match its border.
- `padding` on the `arrow` middleware keeps the arrow away from the floating
  element's rounded corners.
- `tipRadius` rounds the tip. `staticOffset` pins the arrow to a fixed position
  along the side, which is what a menu with a fixed-position pointer wants; it
  is ignored when `shift()` has moved the element.
- Any other SVG attribute is forwarded, so `class` and `style` work.
