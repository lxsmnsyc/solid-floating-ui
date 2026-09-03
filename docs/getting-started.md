# Getting started

## Install

`@floating-ui/dom` and `solid-js` are peer dependencies, so install them
alongside the package.

```bash
npm install @floating-ui/dom solid-floating-ui
```

```bash
pnpm add @floating-ui/dom solid-floating-ui
```

```bash
yarn add @floating-ui/dom solid-floating-ui
```

The published build keeps its JSX uncompiled and is resolved through the
`solid` export condition, the same way `solid-js` itself is. Any Vite project
using `vite-plugin-solid`, or any bundler configured with the `solid`
condition, compiles it along with your own code. No extra configuration is
needed.

## The shape of the library

Three layers stack on top of each other, and you take only the ones you need.

1. **Positioning.** `useFloating` anchors a floating element to a reference
   element and gives you the styles to apply.
2. **Interactions.** Hooks such as `useHover` and `useClick` describe when the
   element should open and close. `useInteractions` merges their event handlers
   into prop getters you spread onto your elements.
3. **Components.** `FloatingPortal`, `FloatingFocusManager`, `FloatingArrow`
   and the rest handle the parts that need real DOM work, such as focus
   trapping and portalling.

A floating element that only needs positioning uses layer one alone.

## A first example

```jsx
import { createSignal, Show } from 'solid-js';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
  useRole,
} from 'solid-floating-ui';

function Tooltip() {
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

  const interactions = useInteractions([
    useHover(floating.context, { move: false }),
    useDismiss(floating.context),
    useRole(floating.context, { role: 'tooltip' }),
  ]);

  return (
    <>
      <button
        {...interactions.getReferenceProps()}
        ref={(element) => {
          floating.refs.setReference(element);
        }}
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
        >
          Tooltip content
        </div>
      </Show>
    </>
  );
}
```

Four details are worth calling out.

- `open` is passed as a getter, so `useFloating` re-reads it whenever the
  signal changes. See [Reactivity](reactivity.md).
- The refs are set through callbacks. `floating.refs.setReference` and
  `floating.refs.setFloating` accept the element or `null`.
- `floating.floatingStyles` is a live object. Spreading it into `style` keeps
  the element positioned.
- `interactions.getReferenceProps()` and `getFloatingProps()` return prop
  objects whose values stay reactive when spread, so they can be spread once
  in the markup rather than recomputed by hand.

## Controlling the open state

`useFloating` never owns the open state. You hold it in a signal and pass both
the current value and the setter. That means anything can open the element,
including your own code:

```jsx
const [open, setOpen] = createSignal(false);

const floating = useFloating({
  get open() {
    return open();
  },
  onOpenChange: (value, event, reason) => {
    setOpen(value);
  },
});
```

`onOpenChange` also receives the originating `event` and a `reason`, one of
`'outside-press'`, `'escape-key'`, `'ancestor-scroll'`, `'reference-press'`,
`'click'`, `'hover'`, `'focus'`, `'focus-out'`, `'list-navigation'` or
`'safe-polygon'`. Use it to react differently depending on how the element was
dismissed.

## Where to go next

- Adding an arrow, a portal or a focus trap: [Components](components.md)
- Animating the element in and out: [Transitions](transitions.md)
- Keyboard navigation over a list of items: [Interactions](interactions.md)
- Complete working patterns: [Recipes](recipes.md)
