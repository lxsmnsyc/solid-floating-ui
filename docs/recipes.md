# Recipes

Each of these is a complete pattern. They assume the imports come from
`solid-floating-ui` and `solid-js`.

## Tooltip

Hover and focus open it, the escape key closes it, and `useRole` supplies the
`aria-describedby` wiring.

```jsx
function Tooltip(props) {
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
    useHover(floating.context, { move: false, delay: { open: 300 } }),
    useFocus(floating.context),
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
        {props.children}
      </button>
      <Show when={open()}>
        <FloatingPortal>
          <div
            {...interactions.getFloatingProps()}
            ref={(element) => {
              floating.refs.setFloating(element);
            }}
            style={floating.floatingStyles}
            class="tooltip"
          >
            {props.label}
          </div>
        </FloatingPortal>
      </Show>
    </>
  );
}
```

`move: false` stops the tooltip opening when the cursor merely crosses the
reference without a hover event, which matters for elements that appear under a
stationary cursor.

## Popover

A click-triggered panel with modal focus management.

```jsx
function Popover(props) {
  const [open, setOpen] = createSignal(false);

  const floating = useFloating({
    get open() {
      return open();
    },
    onOpenChange: (value) => {
      setOpen(value);
    },
    placement: 'bottom-start',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const interactions = useInteractions([
    useClick(floating.context),
    useDismiss(floating.context),
    useRole(floating.context, { role: 'dialog' }),
  ]);

  return (
    <>
      <button
        {...interactions.getReferenceProps()}
        ref={(element) => {
          floating.refs.setReference(element);
        }}
      >
        {props.label}
      </button>
      <Show when={open()}>
        <FloatingPortal>
          <FloatingFocusManager context={floating.context} modal>
            <div
              {...interactions.getFloatingProps()}
              ref={(element) => {
                floating.refs.setFloating(element);
              }}
              style={floating.floatingStyles}
              class="popover"
            >
              {props.children}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      </Show>
    </>
  );
}
```

Add a `FloatingOverlay` with `lockScroll` around the focus manager to make it a
dialog rather than a popover.

## Dropdown menu

`FloatingList` collects the items, `useListNavigation` moves between them, and
`useTypeahead` jumps to one by name.

```jsx
function Select(props) {
  const [open, setOpen] = createSignal(false);
  const [activeIndex, setActiveIndex] = createSignal(null);
  const [selectedIndex, setSelectedIndex] = createSignal(null);

  const [items, setItems] = createSignal([]);
  const [labels, setLabels] = createSignal([]);

  const floating = useFloating({
    get open() {
      return open();
    },
    onOpenChange: (value) => {
      setOpen(value);
    },
    placement: 'bottom-start',
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const interactions = useInteractions([
    useClick(floating.context),
    useDismiss(floating.context),
    useRole(floating.context, { role: 'listbox' }),
    useListNavigation(floating.context, {
      items,
      get activeIndex() {
        return activeIndex();
      },
      get selectedIndex() {
        return selectedIndex();
      },
      onNavigate: setActiveIndex,
      loop: true,
    }),
    useTypeahead(floating.context, {
      labels,
      get activeIndex() {
        return activeIndex();
      },
      get selectedIndex() {
        return selectedIndex();
      },
      onMatch: setActiveIndex,
    }),
  ]);

  function select(index) {
    setSelectedIndex(index);
    setOpen(false);
  }

  return (
    <>
      <button
        {...interactions.getReferenceProps()}
        ref={(element) => {
          floating.refs.setReference(element);
        }}
      >
        {props.options[selectedIndex() ?? -1] ?? 'Select'}
      </button>
      <Show when={open()}>
        <FloatingPortal>
          <FloatingFocusManager context={floating.context} modal={false}>
            <div
              {...interactions.getFloatingProps()}
              ref={(element) => {
                floating.refs.setFloating(element);
              }}
              style={floating.floatingStyles}
              class="menu"
            >
              <FloatingList
                onElementsChange={(value) => {
                  setItems(value);
                }}
                onLabelsChange={(value) => {
                  setLabels(value);
                }}
              >
                <For each={props.options}>
                  {(option) => (
                    <Option
                      label={option}
                      activeIndex={activeIndex()}
                      selectedIndex={selectedIndex()}
                      getItemProps={interactions.getItemProps}
                      onSelect={select}
                    />
                  )}
                </For>
              </FloatingList>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      </Show>
    </>
  );
}

function Option(props) {
  const listItem = useListItem({
    get label() {
      return props.label;
    },
  });

  const isActive = () => listItem.index === props.activeIndex;

  return (
    <div
      role="option"
      tabindex={-1}
      {...props.getItemProps({
        active: isActive(),
        selected: listItem.index === props.selectedIndex,
        onClick: () => {
          props.onSelect(listItem.index);
        },
      })}
      ref={(element) => {
        listItem.ref(element);
      }}
      class="option"
      classList={{ active: isActive() }}
    >
      {props.label}
    </div>
  );
}
```

