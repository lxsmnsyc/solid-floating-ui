import { type JSX, createContext, onCleanup, useContext } from 'solid-js';
import useId from '../hooks/useId';
import type { FloatingNodeType, FloatingTreeType } from '../types';
import createEventEmitter from '../utils/createEventEmitter';
import { createRef } from '../utils/ref';

const FloatingNodeContext = createContext<FloatingNodeType | null>(null);
const FloatingTreeContext = createContext<FloatingTreeType | null>(null);

/**
 * Returns the parent node id for nested floating elements, if available.
 * Returns `null` for top-level floating elements.
 */
export function useFloatingParentNodeId(): string | null {
  return useContext(FloatingNodeContext)?.id ?? null;
}

/**
 * Returns the nearest floating tree context, if available.
 */
export function useFloatingTree(): FloatingTreeType | null {
  return useContext(FloatingTreeContext);
}

/**
 * Registers a node into the `FloatingTree`, returning its id.
 * @see https://floating-ui.com/docs/FloatingTree
 */
export function useFloatingNodeId(customParentId?: string): string {
  const id = useId();
  const tree = useFloatingTree();
  const contextParentId = useFloatingParentNodeId();
  const parentId = customParentId ?? contextParentId;

  const node: FloatingNodeType = { id, parentId };
  tree?.addNode(node);
  onCleanup(() => {
    tree?.removeNode(node);
  });

  return id;
}

export interface FloatingNodeProps {
  children?: JSX.Element;
  id: string | undefined;
}

/**
 * Provides parent node context for nested floating elements.
 * @see https://floating-ui.com/docs/FloatingTree
 */
export function FloatingNode(props: FloatingNodeProps): JSX.Element {
  const parentId = useFloatingParentNodeId();
  const context: FloatingNodeType = {
    get id() {
      return props.id;
    },
    parentId,
  };

  return (
    <FloatingNodeContext.Provider value={context}>{props.children}</FloatingNodeContext.Provider>
  );
}

export interface FloatingTreeProps {
  children?: JSX.Element;
}

/**
 * Provides context for nested floating elements when they are not children of
 * each other on the DOM. It is necessary for:
 * - The `bubbles` option in the `useDismiss()` Hook
 * - Nested virtual list navigation
 * - Nested floating elements that each open on hover
 * - Custom communication between parent and child floating elements
 * @see https://floating-ui.com/docs/FloatingTree
 */
export function FloatingTree(props: FloatingTreeProps): JSX.Element {
  const nodesRef = createRef<FloatingNodeType[]>([]);
  const events = createEventEmitter();

  const context: FloatingTreeType = {
    nodesRef,
    events,
    addNode(node) {
      nodesRef.current = [...nodesRef.current, node];
    },
    removeNode(node) {
      nodesRef.current = nodesRef.current.filter((n) => n !== node);
    },
  };

  return (
    <FloatingTreeContext.Provider value={context}>{props.children}</FloatingTreeContext.Provider>
  );
}
