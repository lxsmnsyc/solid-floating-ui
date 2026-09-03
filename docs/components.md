# Components

## `FloatingArrow`

Renders an SVG arrow and positions it from the `arrow` middleware's data. It
handles the rotation for each side, the border, and the alignment offset when
`shift()` has moved the floating element.

```jsx
import { FloatingArrow, arrow, offset, useFloating } from 'solid-floating-ui';
import { createSignal } from 'solid-js';

const [arrowElement, setArrowElement] = createSignal(null);

const floating = useFloating({
  middleware: [offset(12), arrow({ element: arrowElement })],
});

<div
  ref={(element) => {
    floating.refs.setFloating(element);
  }}
  style={floating.floatingStyles}
>
  Content
  <FloatingArrow
    ref={(element) => {
      setArrowElement(element);
    }}
    context={floating.context}
    fill="#222"
  />
</div>;
```

| Prop           | Type                       | Default | Description                                                                        |
| -------------- | -------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `context`      | `FloatingContext`          |         | The context from `useFloating`. Required.                                          |
| `width`        | `number`                   | `14`    | Width of the arrow.                                                                |
| `height`       | `number`                   | `7`     | Height of the arrow.                                                               |
| `tipRadius`    | `number`                   | `0`     | Rounding of the tip.                                                               |
| `staticOffset` | `string \| number \| null` |         | Force a fixed offset along the side, ignored when `shift()` has moved the element. |
| `d`            | `string`                   |         | A custom path, replacing the generated one.                                        |
| `stroke`       | `string`                   |         | Border colour.                                                                     |
| `strokeWidth`  | `number`                   | `0`     | Border width.                                                                      |

Any other SVG attribute is forwarded, so `fill`, `class` and `style` work as
usual. Give the arrow the same `fill` as the floating element's background.

## `FloatingPortal`

Renders its children into a container appended to `document.body`, or to a root
you name. Portalling matters when the floating element would otherwise be
clipped by `overflow: hidden`, or trapped under a stacking context.

```jsx
<Show when={open()}>
  <FloatingPortal>
    <div ref={setFloating} style={floating.floatingStyles}>
      Content
    </div>
  </FloatingPortal>
</Show>
```

| Prop               | Type                                                                             | Default         | Description                                                                                          |
| ------------------ | -------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------- |
| `id`               | `string`                                                                         |                 | Use the node with this id if it exists, otherwise create it.                                         |
| `root`             | `HTMLElement \| ShadowRoot \| (() => HTMLElement \| ShadowRoot \| null) \| null` | `document.body` | Where to append the container. An accessor defers the lookup until the node exists.                  |
| `preserveTabOrder` | `boolean`                                                                        | `true`          | Keep tab order matching the component tree rather than the DOM tree, for non-modal focus management. |

`useFloatingPortalNode({ id, root })` returns the container element itself when
you need to portal by hand.

## `FloatingOverlay`

A fixed-position backdrop that can lock scrolling on the body. The scroll lock
handles the iOS Safari quirks and preserves the scroll position, which a plain
`overflow: hidden` does not.

```jsx
<FloatingOverlay lockScroll style={{ background: 'rgba(0, 0, 0, 0.6)' }}>
  <FloatingFocusManager context={floating.context}>{/* dialog */}</FloatingFocusManager>
</FloatingOverlay>
```

| Prop         | Type      | Default | Description                                        |
| ------------ | --------- | ------- | -------------------------------------------------- |
| `lockScroll` | `boolean` | `false` | Lock scrolling on the document body while mounted. |

Every other `div` prop is forwarded.

## `FloatingFocusManager`

Manages focus for the floating element: what gets focused on open, what happens
to focus on close, and whether focus can leave at all.

```jsx
<FloatingFocusManager context={floating.context} modal>
  <div ref={setFloating} {...interactions.getFloatingProps()}>
    <button>Cancel</button>
    <button>Confirm</button>
  </div>
</FloatingFocusManager>
```