## Context menu

`useClientPoint` with explicit coordinates positions the menu where the user
right-clicked.

```jsx
function ContextMenu(props) {
  const [open, setOpen] = createSignal(false);
  const [point, setPoint] = createSignal({ x: 0, y: 0 });

  const floating = useFloating({
    get open() {
      return open();
    },
    onOpenChange: (value) => {
      setOpen(value);
    },
    placement: 'bottom-start',
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useClientPoint(floating.context, {
    get x() {
      return point().x;
    },
    get y() {
      return point().y;
    },
  });

  const interactions = useInteractions([
    useDismiss(floating.context),
    useRole(floating.context, { role: 'menu' }),
  ]);

  return (
    <>
      <div
        onContextMenu={(event) => {
          event.preventDefault();
          setPoint({ x: event.clientX, y: event.clientY });
          setOpen(true);
        }}
      >
        {props.children}
      </div>
      <Show when={open()}>
        <FloatingPortal>
          <div
            {...interactions.getFloatingProps()}
            ref={(element) => {
              floating.refs.setFloating(element);
            }}
            style={floating.floatingStyles}
            class="menu"
          >
            {props.items}
          </div>
        </FloatingPortal>
      </Show>
    </>
  );
}
```

## Interactive tooltip that follows the cursor

Restricting `useClientPoint` to one axis leaves a stable path from the
reference into the floating element, and `safePolygon` keeps it open while the
cursor travels.

```js
useClientPoint(floating.context, { axis: 'x' });

useInteractions([
  useHover(floating.context, {
    handleClose: safePolygon({ requireIntent: true }),
  }),
]);
```

## Nested menus

Wrap the whole tree once, and give each menu a node id.

```jsx
<FloatingTree>
  <Menu label="File">
    <MenuItem label="Open" />
    <Menu label="Recent">
      <MenuItem label="Yesterday" />
    </Menu>
  </Menu>
</FloatingTree>;

function Menu(props) {
  const nodeId = useFloatingNodeId();
  const parentId = useFloatingParentNodeId();
  const isNested = () => parentId !== null;

  const [open, setOpen] = createSignal(false);

  const floating = useFloating({
    nodeId,
    get open() {
      return open();
    },
    onOpenChange: (value) => {
      setOpen(value);
    },
    get placement() {
      return isNested() ? 'right-start' : 'bottom-start';
    },
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const interactions = useInteractions([
    useHover(floating.context, {
      get enabled() {
        return isNested();
      },
      handleClose: safePolygon(),
    }),
    useClick(floating.context, {
      get ignoreMouse() {
        return isNested();
      },
    }),
    useDismiss(floating.context, { bubbles: true }),
    useRole(floating.context, { role: 'menu' }),
  ]);

  return <FloatingNode id={nodeId}>{/* reference and floating markup */}</FloatingNode>;
}
```

`bubbles: true` on `useDismiss` is what makes one escape key press close the
whole chain rather than only the innermost menu.
