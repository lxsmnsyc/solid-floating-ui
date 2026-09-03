import {
  FloatingList,
  createRef,
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

const ITEMS = ['Apple', 'Banana', 'Cherry', 'Damson'];

export default function ListNavigationCase(): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const [activeIndex, setActiveIndex] = createSignal<number | null>(null);
  const [selected, setSelected] = createSignal<string>('');

  const elementsRef = createRef<(HTMLElement | null)[]>([]);
  const labelsRef = createRef<(string | null)[]>([]);

  const floating = useFloating({
    get open() {
      return open();
    },
    onOpenChange: (value) => {
      setOpen(value);
    },
    placement: 'bottom-start',
  });

  const interactions = useInteractions([
    useClick(floating.context),
    useDismiss(floating.context),
    useRole(floating.context, { role: 'listbox' }),
    useListNavigation(floating.context, {
      listRef: () => elementsRef.current,
      get activeIndex() {
        return activeIndex();
      },
      onNavigate: (value) => {
        setActiveIndex(value);
      },
      loop: true,
    }),
    useTypeahead(floating.context, {
      listRef: () => labelsRef.current,
      get activeIndex() {
        return activeIndex();
      },
      onMatch: (value) => {
        setActiveIndex(value);
      },
    }),
  ]);

  return (
    <div>
      <button
        type="button"
        {...interactions.getReferenceProps()}
        ref={(element) => {
          floating.refs.setReference(element);
        }}
        data-testid="reference"
      >
        Fruit: <span data-testid="selected">{selected()}</span>
      </button>
      <Show when={open()}>
        <div
          {...interactions.getFloatingProps()}
          ref={(element) => {
            floating.refs.setFloating(element);
          }}
          style={floating.floatingStyles}
          class="menu"
          data-testid="menu"
        >
          <FloatingList elementsRef={elementsRef} labelsRef={labelsRef}>
            <For each={ITEMS}>
              {(item) => (
                <Item
                  label={item}
                  onSelect={() => {
                    setSelected(item);
                  }}
                />
              )}
            </For>
          </FloatingList>
        </div>
      </Show>
    </div>
  );
}

function Item(props: { label: string; onSelect: () => void }): JSX.Element {
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
      data-testid={`item-${props.label}`}
      data-index={listItem.index}
      onClick={() => {
        props.onSelect();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          props.onSelect();
        }
      }}
    >
      {props.label}
    </div>
  );
}