| Prop                    | Type                                         | Default       | Description                                                                                  |
| ----------------------- | -------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------- |
| `context`               | `FloatingRootContext`                        |               | The context from `useFloating`. Required.                                                    |
| `disabled`              | `boolean`                                    | `false`       | Turn focus management off, for instance until a transition finishes.                         |
| `modal`                 | `boolean`                                    | `true`        | Trap focus inside, and hide outside content from screen readers.                             |
| `initialFocus`          | `number \| (() => HTMLElement \| null)`      | `0`           | Which element to focus on open, as a tabbable index or an accessor. `-1` focuses nothing.    |
| `returnFocus`           | `boolean \| (() => HTMLElement \| null)`     | `true`        | Where focus goes on close. An accessor names the element explicitly.                         |
| `restoreFocus`          | `boolean`                                    | `false`       | Move focus to the nearest tabbable element if the focused element is removed.                |
| `order`                 | `('reference' \| 'floating' \| 'content')[]` | `['content']` | The order focus cycles through.                                                              |
| `guards`                | `boolean`                                    | `true`        | Render focus guards, so focus cannot escape into browser UI.                                 |
| `closeOnFocusOut`       | `boolean`                                    | `true`        | Close when focus moves outside. Non-modal only.                                              |
| `visuallyHiddenDismiss` | `boolean \| string`                          |               | Render a visually hidden dismiss button, so touch screen readers can escape a modal element. |
| `outsideElementsInert`  | `boolean`                                    | `false`       | Mark outside elements `inert` when modal, giving pointer modality without a backdrop.        |
| `getInsideElements`     | `() => Element[]`                            |               | Additional elements that count as part of the floating element.                              |

Use `modal` for dialogs, and `modal={false}` for popovers and menus that should
let the page keep working around them. A non-modal element combined with
`FloatingPortal` and `preserveTabOrder` tabs in the order a reader expects.

## `FloatingList` and `useListItem`

Collects list items into the refs that `useListNavigation` and `useTypeahead`
need, without threading indices through your components.

```jsx
const [items, setItems] = createSignal([]);
const [labels, setLabels] = createSignal([]);

<FloatingList
  onElementsChange={(value) => {
    setItems(value);
  }}
  onLabelsChange={(value) => {
    setLabels(value);
  }}
>
  <For each={options()}>{(option) => <Item label={option} />}</For>
</FloatingList>;

function Item(props) {
  const listItem = useListItem({
    get label() {
      return props.label;
    },
  });

  return (
    <div
      ref={(element) => {
        listItem.ref(element);
      }}
      role="option"
      tabindex={-1}
    >
      {props.label}
    </div>
  );
}
```

`FloatingList` takes `onElementsChange` and `onLabelsChange`, the second only
needed for typeahead. Each is called with the collected list in DOM order, so
the signals they fill go straight to `useListNavigation`'s `items` and
`useTypeahead`'s `labels`.

`useListItem({ label })` returns `{ ref, index }`, where `index` is a live read
that settles once the item is registered, and is `-1` before then. Without an
explicit `label`, the item's text content is used.

Items register in DOM order, so conditional and dynamically ordered lists stay
correct.

## `FloatingTree` and `FloatingNode`

Relates nested floating elements to each other, which nested menus need so that
an outside press or an escape key closes the right part of the chain.

```jsx
<FloatingTree>
  <Menu>
    <MenuItem />
    <Menu>
      <MenuItem />
    </Menu>
  </Menu>
</FloatingTree>
```

Inside the tree, each floating element declares itself:

```jsx
function Menu(props) {
  const nodeId = useFloatingNodeId();
  const parentId = useFloatingParentNodeId();
  const tree = useFloatingTree();

  const floating = useFloating({ nodeId /* ... */ });

  return <FloatingNode id={nodeId}>{/* ... */}</FloatingNode>;
}
```

