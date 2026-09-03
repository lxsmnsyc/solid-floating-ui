import { getOverflowAncestors } from '@floating-ui/dom';
import {
  getComputedStyle,
  getParentNode,
  isElement,
  isHTMLElement,
  isLastTraversableNode,
  isWebKit,
} from '@floating-ui/utils/dom';
import { createEffect } from 'solid-js';
import { useFloatingTree } from '../components/FloatingTree';
import type { AnyElementProps, ElementProps, FloatingRootContext } from '../types';
import { createAttribute } from '../utils/constants';
import {
  contains,
  getDocument,
  getTarget,
  isEventTargetWithin,
  isRootElement,
} from '../utils/element';
import { getNodeChildren } from '../utils/nodes';
import { createCleanupEffect, lazyProps } from '../utils/reactivity';

type PressEvent = 'pointerdown' | 'mousedown' | 'click';

const bubbleHandlerKeys: Record<PressEvent, string> = {
  pointerdown: 'onPointerDown',
  mousedown: 'onMouseDown',
  click: 'onClick',
};

const captureHandlerKeys: Record<PressEvent, string> = {
  pointerdown: 'oncapture:pointerdown',
  mousedown: 'oncapture:mousedown',
  click: 'oncapture:click',
};

export interface NormalizedDismissProp {
  escapeKey: boolean;
  outsidePress: boolean;
}

export function normalizeProp(
  normalizable?: boolean | { escapeKey?: boolean | undefined; outsidePress?: boolean | undefined },
): NormalizedDismissProp {
  return {
    escapeKey:
      typeof normalizable === 'boolean' ? normalizable : (normalizable?.escapeKey ?? false),
    outsidePress:
      typeof normalizable === 'boolean' ? normalizable : (normalizable?.outsidePress ?? true),
  };
}

export interface UseDismissProps {
  /**
   * Whether the hook is enabled, including all internal effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * Whether to dismiss the floating element upon pressing the `esc` key.
   * @default true
   */
  escapeKey?: boolean | undefined;
  /**
   * Whether to dismiss the floating element upon pressing the reference
   * element. You likely want to ensure the `move` option in the `useHover()`
   * hook has been disabled when this is in use.
   * @default false
   */
  referencePress?: boolean | undefined;
  /**
   * The type of event to use to determine a "press".
   * - `pointerdown` is eager on both mouse + touch input.
   * - `mousedown` is eager on mouse input, but lazy on touch input.
   * - `click` is lazy on both mouse + touch input.
   * @default 'pointerdown'
   */
  referencePressEvent?: PressEvent | undefined;
  /**
   * Whether to dismiss the floating element upon pressing outside of the
   * floating element.
   * If you have another element, like a toast, that is rendered outside the
   * floating element's tree and don't want the floating element to close when
   * pressing it, you can guard the check like so:
   * ```jsx
   * useDismiss(context, {
   *   outsidePress: event => !event.target.closest('.toast'),
   * });
   * ```
   * @default true
   */
  outsidePress?: boolean | ((event: MouseEvent) => boolean) | undefined;
  /**
   * The type of event to use to determine an outside "press".
   * - `pointerdown` is eager on both mouse + touch input.
   * - `mousedown` is eager on mouse input, but lazy on touch input.
   * - `click` is lazy on both mouse + touch input.
   * @default 'pointerdown'
   */
  outsidePressEvent?: PressEvent | undefined;
  /**
   * Whether to dismiss the floating element upon scrolling an overflow
   * ancestor.
   * @default false
   */
  ancestorScroll?: boolean | undefined;
  /**
   * Determines whether event listeners bubble upwards through a tree of
   * floating elements.
   */
  bubbles?:
    | boolean
    | { escapeKey?: boolean | undefined; outsidePress?: boolean | undefined }
    | undefined;
  /**
   * Determines whether to use capture phase event listeners.
   */
  capture?:
    | boolean
    | { escapeKey?: boolean | undefined; outsidePress?: boolean | undefined }
    | undefined;
}

/**
 * Closes the floating element when a dismissal is requested, by default when
 * the user presses the `escape` key or outside of the floating element.
 */
