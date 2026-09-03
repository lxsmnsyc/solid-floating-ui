import type { VirtualElement } from '@floating-ui/dom';
import { isElement } from '@floating-ui/utils/dom';
import { createMemo, createRenderEffect, createSignal } from 'solid-js';
import { useFloatingTree } from '../components/FloatingTree';
import type {
  FloatingContext,
  ReferenceType,
  UseFloatingOptions,
  UseFloatingReturn,
} from '../types';
import { createRef } from '../utils/ref';
import { useFloatingRootContext } from './useFloatingRootContext';
import usePosition from './usePosition';

/**
 * Provides data to position a floating element and context to add interactions.
 * @see https://floating-ui.com/docs/useFloating
 */
export default function useFloating(options: UseFloatingOptions = {}): UseFloatingReturn {
  const internalRootContext = useFloatingRootContext({
    get open() {
      return options.open;
    },
    get onOpenChange() {
      return options.onOpenChange;
    },
    elements: {
      get reference() {
        return options.elements?.reference ?? null;
      },
      get floating() {
        return options.elements?.floating ?? null;
      },
    },
  });

  const rootContext = options.rootContext ?? internalRootContext;

  const [internalDomReference, setInternalDomReference] = createSignal<Element | null>(null);
  const [positionReference, setPositionReferenceSignal] = createSignal<ReferenceType | null>(null);

  const domReference = createMemo(
    () => rootContext.elements.domReference ?? internalDomReference(),
  );
  const domReferenceRef = createRef<Element | null>(null);

  const tree = useFloatingTree();

  createRenderEffect(() => {
    const node = domReference();
    if (node) {
      domReferenceRef.current = node;
    }
  });

  const position = usePosition({
    get placement() {
      return options.placement;
    },
    get strategy() {
      return options.strategy;
    },
    get middleware() {
      return options.middleware;
    },
    get platform() {
      return options.platform;
    },
    get transform() {
      return options.transform;
    },
    get open() {
      return options.open;
    },
    get whileElementsMounted() {
      return options.whileElementsMounted;
    },
    elements: {
      get reference() {
        return positionReference() ?? rootContext.elements.reference;
      },
      get floating() {
        return rootContext.elements.floating;
      },
    },
  });

  function setPositionReference(node: ReferenceType | null): void {
    const computedPositionReference = isElement(node)
      ? ({
          getBoundingClientRect: () => node.getBoundingClientRect(),
          getClientRects: () => node.getClientRects(),
          contextElement: node,
        } satisfies VirtualElement)
      : node;
    setPositionReferenceSignal(() => computedPositionReference);
    position.refs.setReference(computedPositionReference);
  }

  function setReference(node: ReferenceType | null): void {
    if (isElement(node) || node === null) {
      domReferenceRef.current = node;
      setInternalDomReference(() => node);
    }

    // Backwards-compatibility for passing a virtual element to `reference`
    // after it has set the DOM reference.
    if (
      isElement(position.refs.reference.current) ||
      position.refs.reference.current === null ||
      // Don't allow setting virtual elements using the old technique back to
      // `null` to support `positionReference` + an unstable `reference`
      // callback ref.
      (node !== null && !isElement(node))
    ) {
      position.refs.setReference(node);
    }
  }

  const refs = {
    reference: position.refs.reference as { current: ReferenceType | null },
    floating: position.refs.floating,
    domReference: domReferenceRef,
    setReference,
    setFloating(node: HTMLElement | null) {
      position.refs.setFloating(node);
    },
    setPositionReference,
  };

  const elements = {
    get reference() {
      return position.elements.reference;
    },
    get floating() {
      return position.elements.floating;
    },
    get domReference() {
      return domReference();
    },
  };

  const context: FloatingContext = {
    get x() {
      return position.x;
    },
    get y() {
      return position.y;
    },
    get placement() {
      return position.placement;
    },
    get strategy() {
      return position.strategy;
    },
    get middlewareData() {
      return position.middlewareData;
    },
    get isPositioned() {
      return position.isPositioned;
    },
    get floatingStyles() {
      return position.floatingStyles;
    },
    update() {
      position.update();
    },
    get open() {
      return rootContext.open;
    },
    onOpenChange(open, event, reason) {
      rootContext.onOpenChange(open, event, reason);
    },
    events: rootContext.events,
    dataRef: rootContext.dataRef,
    floatingId: rootContext.floatingId,
    get nodeId() {
      return options.nodeId;
    },
    refs,
    elements,
  };

  rootContext.dataRef.current.floatingContext = context;

  createRenderEffect(() => {
    const node = tree?.nodesRef.current.find((n) => n.id === options.nodeId);
    if (node) {
      node.context = context;
    }
  });

  return {
    get x() {
      return position.x;
    },
    get y() {
      return position.y;
    },
    get placement() {
      return position.placement;
    },
    get strategy() {
      return position.strategy;
    },
    get middlewareData() {
      return position.middlewareData;
    },
    get isPositioned() {
      return position.isPositioned;
    },
    get floatingStyles() {
      return position.floatingStyles;
    },
    update() {
      position.update();
    },
    context,
    refs,
    elements,
  };
}