| Export                      | Description                                                    |
| --------------------------- | -------------------------------------------------------------- |
| `FloatingTree`              | The provider. Render it once, above the outermost menu.        |
| `FloatingNode`              | Registers one floating element with the tree.                  |
| `useFloatingNodeId()`       | A generated id, already registered with the parent.            |
| `useFloatingParentNodeId()` | The parent's id, or `null` at the root.                        |
| `useFloatingTree()`         | The tree itself: `nodes()`, `events`, `addNode`, `removeNode`. |

`tree.events` is the channel the nested elements use to talk to each other, and
you can emit and listen on it yourself for behaviour such as closing every
sibling when one opens.

## `FloatingDelayGroup`

Shares a hover delay between a group of floating elements, so the first tooltip
waits and the rest appear instantly while the group is warm.

```jsx
<FloatingDelayGroup delay={{ open: 500, close: 200 }}>
  <Tooltip label="One" />
  <Tooltip label="Two" />
</FloatingDelayGroup>;

function Tooltip(props) {
  const floating = useFloating(/* ... */);
  const group = useDelayGroup(floating.context);

  useInteractions([
    useHover(floating.context, {
      get delay() {
        return group.delay;
      },
    }),
  ]);
}
```

`FloatingDelayGroup` takes `delay` (required) and `timeoutMs`, which is how
long the group stays warm after the close delay ends. `useDelayGroup(context,
{ enabled, id })` joins the group and returns its state, including
`isInstantPhase` for skipping animations while the group is warm.
`useDelayGroupContext()` reads the context directly.

## `NextFloatingDelayGroup`

An experimental replacement for `FloatingDelayGroup` with a smaller API.

```jsx
<NextFloatingDelayGroup delay={{ open: 500, close: 200 }}>
  <Tooltip />
</NextFloatingDelayGroup>;

const group = useNextDelayGroup(floating.context);

useHover(floating.context, {
  get delay() {
    return group.delay;
  },
});
```

`useNextDelayGroup(context, { enabled })` returns `{ delay, isInstantPhase,
hasProvider }`. `hasProvider` is `false` when there is no group above, which
lets a component fall back to its own delay.

## `Composite` and `CompositeItem`

Arrow key navigation for a group of elements that is not a floating element at
all: a toolbar, a tab list, a grid. It is the same navigation engine as
`useListNavigation`, without any of the positioning.

```jsx
<Composite orientation="horizontal" loop render={(props) => <div {...props} role="toolbar" />}>
  <For each={actions()}>
    {(action) => <CompositeItem render={(props) => <button {...props}>{action.label}</button>} />}
  </For>
</Composite>
```

`Composite` props:

| Prop              | Type                                   | Default         | Description                                  |
| ----------------- | -------------------------------------- | --------------- | -------------------------------------------- |
| `render`          | `(props) => JSX.Element`               | renders a `div` | The element to render.                       |
| `orientation`     | `'horizontal' \| 'vertical' \| 'both'` | `'both'`        | The navigation axis.                         |
| `loop`            | `boolean`                              | `true`          | Wrap around at the ends.                     |
| `rtl`             | `boolean`                              | `false`         | The layout is right to left.                 |
| `cols`            | `number`                               | `1`             | Number of columns, making it a grid.         |
| `activeIndex`     | `number`                               |                 | Control the active item from outside.        |
| `onNavigate`      | `(index: number) => void`              |                 | Called when navigation moves.                |
| `disabledIndices` | `number[] \| (index) => boolean`       |                 | Which indices to skip.                       |
| `itemSizes`       | `Dimensions[]`                         |                 | Sizes of grid items spanning several cells.  |
| `dense`           | `boolean`                              | `false`         | The grid is dense.                           |
| `onKeyDown`       | `(event: KeyboardEvent) => void`       |                 | Runs before the built-in arrow key handling. |

`CompositeItem` takes `render`, `ref`, `onFocus` and any other HTML attribute.

`render` is the only way to choose the element. Passing children to `Composite`
without it puts them inside a plain `div`.
