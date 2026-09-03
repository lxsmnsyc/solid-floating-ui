import { getWindow } from '@floating-ui/utils/dom';
import { createRenderEffect, createSignal } from 'solid-js';
import type { AnyElementProps, ContextData, ElementProps, FloatingRootContext } from '../types';
import { contains, getTarget } from '../utils/element';
import { isMouseLikePointerType } from '../utils/event';
import { createCleanupEffect } from '../utils/reactivity';
import type { Ref } from '../utils/ref';

interface VirtualElementData {
  axis: 'x' | 'y' | 'both';
  dataRef: Ref<ContextData>;
  pointerType: string | undefined;
  x: number | null;
  y: number | null;
}

function createVirtualElement(
  domElement: Element | null | undefined,
  data: VirtualElementData,
): { contextElement: Element | undefined; getBoundingClientRect(): DOMRect } {
  let offsetX: number | null = null;
  let offsetY: number | null = null;
  let isAutoUpdateEvent = false;

  return {
    contextElement: domElement ?? undefined,
    getBoundingClientRect() {
      const domRect = domElement?.getBoundingClientRect() ?? {
        width: 0,
        height: 0,
        x: 0,
        y: 0,
      };

      const isXAxis = data.axis === 'x' || data.axis === 'both';
      const isYAxis = data.axis === 'y' || data.axis === 'both';
      const canTrackCursorOnAutoUpdate =
        ['mouseenter', 'mousemove'].includes(data.dataRef.current.openEvent?.type ?? '') &&
        data.pointerType !== 'touch';

      let x = domRect.x;
      let y = domRect.y;

      if (offsetX == null && data.x && isXAxis) {
        offsetX = domRect.x - data.x;
      }

      if (offsetY == null && data.y && isYAxis) {
        offsetY = domRect.y - data.y;
      }

      x -= offsetX ?? 0;
      y -= offsetY ?? 0;
      let width = 0;
      let height = 0;

      if (!isAutoUpdateEvent || canTrackCursorOnAutoUpdate) {
        width = data.axis === 'y' ? domRect.width : 0;
        height = data.axis === 'x' ? domRect.height : 0;
        if (isXAxis && data.x != null) {
          x = data.x;
        }
        if (isYAxis && data.y != null) {
          y = data.y;
        }
      } else {
        height = data.axis === 'x' ? domRect.height : height;
        width = data.axis === 'y' ? domRect.width : width;
      }

      isAutoUpdateEvent = true;

      return {
        width,
        height,
        x,
        y,
        top: y,
        right: x + width,
        bottom: y + height,
        left: x,
        toJSON: () => ({}),
      };
    },
  };
}

function isMouseBasedEvent(event: Event | undefined): event is MouseEvent {
  return event instanceof MouseEvent;
}

export interface UseClientPointProps {
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * Whether to restrict the client point to an axis and use the reference
   * element (if it exists) as the other axis. This can be useful if the
   * floating element is also interactive.
   * @default 'both'
   */
  axis?: 'x' | 'y' | 'both' | undefined;
  /**
   * An explicitly defined `x` client coordinate.
   * @default null
   */
  x?: number | null | undefined;
  /**
   * An explicitly defined `y` client coordinate.
   * @default null
   */
  y?: number | null | undefined;
}

/**
 * Positions the floating element relative to a client point (in the viewport),
 * such as the mouse position. By default, it follows the mouse cursor.
 * @see https://floating-ui.com/docs/useClientPoint
 */
export function useClientPoint(
  context: FloatingRootContext,
  props: UseClientPointProps = {},
): ElementProps {
  const enabled = (): boolean => props.enabled !== false;
  const axis = (): 'x' | 'y' | 'both' => props.axis ?? 'both';
  const x = (): number | null => props.x ?? null;
  const y = (): number | null => props.y ?? null;

  let initial = false;
  let cleanupListener: (() => void) | null = null;

  const [pointerType, setPointerType] = createSignal<string | undefined>();
  // Bumped to re-run the listener effect when the cursor re-enters the
  // reference after having landed on an interactive floating element.
  const [reattach, setReattach] = createSignal(0);

  function setReference(nextX: number | null, nextY: number | null): void {
    if (initial) {
      return;
    }

    // Prevent setting if the open event was not a mouse-like one (for example
    // focus to open, then hover over the reference element). Only apply if the
    // event exists.
    if (
      context.dataRef.current.openEvent &&
      !isMouseBasedEvent(context.dataRef.current.openEvent)
    ) {
      return;
    }

    context.refs.setPositionReference(
      createVirtualElement(context.elements.domReference, {
        x: nextX,
        y: nextY,
        axis: axis(),
        dataRef: context.dataRef,
        pointerType: pointerType(),
      }),
    );
  }

  function handleReferenceEnterOrMove(event: MouseEvent): void {
    if (x() != null || y() != null) {
      return;
    }

    if (!context.open) {
      setReference(event.clientX, event.clientY);
    } else if (!cleanupListener) {
      // If there's no cleanup, there's no listener, but we want to ensure we
      // add the listener if the cursor landed on the floating element and then
      // back on the reference (that is, it is interactive).
      setReattach((value) => value + 1);
    }
  }

  createCleanupEffect(() => {
    reattach();

    const floating = context.elements.floating;
    // If the pointer is a mouse-like pointer, we want to continue following
    // the mouse even if the floating element is transitioning out. On touch
    // devices this is undesirable, because the floating element would move to
    // the dismissal touch point.
    const openCheck = isMouseLikePointerType(pointerType()) ? floating : context.open;

    // Explicitly specified `x`/`y` coordinates shouldn't add a listener.
    if (!openCheck || !enabled() || x() != null || y() != null) {
      return undefined;
    }

    const win = getWindow(floating);

    function handleMouseMove(event: MouseEvent): void {
      const eventTarget = getTarget(event);
      const target = eventTarget instanceof Element ? eventTarget : null;

      if (contains(floating, target)) {
        win.removeEventListener('mousemove', handleMouseMove);
        cleanupListener = null;
      } else {
        setReference(event.clientX, event.clientY);
      }
    }

    if (
      !context.dataRef.current.openEvent ||
      isMouseBasedEvent(context.dataRef.current.openEvent)
    ) {
      win.addEventListener('mousemove', handleMouseMove);
      const cleanup = (): void => {
        win.removeEventListener('mousemove', handleMouseMove);
        cleanupListener = null;
      };
      cleanupListener = cleanup;
      return cleanup;
    }

    context.refs.setPositionReference(context.elements.domReference);
    return undefined;
  });

  createRenderEffect(() => {
    if (enabled() && !context.elements.floating) {
      initial = false;
    }
  });

  createRenderEffect(() => {
    if (!enabled() && context.open) {
      initial = true;
    }
  });

  createRenderEffect(() => {
    if (enabled() && (x() != null || y() != null)) {
      initial = false;
      setReference(x(), y());
    }
  });

  function setPointerTypeFromEvent(event: PointerEvent): void {
    setPointerType(event.pointerType);
  }

  const reference: AnyElementProps = {
    onPointerDown: setPointerTypeFromEvent,
    onPointerEnter: setPointerTypeFromEvent,
    onMouseMove: handleReferenceEnterOrMove,
    onMouseEnter: handleReferenceEnterOrMove,
  };

  return {
    get reference() {
      return enabled() ? reference : undefined;
    },
  };
}
