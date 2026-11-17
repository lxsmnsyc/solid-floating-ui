import { createTrackingEffect } from '../utils/reactivity';
import type { VirtualElement } from '@floating-ui/dom';
import { isElement } from '@floating-ui/utils/dom';
import { createMemo, createSignal } from 'solid-js';
import { useFloatingTree } from '../components/FloatingTree';
import type {
  FloatingContext,
  ReferenceType,
  UseFloatingOptions,
  UseFloatingReturn,
} from '../types';
import { useFloatingRootContext } from './useFloatingRootContext';
import usePosition from './usePosition';

/**
 * Provides data to position a floating element and context to add interactions.
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

  const tree = useFloatingTree();

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
      setInternalDomReference(() => node);
    }

    // Passing a virtual element to `reference` after the DOM reference has
    // been set is still supported, but a virtual reference is never set back
    // to `null` that way, so that `positionReference` keeps working alongside
    // an unstable `reference` callback ref.
    const current = position.elements.reference;
    if (isElement(current) || current === null || (node !== null && !isElement(node))) {
      position.refs.setReference(node);
    }
  }

  const refs = {
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
    data: rootContext.data,
    floatingId: rootContext.floatingId,
    get nodeId() {
      return options.nodeId;
    },
    refs,
    elements,
  };

  rootContext.data.floatingContext = context;

  createTrackingEffect(() => {
    const node = tree?.nodes().find((n) => n.id === options.nodeId);
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
