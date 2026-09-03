# Select and listbox

A trigger that opens a list of options with full keyboard support: arrow keys,
Home and End, typeahead, and a selected item that is restored on reopen.

```tsx
import {
  FloatingFocusManager,
  FloatingList,
  FloatingPortal,
  type UseInteractionsReturn,
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListItem,
  useListNavigation,
  useRole,
  useTypeahead,
} from 'solid-floating-ui';
import { For, type JSX, Show, createSignal } from 'solid-js';

interface OptionProps {
  label: string;
  activeIndex: number | null;
  selectedIndex: number | null;
  getItemProps: UseInteractionsReturn['getItemProps'];
  onSelect: (index: number) => void;
}

function Option(props: OptionProps): JSX.Element {
  const listItem = useListItem({
    get label() {
      return props.label;
    },
  });

  const isActive = (): boolean => listItem.index === props.activeIndex;

  return (
    <div
      class="option"
      role="option"
      tabindex={-1}
      aria-selected={listItem.index === props.selectedIndex}
      data-active={isActive()}
      {...props.getItemProps({
        active: isActive(),
        selected: listItem.index === props.selectedIndex,
        onClick: () => {
          props.onSelect(listItem.index);
        },
        onKeyDown: (event: KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            props.onSelect(listItem.index);
          }
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

export interface SelectProps {
  options: string[];
  placeholder?: string;
  onChange?: (value: string) => void;
}

export function Select(props: SelectProps): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const [activeIndex, setActiveIndex] = createSignal<number | null>(null);
  const [selectedIndex, setSelectedIndex] = createSignal<number | null>(null);

  const [items, setItems] = createSignal<(HTMLElement | null)[]>([]);
  const [labels, setLabels] = createSignal<(string | null)[]>([]);

  const floating = useFloating({
    get open() {
      return open();
    },
    onOpenChange: (value) => {
      setOpen(value);
    },
    placement: 'bottom-start',
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          elements.floating.style.minWidth = `${rects.reference.width}px`;
        },
      }),
    ],
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
      onNavigate: (value) => {
        setActiveIndex(value);
      },
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
      onMatch: (value) => {
        setActiveIndex(value);
      },
    }),
  ]);

  function select(index: number): void {
    setSelectedIndex(index);
    setOpen(false);
    const value = props.options[index];
    if (value != null) {
      props.onChange?.(value);
    }
  }

  const label = (): string => {
    const index = selectedIndex();
    return index == null ? (props.placeholder ?? 'Select') : (props.options[index] ?? '');
  };

  return (
    <>
      <button
        type="button"
        {...interactions.getReferenceProps()}
        ref={(element) => {
          floating.refs.setReference(element);
        }}
      >
        {label()}
      </button>

      <Show when={open()}>
        <FloatingPortal>
          <FloatingFocusManager context={floating.context} modal={false}>
            <div
              class="menu"
              {...interactions.getFloatingProps()}
              ref={(element) => {
                floating.refs.setFloating(element);
              }}
              style={floating.floatingStyles}
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
                      getItemProps={(itemProps) => interactions.getItemProps(itemProps)}
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
```

## Notes

- `FloatingList` reports the items it collects through `onElementsChange` and
  `onLabelsChange`. The signals they fill go straight to `useListNavigation`'s
  `items` and `useTypeahead`'s `labels`.
- `useListItem` returns `-1` until the item registers, which is why `isActive`
  compares against a signal rather than caching the index.
- The item must carry `tabindex={-1}`, otherwise `useListNavigation` cannot
  move DOM focus onto it and the arrow keys appear to do nothing.
- List navigation moves focus, it does not activate. The item needs its own
  Enter and Space handling, as above.
- `selectedIndex` on both hooks is what makes reopening land on the current
  value and typeahead start from it.
- The `size()` middleware matches the menu width to the trigger. Add
  `availableHeight` handling in the same `apply` when the list can be taller
  than the viewport.
- Style the active option from `data-active`, not from `:hover`. Keyboard
  navigation and pointer hover both flow through `activeIndex`.
- For a combobox, keep the reference an `<input>`, use `role: 'combobox'`, and
  add `virtual: true` to `useListNavigation` so focus stays in the input and
  the active option is announced through `aria-activedescendant`.
- For a macOS-style select whose list overlaps the trigger, use the `inner`
  middleware with `useInnerOffset`.
