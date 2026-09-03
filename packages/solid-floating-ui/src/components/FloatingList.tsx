import {
  type JSX,
  createContext,
  createMemo,
  createRenderEffect,
  createSignal,
  on,
  onCleanup,
  useContext,
} from 'solid-js';
import type { Ref } from '../utils/ref';

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
  readonly map: Map<Node, number | null>;
  elementsRef: Ref<(HTMLElement | null)[]>;
  labelsRef?: Ref<(string | null)[]> | undefined;
}

export const FloatingListContext = createContext<FloatingListContextValue>({
  register: () => {},
  unregister: () => {},
  map: new Map(),
  elementsRef: { current: [] },
});

export interface FloatingListProps {
  children: JSX.Element;
  /**
   * A ref to the list of HTML elements, ordered by their index.
   * `useListNavigation`'s `listRef` prop.
   */
  elementsRef: Ref<(HTMLElement | null)[]>;
  /**
   * A ref to the list of element labels, ordered by their index.
   * `useTypeahead`'s `listRef` prop.
   */
  labelsRef?: Ref<(string | null)[]> | undefined;
}

/**
 * Provides context for a list of items within the floating element.
 * @see https://floating-ui.com/docs/FloatingList
 */
export function FloatingList(props: FloatingListProps): JSX.Element {
  const [nodes, setNodes] = createSignal(new Set<Node>(), { equals: false });

  function register(node: Node): void {
    setNodes((previous) => {
      const next = new Set(previous);
      next.add(node);
      return next;
    });
  }

  function unregister(node: Node): void {
    setNodes((previous) => {
      const next = new Set(previous);
      next.delete(node);
      return next;
    });
  }

  const map = createMemo(() => {
    const newMap = new Map<Node, number>();
    const sortedNodes = Array.from(nodes().keys()).sort(sortByDocumentPosition);

    sortedNodes.forEach((node, index) => {
      newMap.set(node, index);
    });

    return newMap;
  });

  const context: FloatingListContextValue = {
    register,
    unregister,
    get map() {
      return map();
    },
    get elementsRef() {
      return props.elementsRef;
    },
    get labelsRef() {
      return props.labelsRef;
    },
  };

  return (
    <FloatingListContext.Provider value={context}>{props.children}</FloatingListContext.Provider>
  );
}

export interface UseListItemProps {
  label?: string | null | undefined;
}

export interface UseListItemReturn {
  ref: (node: HTMLElement | null) => void;
  readonly index: number;
}

/**
 * Registers a list item and its index (DOM position) in the `FloatingList`.
 * @see https://floating-ui.com/docs/FloatingList#uselistitem
 */
export function useListItem(props: UseListItemProps = {}): UseListItemReturn {
  const listContext = useContext(FloatingListContext);

  const [index, setIndex] = createSignal<number | null>(null);

  let element: HTMLElement | null = null;

  function ref(node: HTMLElement | null): void {
    if (node === element) {
      return;
    }
    element = node;
    syncElement();

    if (node) {
      listContext.register(node);
      onCleanup(() => {
        listContext.unregister(node);
      });
    }
  }

  function syncElement(): void {
    const currentIndex = index();
    if (currentIndex === null) {
      return;
    }

    listContext.elementsRef.current[currentIndex] = element;

    const labelsRef = listContext.labelsRef;
    if (labelsRef) {
      labelsRef.current[currentIndex] =
        props.label === undefined ? (element?.textContent ?? null) : props.label;
    }
  }

  // The map is read before the element is checked so that registering the
  // element re-runs this and hands the item its index.
  createRenderEffect(() => {
    const map = listContext.map;
    const nextIndex = element === null ? null : map.get(element);
    if (nextIndex != null) {
      setIndex(nextIndex);
    }
  });

  createRenderEffect(
    on([index, () => props.label], () => {
      syncElement();
    }),
  );

  return {
    ref,
    get index() {
      return index() ?? -1;
    },
  };
}
