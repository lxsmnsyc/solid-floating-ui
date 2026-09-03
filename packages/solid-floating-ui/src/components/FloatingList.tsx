import {
  type JSX,
  createContext,
  createMemo,
  createRenderEffect,
  createSignal,
  onCleanup,
  useContext,
} from 'solid-js';

function sortByDocumentPosition(a: Node, b: Node): number {
  const position = a.compareDocumentPosition(b);

  if (
    position & Node.DOCUMENT_POSITION_FOLLOWING ||
    position & Node.DOCUMENT_POSITION_CONTAINED_BY
  ) {
    return -1;
  }

  if (position & Node.DOCUMENT_POSITION_PRECEDING || position & Node.DOCUMENT_POSITION_CONTAINS) {
    return 1;
  }

  return 0;
}

export interface FloatingListContextValue {
  register(node: Node): void;
  unregister(node: Node): void;
  setLabel(node: Node, label: string | null): void;
  readonly map: Map<Node, number>;
}

export const FloatingListContext = createContext<FloatingListContextValue>({
  register: () => {},
  unregister: () => {},
  setLabel: () => {},
  map: new Map(),
});

export interface FloatingListProps {
  children: JSX.Element;
  /**
   * Called with the registered items in DOM order whenever the list changes.
   * Feed the signal it fills to `useListNavigation`'s `items`.
   */
  onElementsChange?: ((elements: (HTMLElement | null)[]) => void) | undefined;
  /**
   * Called with the item labels in the same order as the elements. Feed the
   * signal it fills to `useTypeahead`'s `labels`.
   */
  onLabelsChange?: ((labels: (string | null)[]) => void) | undefined;
}

/**
 * Collects the items rendered inside it, in DOM order, and hands them to the
 * navigation hooks. The items register themselves with `useListItem`, so
 * conditional and reordered lists stay correct without an index prop.
 */
export function FloatingList(props: FloatingListProps): JSX.Element {
  const [nodes, setNodes] = createSignal(new Set<Node>(), { equals: false });
  const [labels, setLabels] = createSignal(new Map<Node, string | null>(), { equals: false });

  function register(node: Node): void {
    setNodes((previous) => {
      previous.add(node);
      return previous;
    });
  }

  function unregister(node: Node): void {
    setNodes((previous) => {
      previous.delete(node);
      return previous;
    });
    setLabels((previous) => {
      previous.delete(node);
      return previous;
    });
  }

  function setLabel(node: Node, label: string | null): void {
    setLabels((previous) => {
      previous.set(node, label);
      return previous;
    });
  }

  const sorted = createMemo(() => Array.from(nodes()).sort(sortByDocumentPosition));

  const map = createMemo(() => {
    const result = new Map<Node, number>();
    sorted().forEach((node, index) => {
      result.set(node, index);
    });
    return result;
  });

  createRenderEffect(() => {
    props.onElementsChange?.(sorted().map((node) => (node instanceof HTMLElement ? node : null)));
  });

  createRenderEffect(() => {
    const currentLabels = labels();
    props.onLabelsChange?.(sorted().map((node) => currentLabels.get(node) ?? null));
  });

  const context: FloatingListContextValue = {
    register,
    unregister,
    setLabel,
    get map() {
      return map();
    },
  };

  return (
    <FloatingListContext.Provider value={context}>{props.children}</FloatingListContext.Provider>
  );
}

export interface UseListItemProps {
  /**
   * The string typeahead matches against. Defaults to the item's text content.
   */
  label?: string | null | undefined;
}

export interface UseListItemReturn {
  ref: (node: HTMLElement | null) => void;
  /**
   * The item's position in the list, or -1 until it has registered.
   */
  readonly index: number;
}

/**
 * Registers a list item and reports its index (DOM position) in the
 * surrounding `FloatingList`.
 */
export function useListItem(props: UseListItemProps = {}): UseListItemReturn {
  const listContext = useContext(FloatingListContext);

  const [element, setElement] = createSignal<HTMLElement | null>(null);

  function ref(node: HTMLElement | null): void {
    if (node === element()) {
      return;
    }
    setElement(node);

    if (node) {
      listContext.register(node);
      onCleanup(() => {
        listContext.unregister(node);
      });
    }
  }

  createRenderEffect(() => {
    const node = element();
    if (node) {
      listContext.setLabel(node, props.label === undefined ? node.textContent : props.label);
    }
  });

  const index = createMemo(() => {
    const node = element();
    return node === null ? -1 : (listContext.map.get(node) ?? -1);
  });

  return {
    ref,
    get index() {
      return index();
    },
  };
}
