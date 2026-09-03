import { isElement } from '@floating-ui/utils/dom';
import { DEV, createSignal, untrack } from 'solid-js';
import { useFloatingParentNodeId } from '../components/FloatingTree';
import type { ContextData, FloatingRootContext, OpenChangeReason, ReferenceType } from '../types';
import createEventEmitter from '../utils/createEventEmitter';
import { error } from '../utils/log';
import useId from './useId';

export interface UseFloatingRootContextOptions {
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean, event?: Event, reason?: OpenChangeReason) => void) | undefined;
  elements: {
    readonly reference: Element | null;
    readonly floating: HTMLElement | null;
  };
}

/**
 * Creates the shared context an external floating element needs when its
 * position is managed elsewhere, so interaction hooks can still be attached.
 */
export function useFloatingRootContext(
  options: UseFloatingRootContextOptions,
): FloatingRootContext {
  const floatingId = useId();
  const data: ContextData = {};
  const events = createEventEmitter();
  const nested = useFloatingParentNodeId() != null;

  const [positionReference, setPositionReference] = createSignal<ReferenceType | null>(null);

  // Handlers run outside tracking so a caller's `onOpenChange` never
  // subscribes the effect that happened to trigger it.
  function onOpenChange(open: boolean, event?: Event, reason?: OpenChangeReason): void {
    untrack(() => {
      data.openEvent = open ? event : undefined;
      events.emit('openchange', { open, event, reason, nested });
      options.onOpenChange?.(open, event, reason);
    });
  }

  const elements = {
    get reference(): ReferenceType | null {
      const domReference = options.elements.reference;
      if (DEV && domReference && !isElement(domReference)) {
        error(
          'Cannot pass a virtual element to the `elements.reference` option,',
          'as it must be a real DOM element. Use `refs.setPositionReference()`',
          'instead.',
        );
      }
      return positionReference() ?? domReference ?? null;
    },
    get floating(): HTMLElement | null {
      return options.elements.floating ?? null;
    },
    get domReference(): Element | null {
      return options.elements.reference ?? null;
    },
  };

  return {
    data,
    get open() {
      return options.open ?? false;
    },
    onOpenChange,
    elements,
    events,
    floatingId,
    refs: {
      setPositionReference(node) {
        setPositionReference(() => node);
      },
    },
  };
}
