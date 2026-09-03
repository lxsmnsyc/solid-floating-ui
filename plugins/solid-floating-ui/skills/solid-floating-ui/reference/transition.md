# Transitions

A floating element removed from the DOM the moment it closes cannot animate
out. These hooks keep it mounted for the length of the transition.

## Styles computed for you

```tsx
import { useTransitionStyles } from 'solid-floating-ui';
import { Show } from 'solid-js';

const transition = useTransitionStyles(floating.context, {
  duration: 200,
  initial: ({ side }) => ({
    opacity: 0,
    transform: {
      top: 'translateY(6px) scale(0.96)',
      bottom: 'translateY(-6px) scale(0.96)',
      left: 'translateX(6px) scale(0.96)',
      right: 'translateX(-6px) scale(0.96)',
    }[side],
  }),
  common: ({ side }) => ({
    'transform-origin': {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left',
    }[side],
  }),
});

<Show when={transition.isMounted}>
  <div
    {...interactions.getFloatingProps()}
    ref={(element) => {
      floating.refs.setFloating(element);
    }}
    style={{ ...floating.floatingStyles, ...transition.styles }}
  >
    Content
  </div>
</Show>;
```

## Styles left to CSS

```tsx
const transition = useTransitionStatus(floating.context, { duration: 200 });

<Show when={transition.isMounted}>
  <div data-status={transition.status} class="floating">
    Content
  </div>
</Show>;
```

```css
.floating {
  transition:
    opacity 200ms,
    transform 200ms;
}

.floating[data-status='initial'],
.floating[data-status='close'] {
  opacity: 0;
  transform: scale(0.95);
}
```

## Notes

- Gate the markup on `transition.isMounted`, never on `open()`. That is the
  whole point.
- `status` is `'unmounted'`, `'initial'`, `'open'` or `'close'`. The `'initial'`
  phase exists to give the opening transition a frame to start from, so style
  it like the closed state.
- `duration` must match the CSS, otherwise the element unmounts mid-animation
  or lingers after it.
- `initial`, `open`, `close` and `common` each take a style object or a
  function of `{ side, placement }`, which is how the element animates out of
  the side `flip()` actually chose.
- Style keys are SolidJS `JSX.CSSProperties`, so `'transform-origin'`, not
  `transformOrigin`.
- `FloatingFocusManager` moves focus as soon as it mounts, which fights an
  entrance animation. Pass `disabled={transition.status === 'initial'}`.
