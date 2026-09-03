# Dropdown and nested menus

A menu whose items may themselves be menus. `FloatingTree` relates the levels,
so one Escape closes the chain and an outside press does not close only the
innermost one.

```tsx
import {
  FloatingFocusManager,
  FloatingList,
  FloatingNode,
  FloatingPortal,
  FloatingTree,
  type UseInteractionsReturn,
  autoUpdate,
  flip,
  offset,
  safePolygon,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useHover,
  useInteractions,
  useListItem,
  useListNavigation,
  useRole,
  useTypeahead,
} from 'solid-floating-ui';
import { type JSX, Show, createContext, createSignal, useContext } from 'solid-js';

interface MenuContextValue {
  readonly activeIndex: number | null;
  getItemProps: UseInteractionsReturn['getItemProps'];
  close(): void;
}

const MenuContext = createContext<MenuContextValue>();

export function MenuItem(props: { label: string; onSelect?: () => void }): JSX.Element {
  const menu = useContext(MenuContext);
  const listItem = useListItem({
    get label() {
      return props.label;
    },
  });

  const isActive = (): boolean => listItem.index === menu?.activeIndex;

  return (
    <div
      class="option"
      role="menuitem"
      tabindex={-1}
      data-active={isActive()}
      {...menu?.getItemProps({
        active: isActive(),
        onClick: () => {
          props.onSelect?.();
          menu.close();
        },
      })}
      ref={(element) => {
        listItem.ref(element);
      }}
    >
      {props.label}
    </div>
  );
}

export function Menu(props: { label: string; children: JSX.Element }): JSX.Element {
  const nodeId = useFloatingNodeId();
  const parentId = useFloatingParentNodeId();
  const isNested = (): boolean => parentId !== null;

  const [open, setOpen] = createSignal(false);
  const [activeIndex, setActiveIndex] = createSignal<number | null>(null);

  const [items, setItems] = createSignal<(HTMLElement | null)[]>([]);
  const [labels, setLabels] = createSignal<(string | null)[]>([]);

  const parent = useContext(MenuContext);
  const listItem = useListItem({
    get label() {
      return props.label;
    },
  });

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
    get middleware() {
      return [offset(isNested() ? { mainAxis: 4, alignmentAxis: -4 } : 4), flip(), shift()];
    },
    whileElementsMounted: autoUpdate,
  });

  const interactions = useInteractions([
    useHover(floating.context, {
      get enabled() {
        return isNested();
      },
      delay: { open: 60 },
      handleClose: safePolygon({ blockPointerEvents: true }),
    }),
    useClick(floating.context, {
      get ignoreMouse() {
        return isNested();
      },
      get toggle() {
        return !isNested();
      },
    }),
    useDismiss(floating.context, { bubbles: true }),
    useRole(floating.context, { role: 'menu' }),
    useListNavigation(floating.context, {
      items,
      get activeIndex() {
        return activeIndex();
      },
      onNavigate: (value) => {
        setActiveIndex(value);
      },
      get nested() {
        return isNested();
      },
      loop: true,
    }),
    useTypeahead(floating.context, {
      labels,
      get activeIndex() {
        return activeIndex();
      },
      onMatch: (value) => {
        setActiveIndex(value);
      },
    }),
  ]);

  const context: MenuContextValue = {
    get activeIndex() {
      return activeIndex();
    },
    getItemProps(itemProps) {
      return interactions.getItemProps(itemProps);
    },
    close() {
      setOpen(false);
    },
  };

  const isActiveItem = (): boolean => listItem.index === parent?.activeIndex;

  return (
    <FloatingNode id={nodeId}>
      <Show
        when={isNested()}
        fallback={
          <button
            type="button"
            {...interactions.getReferenceProps()}
            ref={(element) => {
              floating.refs.setReference(element);
            }}
          >
            {props.label}
          </button>
        }
      >
        <div
          class="option"
          role="menuitem"
          tabindex={-1}
          data-active={isActiveItem()}
          {...interactions.getReferenceProps(
            parent?.getItemProps({ active: isActiveItem() }) ?? {},
          )}
          ref={(element) => {
            floating.refs.setReference(element);
            listItem.ref(element);
          }}
        >
          <span>{props.label}</span>
          <span aria-hidden="true">›</span>
        </div>
      </Show>

      <Show when={open()}>
        <FloatingPortal>
          <FloatingFocusManager
            context={floating.context}
            modal={false}
            initialFocus={-1}
            returnFocus={!isNested()}
          >
            <div
              class="menu"
              {...interactions.getFloatingProps()}
              ref={(element) => {
                floating.refs.setFloating(element);
              }}
              style={floating.floatingStyles}
            >
              <MenuContext.Provider value={context}>
                <FloatingList
                  onElementsChange={(value) => {
                    setItems(value);
                  }}
                  onLabelsChange={(value) => {
                    setLabels(value);
                  }}
                >
                  {props.children}
                </FloatingList>
              </MenuContext.Provider>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      </Show>
    </FloatingNode>
  );
}
```

Use it inside one `FloatingTree`:

```tsx
<FloatingTree>
  <Menu label="File">
    <MenuItem label="New" onSelect={create} />
    <Menu label="Open recent">
      <MenuItem label="Yesterday" onSelect={openYesterday} />
    </Menu>
  </Menu>
</FloatingTree>
```

## Notes

- `FloatingTree` goes above the outermost menu, once. `useFloatingNodeId` is
  registered with the parent automatically, and `nodeId` must be passed to
  `useFloating`.
- A submenu is both a reference for its own menu and an item of its parent, so
  its element takes both refs and both sets of props.
- `bubbles: true` on `useDismiss` is what makes one Escape close the whole
  chain.
- `safePolygon` lets the pointer cut diagonally across the gap to a submenu
  without the parent closing it. `blockPointerEvents` stops the pointer from
  activating whatever it passes over on the way.
- `ignoreMouse` on nested menus leaves opening to hover, while keyboard
  activation still works. `toggle: false` on nested menus stops a click from
  closing a submenu that hover just opened.
- `initialFocus={-1}` keeps focus on the item that opened the submenu, which is
  what a menu should do; list navigation moves focus from there.
- Every item needs `tabindex={-1}`, otherwise list navigation cannot move DOM
  focus onto it.