export function useDismiss(
  context: FloatingRootContext,
  props: UseDismissProps = {},
): ElementProps {
  const enabled = (): boolean => props.enabled !== false;
  const escapeKey = (): boolean => props.escapeKey ?? true;
  const outsidePress = (): boolean | ((event: MouseEvent) => boolean) => props.outsidePress ?? true;
  const outsidePressEvent = (): PressEvent => props.outsidePressEvent ?? 'pointerdown';
  const referencePress = (): boolean => props.referencePress ?? false;
  const referencePressEvent = (): PressEvent => props.referencePressEvent ?? 'pointerdown';
  const ancestorScroll = (): boolean => props.ancestorScroll ?? false;
  const bubbles = (): NormalizedDismissProp => normalizeProp(props.bubbles);
  const capture = (): NormalizedDismissProp => normalizeProp(props.capture);

  const tree = useFloatingTree();

  let endedOrStartedInside = false;
  let isComposing = false;

  function closeOnEscapeKeyDown(event: KeyboardEvent): void {
    if (!context.open || !enabled() || !escapeKey() || event.key !== 'Escape') {
      return;
    }

    // Wait until IME is settled. Pressing `Escape` while composing should
    // close the compose menu, but not the floating element.
    if (isComposing) {
      return;
    }

    const nodeId = context.data.floatingContext?.nodeId;
    const children = tree ? getNodeChildren(tree.nodes(), nodeId) : [];

    if (!bubbles().escapeKey) {
      event.stopPropagation();

      if (children.length > 0) {
        const shouldDismiss = children.every(
          (child) => !child.context?.open || child.context.data.escapeKeyBubbles,
        );

        if (!shouldDismiss) {
          return;
        }
      }
    }

    context.onOpenChange(false, event, 'escape-key');
  }

  function closeOnEscapeKeyDownCapture(event: KeyboardEvent): void {
    const target = getTarget(event);
    const callback = (): void => {
      closeOnEscapeKeyDown(event);
      target?.removeEventListener('keydown', callback);
    };
    target?.addEventListener('keydown', callback);
  }

  function closeOnPressOutside(event: MouseEvent): void {
    // Given developers can stop the propagation of the event, we can only be
    // confident with a positive value.
    const insideTree = context.data.insideTree;
    context.data.insideTree = false;

    // When click outside is lazy (`click` event), handle dragging.
    // Don't close if the press started or ended inside the floating element.
    const wasInside = endedOrStartedInside;
    endedOrStartedInside = false;

    if (outsidePressEvent() === 'click' && wasInside) {
      return;
    }

    if (insideTree) {
      return;
    }

    const currentOutsidePress = outsidePress();
    if (typeof currentOutsidePress === 'function' && !currentOutsidePress(event)) {
      return;
    }

    const floating = context.elements.floating;
    const target = getTarget(event);
    const inertSelector = `[${createAttribute('inert')}]`;
    const markers = getDocument(floating).querySelectorAll(inertSelector);

    let targetRootAncestor = isElement(target) ? target : null;
    while (targetRootAncestor && !isLastTraversableNode(targetRootAncestor)) {
      const nextParent = getParentNode(targetRootAncestor);
      if (isLastTraversableNode(nextParent) || !isElement(nextParent)) {
        break;
      }

      targetRootAncestor = nextParent;
    }

    // Check if the click occurred on a third-party element injected after the
    // floating element rendered.
    if (
      markers.length &&
      isElement(target) &&
      !isRootElement(target) &&
      // Clicked on a direct ancestor (e.g. FloatingOverlay).
      !contains(target, floating) &&
      // If the target root element contains none of the markers, then the
      // element was injected after the floating element rendered.
      Array.from(markers).every((marker) => !contains(targetRootAncestor, marker))
    ) {
      return;
    }

    // Check if the click occurred on the scrollbar.
    if (isHTMLElement(target) && floating) {
      const lastTraversableNode = isLastTraversableNode(target);
      const style = getComputedStyle(target);
      const scrollRe = /auto|scroll/;
      const isScrollableX = lastTraversableNode || scrollRe.test(style.overflowX);
      const isScrollableY = lastTraversableNode || scrollRe.test(style.overflowY);

      const canScrollX =
        isScrollableX && target.clientWidth > 0 && target.scrollWidth > target.clientWidth;
      const canScrollY =
        isScrollableY && target.clientHeight > 0 && target.scrollHeight > target.clientHeight;

      const isRTL = style.direction === 'rtl';

      // Check click position relative to scrollbar.
      // In some browsers it is possible to change the <body> (or window)
      // scrollbar to the left side, but it is very rare and difficult to check
      // for. Plus, for modal dialogs with backdrops, it is more important that
      // the backdrop is checked but not so much the window.
      const pressedVerticalScrollbar =
        canScrollY &&
        (isRTL
          ? event.offsetX <= target.offsetWidth - target.clientWidth
          : event.offsetX > target.clientWidth);

      const pressedHorizontalScrollbar = canScrollX && event.offsetY > target.clientHeight;

      if (pressedVerticalScrollbar || pressedHorizontalScrollbar) {
        return;
      }
    }

    const nodeId = context.data.floatingContext?.nodeId;

    const targetIsInsideChildren =
      tree &&
      getNodeChildren(tree.nodes(), nodeId).some((node) =>
        isEventTargetWithin(event, node.context?.elements.floating),
      );

    if (
      isEventTargetWithin(event, floating) ||
      isEventTargetWithin(event, context.elements.domReference) ||
      targetIsInsideChildren
    ) {
      return;
    }

    const children = tree ? getNodeChildren(tree.nodes(), nodeId) : [];
    if (children.length > 0) {
      const shouldDismiss = children.every(
        (child) => !child.context?.open || child.context.data.outsidePressBubbles,
      );

      if (!shouldDismiss) {
        return;
      }
    }

    context.onOpenChange(false, event, 'outside-press');
  }

  function closeOnPressOutsideCapture(event: MouseEvent): void {
    const pressEvent = outsidePressEvent();
    const target = getTarget(event);
    const callback = (): void => {
      closeOnPressOutside(event);
      target?.removeEventListener(pressEvent, callback);
    };
    target?.addEventListener(pressEvent, callback);
  }

  createCleanupEffect(() => {
    if (!context.open || !enabled()) {
      return undefined;
    }

    context.data.escapeKeyBubbles = bubbles().escapeKey;
    context.data.outsidePressBubbles = bubbles().outsidePress;

    let compositionTimeout = -1;

    function onScroll(event: Event): void {
      context.onOpenChange(false, event, 'ancestor-scroll');
    }

    function handleCompositionStart(): void {
      window.clearTimeout(compositionTimeout);
      isComposing = true;
    }

    function handleCompositionEnd(): void {
      // Safari fires `compositionend` before `keydown`, so we need to wait
      // until the next tick to set `isComposing` to `false`.
      // https://bugs.webkit.org/show_bug.cgi?id=165004
      compositionTimeout = window.setTimeout(
        () => {
          isComposing = false;
        },
        // 0ms or 1ms don't work in Safari. 5ms appears to consistently work.
        // Only apply to WebKit for the test to remain 0ms.
        isWebKit() ? 5 : 0,
      );
    }

    const doc = getDocument(context.elements.floating);
    const useEscapeKey = escapeKey();
    const escapeKeyCapture = capture().escapeKey;
    const outsidePressCapture = capture().outsidePress;
    const currentOutsidePress = outsidePress();
    const pressEvent = outsidePressEvent();

    if (useEscapeKey) {
      doc.addEventListener(
        'keydown',
        escapeKeyCapture ? closeOnEscapeKeyDownCapture : closeOnEscapeKeyDown,
        escapeKeyCapture,
      );
      doc.addEventListener('compositionstart', handleCompositionStart);
      doc.addEventListener('compositionend', handleCompositionEnd);
    }

    if (currentOutsidePress) {
      doc.addEventListener(
        pressEvent,
        outsidePressCapture ? closeOnPressOutsideCapture : closeOnPressOutside,
        outsidePressCapture,
      );
    }

    let ancestors: (Element | Window | VisualViewport)[] = [];

    if (ancestorScroll()) {
      if (isElement(context.elements.domReference)) {
        ancestors = getOverflowAncestors(context.elements.domReference);
      }

      if (isElement(context.elements.floating)) {
        ancestors = ancestors.concat(getOverflowAncestors(context.elements.floating));
      }

      const reference = context.elements.reference;
      if (reference && !isElement(reference) && reference.contextElement) {
        ancestors = ancestors.concat(getOverflowAncestors(reference.contextElement));
      }
    }

    // Ignore the visual viewport for scrolling dismissal (allow pinch-zoom).
    ancestors = ancestors.filter((ancestor) => ancestor !== doc.defaultView?.visualViewport);

    for (const ancestor of ancestors) {
      ancestor.addEventListener('scroll', onScroll);
    }

    return () => {
      if (useEscapeKey) {
        doc.removeEventListener(
          'keydown',
          escapeKeyCapture ? closeOnEscapeKeyDownCapture : closeOnEscapeKeyDown,
          escapeKeyCapture,
        );
        doc.removeEventListener('compositionstart', handleCompositionStart);
        doc.removeEventListener('compositionend', handleCompositionEnd);
      }

      if (currentOutsidePress) {
        doc.removeEventListener(
          pressEvent,
          outsidePressCapture ? closeOnPressOutsideCapture : closeOnPressOutside,
          outsidePressCapture,
        );
      }

      for (const ancestor of ancestors) {
        ancestor.removeEventListener('scroll', onScroll);
      }

      window.clearTimeout(compositionTimeout);
    };
  });

  createEffect(
    () => [outsidePress(), outsidePressEvent()],
    () => {
      context.data.insideTree = false;
    },
  );

  function referenceProps(): AnyElementProps {
    const pressEvent = referencePressEvent();
    return {
      onKeyDown: closeOnEscapeKeyDown,
      ...(referencePress() && {
        [bubbleHandlerKeys[pressEvent]]: (event: Event) => {
          context.onOpenChange(false, event, 'reference-press');
        },
        ...(pressEvent !== 'click' && {
          onClick(event: MouseEvent) {
            context.onOpenChange(false, event, 'reference-press');
          },
        }),
      }),
    };
  }

  function setMouseDownOrUpInside(event: MouseEvent): void {
    if (event.button !== 0) {
      return;
    }

    endedOrStartedInside = true;
  }

  function floatingProps(): AnyElementProps {
    return {
      onKeyDown: closeOnEscapeKeyDown,
      onMouseDown: setMouseDownOrUpInside,
      onMouseUp: setMouseDownOrUpInside,
      [captureHandlerKeys[outsidePressEvent()]]: () => {
        context.data.insideTree = true;
      },
    };
  }

  const reference = lazyProps(referenceProps);
  const floating = lazyProps(floatingProps);

  return {
    get reference() {
      return enabled() ? reference : undefined;
    },
    get floating() {
      return enabled() ? floating : undefined;
    },
  };
}
