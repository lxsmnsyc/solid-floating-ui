import { createRenderEffect, onCleanup } from 'solid-js';
import { useFloatingParentNodeId, useFloatingTree } from '../components/FloatingTree';
import type { SafePolygonOptions } from '../safePolygon';
import type {
  AnyElementProps,
  Delay,
  ElementProps,
  FloatingContext,
  FloatingRootContext,
  FloatingTreeType,
  OpenChangeReason,
} from '../types';
import { createAttribute } from '../utils/constants';
import { contains, getDocument } from '../utils/element';
import { isMouseLikePointerType } from '../utils/event';
import { createCleanupEffect } from '../utils/reactivity';
import { clearTimeoutIfSet } from '../utils/schedule';

const safePolygonIdentifier = createAttribute('safe-polygon');

function isStyledElement(element: Element | null): element is HTMLElement | SVGElement {
  return element instanceof HTMLElement || element instanceof SVGElement;
}

export interface HandleCloseContext extends FloatingContext {
  onClose: () => void;
  tree?: FloatingTreeType | null | undefined;
  leave?: boolean | undefined;
}

export interface HandleClose {
  (context: HandleCloseContext): (event: MouseEvent) => void;
  options?: SafePolygonOptions | undefined;
}

export function getDelay(
  value: UseHoverProps['delay'],
  prop: 'open' | 'close',
  pointerType?: PointerEvent['pointerType'],
): number | undefined {
  if (pointerType && !isMouseLikePointerType(pointerType)) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'function') {
    const result = value();
    if (typeof result === 'number') {
      return result;
    }
    return result[prop];
  }

  return value?.[prop];
}

function getRestMs(value: number | (() => number)): number {
  if (typeof value === 'function') {
    return value();
  }
  return value;
}

export interface UseHoverProps {
  /**
   * Whether the hook is enabled, including all internal effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * Accepts an event handler that runs on `mousemove` to control when the
   * floating element closes once the cursor leaves the reference element.
   * @default null
   */
  handleClose?: HandleClose | null | undefined;
  /**
   * Waits until the user's cursor is at "rest" over the reference element
   * before changing the `open` state.
   * @default 0
   */
  restMs?: number | (() => number) | undefined;
  /**
   * Waits for the specified time when the event listener runs before changing
   * the `open` state.
   * @default 0
   */
  delay?: Delay | (() => Delay) | undefined;
  /**
   * Whether the logic only runs for mouse input, ignoring touch input.
   * Note: due to a bug with Linux Chrome, "pen" inputs are considered "mouse".
   * @default false
   */
  mouseOnly?: boolean | undefined;
  /**
   * Whether moving the cursor over the floating element will open it, without a
   * regular hover event required.
   * @default true
   */
  move?: boolean | undefined;
}

/**
 * Opens the floating element while hovering over the reference element, like
 * CSS `:hover`.
 */
