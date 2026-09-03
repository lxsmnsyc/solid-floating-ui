import {
  FloatingFocusManager,
  FloatingList,
  FloatingNode,
  FloatingPortal,
  FloatingTree,
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
import type { UseInteractionsReturn } from 'solid-floating-ui';
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

  const [elements, setElements] = createSignal<(HTMLElement | null)[]>([]);
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
      items: elements,
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
            class="trigger"
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
                    setElements(value);
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

export default function MenuDemo(): JSX.Element {
  const [chosen, setChosen] = createSignal('nothing yet');

  return (
    <>
      <div class="stage">
        <FloatingTree>
          <Menu label="File">
            <MenuItem
              label="New"
              onSelect={() => {
                setChosen('New');
              }}
            />
            <MenuItem
              label="Open"
              onSelect={() => {
                setChosen('Open');
              }}
            />
            <Menu label="Open recent">
              <MenuItem
                label="Yesterday"
                onSelect={() => {
                  setChosen('Yesterday');
                }}
              />
              <MenuItem
                label="Last week"
                onSelect={() => {
                  setChosen('Last week');
                }}
              />
              <Menu label="Archive">
                <MenuItem
                  label="2024"
                  onSelect={() => {
                    setChosen('2024');
                  }}
                />
                <MenuItem
                  label="2023"
                  onSelect={() => {
                    setChosen('2023');
                  }}
                />
              </Menu>
            </Menu>
            <MenuItem
              label="Save"
              onSelect={() => {
                setChosen('Save');
              }}
            />
          </Menu>
        </FloatingTree>
      </div>

      <p class="readout">last chosen: {chosen()}</p>
      <p class="note">
        Submenus open on hover with a <code>safePolygon</code>, so the pointer can cut across the
        gap diagonally. Escape closes the whole chain because <code>useDismiss</code> has{' '}
        <code>bubbles</code> on.
      </p>
    </>
  );
}
