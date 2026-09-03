import {
  FloatingFocusManager,
  FloatingList,
  FloatingPortal,
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
import type { UseInteractionsReturn } from 'solid-floating-ui';
import { For, type JSX, Show, createSignal } from 'solid-js';

const FRUITS = [
  'Apple',
  'Apricot',
  'Banana',
  'Blackberry',
  'Blueberry',
  'Cherry',
  'Damson',
  'Elderberry',
  'Fig',
  'Grape',
  'Lychee',
  'Mango',
];

function Option(props: {
  label: string;
  activeIndex: number | null;
  selectedIndex: number | null;
  getItemProps: UseInteractionsReturn['getItemProps'];
  onSelect: (index: number) => void;
}): JSX.Element {
  const listItem = useListItem({
    get label() {
      return props.label;
    },
  });

  const isActive = (): boolean => listItem.index === props.activeIndex;
  const isSelected = (): boolean => listItem.index === props.selectedIndex;

  return (
    <div
      class="option"
      role="option"
      tabindex={-1}
      aria-selected={isSelected()}
      data-active={isActive()}
      {...props.getItemProps({
        active: isActive(),
        selected: isSelected(),
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
      <span>{props.label}</span>
      <Show when={isSelected()}>
        <span aria-hidden="true">✓</span>
      </Show>
    </div>
  );
}

export default function SelectDemo(): JSX.Element {
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
  }

  const selectedLabel = (): string | undefined => {
    const index = selectedIndex();
    return index == null ? 'Pick a fruit' : FRUITS[index];
  };

  return (
    <>
      <div class="stage">
        <button
          type="button"
          class="trigger"
          {...interactions.getReferenceProps()}
          ref={(element) => {
            floating.refs.setReference(element);
          }}
        >
          {selectedLabel()}
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
                  <For each={FRUITS}>
                    {(fruit) => (
                      <Option
                        label={fruit}
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
      </div>

      <p class="note">
        Open it and type <code>bl</code> to jump to Blackberry. Arrow keys loop, Home and End jump
        to the ends, and the <code>size()</code> middleware matches the menu width to the trigger.
      </p>
    </>
  );
}