export function useHover(context: FloatingRootContext, props: UseHoverProps = {}): ElementProps {
  const enabled = (): boolean => props.enabled !== false;
  const delay = (): Delay | (() => Delay) => props.delay ?? 0;
  const handleClose = (): HandleClose | null => props.handleClose ?? null;
  const mouseOnly = (): boolean => props.mouseOnly ?? false;
  const restMs = (): number | (() => number) => props.restMs ?? 0;
  const move = (): boolean => props.move ?? true;

  const tree = useFloatingTree();
  const parentId = useFloatingParentNodeId();

  let pointerType: string | undefined;
  let timeoutId = -1;
  let restTimeoutId = -1;
  let mouseMoveHandler: ((event: MouseEvent) => void) | undefined;
  let blockMouseMove = true;
  let performedPointerEventsMutation = false;
  let unbindMouseMove: () => void = () => {};
  let restTimeoutPending = false;

  function isHoverOpen(): boolean {
    const type = context.data.openEvent?.type;
    return !!type?.includes('mouse') && type !== 'mousedown';
  }

  function isClickLikeOpenEvent(): boolean {
    return context.data.openEvent
      ? ['click', 'mousedown'].includes(context.data.openEvent.type)
      : false;
  }

  function cleanupMouseMoveHandler(): void {
    unbindMouseMove();
    mouseMoveHandler = undefined;
  }

  function clearPointerEvents(): void {
    if (performedPointerEventsMutation) {
      const body = getDocument(context.elements.floating).body;
      body.style.pointerEvents = '';
      body.removeAttribute(safePolygonIdentifier);
      performedPointerEventsMutation = false;
    }
  }

  function closeWithDelay(
    event: Event,
    runElseBranch = true,
    reason: OpenChangeReason = 'hover',
  ): void {
    const closeDelay = getDelay(delay(), 'close', pointerType);
    if (closeDelay && !mouseMoveHandler) {
      timeoutId = clearTimeoutIfSet(timeoutId);
      timeoutId = window.setTimeout(() => {
        context.onOpenChange(false, event, reason);
      }, closeDelay);
    } else if (runElseBranch) {
      timeoutId = clearTimeoutIfSet(timeoutId);
      context.onOpenChange(false, event, reason);
    }
  }

  /**
   * Keeps the live getters of the floating context while adding the fields
   * `handleClose` expects, so a handler such as `safePolygon` keeps reading
   * current values.
   */
  function createHandleCloseContext(
    event: MouseEvent,
    onClose: () => void,
  ): HandleCloseContext | null {
    const floatingContext = context.data.floatingContext;
    if (!floatingContext) {
      return null;
    }
    return {
      // The cursor position replaces the floating element's own coordinates,
      // which is what a handler such as `safePolygon` reasons about.
      x: event.clientX,
      y: event.clientY,
      tree,
      onClose,
      get placement() {
        return floatingContext.placement;
      },
      get strategy() {
        return floatingContext.strategy;
      },
      get middlewareData() {
        return floatingContext.middlewareData;
      },
      get isPositioned() {
        return floatingContext.isPositioned;
      },
      get floatingStyles() {
        return floatingContext.floatingStyles;
      },
      get open() {
        return floatingContext.open;
      },
      update() {
        floatingContext.update();
      },
      onOpenChange(open, openEvent, reason) {
        floatingContext.onOpenChange(open, openEvent, reason);
      },
      events: floatingContext.events,
      data: floatingContext.data,
      nodeId: floatingContext.nodeId,
      floatingId: floatingContext.floatingId,
      refs: floatingContext.refs,
      elements: floatingContext.elements,
    };
  }

  // When closing before opening, clear the delay timeouts to cancel it
  // from showing.
  createCleanupEffect(() => {
    if (!enabled()) {
      return undefined;
    }

    const events = context.events;

    function onOpenChange({ open }: { open: boolean }): void {
      if (!open) {
        timeoutId = clearTimeoutIfSet(timeoutId);
        restTimeoutId = clearTimeoutIfSet(restTimeoutId);
        blockMouseMove = true;
        restTimeoutPending = false;
      }
    }

    events.on('openchange', onOpenChange);
    return () => {
      events.off('openchange', onOpenChange);
    };
  });

  createCleanupEffect(() => {
    if (!enabled()) {
      return undefined;
    }
    if (!handleClose()) {
      return undefined;
    }
    if (!context.open) {
      return undefined;
    }

    function onLeave(event: MouseEvent): void {
      if (isHoverOpen()) {
        context.onOpenChange(false, event, 'hover');
      }
    }

    const html = getDocument(context.elements.floating).documentElement;
    html.addEventListener('mouseleave', onLeave);
    return () => {
      html.removeEventListener('mouseleave', onLeave);
    };
  });

  // Registering the mouse events on the reference directly. If the cursor was
  // on a disabled element and then entered the reference (no gap),
  // `mouseenter` doesn't fire through event delegation.
  createCleanupEffect(() => {
    if (!enabled()) {
      return undefined;
    }

    const domReference = context.elements.domReference;
    const floating = context.elements.floating;
    const open = context.open;

    function onReferenceMouseEnter(event: MouseEvent): void {
      timeoutId = clearTimeoutIfSet(timeoutId);
      blockMouseMove = false;

      if (
        (mouseOnly() && !isMouseLikePointerType(pointerType)) ||
        (getRestMs(restMs()) > 0 && !getDelay(delay(), 'open'))
      ) {
        return;
      }

      const openDelay = getDelay(delay(), 'open', pointerType);

      if (openDelay) {
        timeoutId = window.setTimeout(() => {
          if (!context.open) {
            context.onOpenChange(true, event, 'hover');
          }
        }, openDelay);
      } else if (!open) {
        context.onOpenChange(true, event, 'hover');
      }
    }

    function onReferenceMouseLeave(event: MouseEvent): void {
      if (isClickLikeOpenEvent()) {
        clearPointerEvents();
        return;
      }

      unbindMouseMove();

      const doc = getDocument(context.elements.floating);
      restTimeoutId = clearTimeoutIfSet(restTimeoutId);
      restTimeoutPending = false;

      const currentHandleClose = handleClose();
      if (currentHandleClose) {
        const handleCloseContext = createHandleCloseContext(event, () => {
          clearPointerEvents();
          cleanupMouseMoveHandler();
          if (!isClickLikeOpenEvent()) {
            closeWithDelay(event, true, 'safe-polygon');
          }
        });

        if (handleCloseContext) {
          // Prevent clearing `onScrollMouseLeave` timeout.
          if (!open) {
            timeoutId = clearTimeoutIfSet(timeoutId);
          }

          const handler = currentHandleClose(handleCloseContext);
          mouseMoveHandler = handler;

          doc.addEventListener('mousemove', handler);
          unbindMouseMove = () => {
            doc.removeEventListener('mousemove', handler);
          };

          return;
        }
      }

      // Allow interactivity without `safePolygon` on touch devices. With a
      // pointer, a short close delay is an alternative, so it should work
      // consistently.
      const relatedTarget = event.relatedTarget instanceof Element ? event.relatedTarget : null;
      const shouldClose =
        pointerType !== 'touch' || !contains(context.elements.floating, relatedTarget);
      if (shouldClose) {
        closeWithDelay(event);
      }
    }

    // Ensure the floating element closes after scrolling even if the pointer
    // did not move.
    // https://github.com/floating-ui/floating-ui/discussions/1692
    function onScrollMouseLeave(event: MouseEvent): void {
      if (isClickLikeOpenEvent()) {
        return;
      }

      const handleCloseContext = createHandleCloseContext(event, () => {
        clearPointerEvents();
        cleanupMouseMoveHandler();
        if (!isClickLikeOpenEvent()) {
          closeWithDelay(event);
        }
      });
      if (!handleCloseContext) {
        return;
      }

      handleClose()?.(handleCloseContext)(event);
    }

    function onFloatingMouseEnter(): void {
      timeoutId = clearTimeoutIfSet(timeoutId);
    }

    function onFloatingMouseLeave(event: MouseEvent): void {
      if (!isClickLikeOpenEvent()) {
        closeWithDelay(event, false);
      }
    }

    if (isStyledElement(domReference)) {
      const reference = domReference;
      const shouldMove = move();

      if (open) {
        reference.addEventListener('mouseleave', onScrollMouseLeave);
      }

      if (shouldMove) {
        reference.addEventListener('mousemove', onReferenceMouseEnter, {
          once: true,
        });
      }

      reference.addEventListener('mouseenter', onReferenceMouseEnter);
      reference.addEventListener('mouseleave', onReferenceMouseLeave);

      if (floating) {
        floating.addEventListener('mouseleave', onScrollMouseLeave);
        floating.addEventListener('mouseenter', onFloatingMouseEnter);
        floating.addEventListener('mouseleave', onFloatingMouseLeave);
      }

      return () => {
        if (open) {
          reference.removeEventListener('mouseleave', onScrollMouseLeave);
        }

        if (shouldMove) {
          reference.removeEventListener('mousemove', onReferenceMouseEnter);
        }

        reference.removeEventListener('mouseenter', onReferenceMouseEnter);
        reference.removeEventListener('mouseleave', onReferenceMouseLeave);

        if (floating) {
          floating.removeEventListener('mouseleave', onScrollMouseLeave);
          floating.removeEventListener('mouseenter', onFloatingMouseEnter);
          floating.removeEventListener('mouseleave', onFloatingMouseLeave);
        }
      };
    }

    return undefined;
  });

  // Block pointer-events of every element other than the reference and floating
  // while the floating element is open and has a `handleClose` handler. Also
  // handles nested floating elements.
  // https://github.com/floating-ui/floating-ui/issues/1722
  createCleanupEffect(() => {
    if (!enabled()) {
      return undefined;
    }

    if (context.open && handleClose()?.options?.blockPointerEvents && isHoverOpen()) {
      performedPointerEventsMutation = true;
      const floatingEl = context.elements.floating;
      const domReference = context.elements.domReference;

      if (isStyledElement(domReference) && floatingEl) {
        const body = getDocument(floatingEl).body;
        body.setAttribute(safePolygonIdentifier, '');

        const parentFloating = tree?.nodes().find((node) => node.id === parentId)?.context
          ?.elements.floating;

        if (parentFloating) {
          parentFloating.style.pointerEvents = '';
        }

        body.style.pointerEvents = 'none';
        floatingEl.style.pointerEvents = 'auto';
        domReference.style.pointerEvents = 'auto';

        return () => {
          body.style.pointerEvents = '';
          floatingEl.style.pointerEvents = '';
          domReference.style.pointerEvents = '';
        };
      }
    }

    return undefined;
  });

  createRenderEffect(() => {
    if (!context.open) {
      pointerType = undefined;
      restTimeoutPending = false;
      cleanupMouseMoveHandler();
      clearPointerEvents();
    }
  });

  onCleanup(() => {
    cleanupMouseMoveHandler();
    timeoutId = clearTimeoutIfSet(timeoutId);
    restTimeoutId = clearTimeoutIfSet(restTimeoutId);
    clearPointerEvents();
  });

  function setPointerType(event: PointerEvent): void {
    pointerType = event.pointerType;
  }

  const reference: AnyElementProps = {
    onPointerDown: setPointerType,
    onPointerEnter: setPointerType,
    onMouseMove(event: MouseEvent) {
      function handleMouseMove(): void {
        if (!blockMouseMove && !context.open) {
          context.onOpenChange(true, event, 'hover');
        }
      }

      if (mouseOnly() && !isMouseLikePointerType(pointerType)) {
        return;
      }

      if (context.open || getRestMs(restMs()) === 0) {
        return;
      }

      // Ignore insignificant movements to account for tremors.
      if (restTimeoutPending && event.movementX ** 2 + event.movementY ** 2 < 2) {
        return;
      }

      restTimeoutId = clearTimeoutIfSet(restTimeoutId);

      if (pointerType === 'touch') {
        handleMouseMove();
      } else {
        restTimeoutPending = true;
        restTimeoutId = window.setTimeout(handleMouseMove, getRestMs(restMs()));
      }
    },
  };

  return {
    get reference() {
      return enabled() ? reference : undefined;
    },
  };
}
