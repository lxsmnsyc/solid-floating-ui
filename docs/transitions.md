# Transitions

Removing a floating element from the DOM the moment it closes cancels any
closing animation. These two hooks keep it mounted for the length of the
transition and tell you which phase it is in.

## `useTransitionStatus`

Returns `isMounted` and a `status`, and leaves the styling to you.

```jsx
const transition = useTransitionStatus(floating.context, { duration: 200 });

<Show when={transition.isMounted}>
  <div data-status={transition.status} class="floating">
    Content
  </div>
</Show>;
```

| Option     | Type                          | Default | Description                                              |
| ---------- | ----------------------------- | ------- | -------------------------------------------------------- |
| `duration` | `number \| { open?, close? }` | `250`   | How long to stay mounted after closing, in milliseconds. |

`status` moves through four values:

| Status        | When                                           |
| ------------- | ---------------------------------------------- |
| `'unmounted'` | Not in the DOM.                                |
| `'initial'`   | Mounted, before the opening transition starts. |
| `'open'`      | Transitioning to, or resting at, open.         |
| `'close'`     | Transitioning out, still mounted.              |

The `initial` status exists so a CSS transition has a starting frame to
animate from. Style it as the closed state:

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

`duration` needs to match the CSS, otherwise the element unmounts early or
lingers.

## `useTransitionStyles`

The same lifecycle, with the styles computed for you. It returns a live style
object to merge with `floatingStyles`.

```jsx
const transition = useTransitionStyles(floating.context, {
  duration: 200,
  initial: { opacity: 0, transform: 'scale(0.95)' },
});

<Show when={transition.isMounted}>
  <div
    ref={(element) => {
      floating.refs.setFloating(element);
    }}
    style={{ ...floating.floatingStyles, ...transition.styles }}
  >
    Content
  </div>
</Show>;
```

| Option     | Type                          | Default          | Description                                            |
| ---------- | ----------------------------- | ---------------- | ------------------------------------------------------ |
| `duration` | `number \| { open?, close? }` | `250`            | The transition duration, in milliseconds.              |
| `initial`  | styles                        | `{ opacity: 0 }` | Applied on mount, before opening.                      |
| `open`     | styles                        |                  | Applied while open.                                    |
| `close`    | styles                        | `initial`        | Applied while closing.                                 |
| `common`   | styles                        |                  | Applied in every phase. Use it for `transform-origin`. |

Each of the four accepts either a style object or a function receiving
`{ side, placement }`, which is how you animate out of the side the element is
actually on:

```js
useTransitionStyles(floating.context, {
  duration: 200,
  initial: ({ side }) => ({
    opacity: 0,
    transform: {
      top: 'translateY(4px)',
      bottom: 'translateY(-4px)',
      left: 'translateX(4px)',
      right: 'translateX(-4px)',
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
```

Style keys are SolidJS `JSX.CSSProperties`, so multi-word properties are
kebab-case strings such as `'transform-origin'` and `'transition-duration'`.

## Delaying focus management

`FloatingFocusManager` moves focus as soon as it mounts, which fights an
opening animation. Keep it disabled until the element has settled:

```jsx
<Show when={transition.isMounted}>
  <FloatingFocusManager context={floating.context} disabled={transition.status === 'initial'}>
    {/* ... */}
  </FloatingFocusManager>
</Show>
```
