# Delay group

A row of tooltips that share one hover delay: the first waits, and the rest
appear instantly while the group is warm.

```tsx
import {
  FloatingDelayGroup,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDelayGroup,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
  useRole,
  useTransitionStyles,
} from 'solid-floating-ui';
import { type JSX, Show, createSignal } from 'solid-js';

function GroupedTooltip(props: { label: string; children: JSX.Element }): JSX.Element {
  const [open, setOpen] = createSignal(false);

  const floating = useFloating({
    get open() {
      return open();
    },
    onOpenChange: (value) => {
      setOpen(value);
    },
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const group = useDelayGroup(floating.context);

  const interactions = useInteractions([
    useHover(floating.context, {
      move: false,
      get delay() {
        return group.delay;
      },
    }),
    useDismiss(floating.context),
    useRole(floating.context, { role: 'tooltip' }),
  ]);

  const transition = useTransitionStyles(floating.context, {
    get duration() {
      return group.isInstantPhase ? 0 : 180;
    },
    initial: { opacity: 0 },
  });

  return (
    <>
      <span
        {...interactions.getReferenceProps()}
        ref={(element) => {
          floating.refs.setReference(element);
        }}
      >
        {props.children}
      </span>
      <Show when={transition.isMounted}>
        <FloatingPortal>
          <div
            class="tooltip"
            {...interactions.getFloatingProps()}
            ref={(element) => {
              floating.refs.setFloating(element);
            }}
            style={{ ...floating.floatingStyles, ...transition.styles }}
          >
            {props.label}
          </div>
        </FloatingPortal>
      </Show>
    </>
  );
}
```

Wrap the row once:

```tsx
<FloatingDelayGroup delay={{ open: 600, close: 150 }} timeoutMs={400}>
  <GroupedTooltip label="Undo">…</GroupedTooltip>
  <GroupedTooltip label="Redo">…</GroupedTooltip>
</FloatingDelayGroup>
```

## Notes

- The delay must come from `group.delay`, read through a getter. Passing the
  group's initial delay directly defeats the point.
- `isInstantPhase` is true while the group is warm. Drop the transition
  duration to zero then, otherwise each tooltip fades in as the pointer passes
  and the row feels sluggish.
- `timeoutMs` is how long the group stays warm after the close delay ends. It
  matters most when the close delay is zero.
- `NextFloatingDelayGroup` with `useNextDelayGroup` is the experimental
  successor, with a smaller API. `hasProvider` tells a component whether a
  group is present at all, so it can fall back to its own delay.
