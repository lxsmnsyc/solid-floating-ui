import { isHTMLElement } from '@floating-ui/utils/dom';
import type { AnyElementProps, ElementProps, FloatingRootContext } from '../types';
import { isTypeableElement } from '../utils/element';
import { isMouseLikePointerType } from '../utils/event';

function isButtonTarget(event: KeyboardEvent): boolean {
  return isHTMLElement(event.target) && event.target.tagName === 'BUTTON';
}

function isAnchorTarget(event: KeyboardEvent): boolean {
  return isHTMLElement(event.target) && event.target.tagName === 'A';
}

function isSpaceIgnored(element: Element | null): boolean {
  return isTypeableElement(element);
}

export interface UseClickProps {
  /**
   * Whether the hook is enabled, including all internal effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * The type of event to use to determine a "click" with mouse input.
   * Keyboard clicks work as normal.
   * @default 'click'
   */
  event?: 'click' | 'mousedown' | undefined;
  /**
   * Whether to toggle the open state with repeated clicks.
   * @default true
   */
  toggle?: boolean | undefined;
  /**
   * Whether to ignore the logic for mouse input (for example, if `useHover()`
   * is also being used).
   * @default false
   */
  ignoreMouse?: boolean | undefined;
  /**
   * Whether to add keyboard handlers (Enter and Space key functionality) for
   * non-button elements (to open/close the floating element via keyboard
   * "click").
   * @default true
   */
  keyboardHandlers?: boolean | undefined;
  /**
   * If already open from another event such as the `useHover()` hook,
   * determines whether to keep the floating element open when clicking the
   * reference element for the first time.
   * @default true
   */
  stickIfOpen?: boolean | undefined;
}

/**
 * Opens or closes the floating element when clicking the reference element.
 */
export function useClick(context: FloatingRootContext, props: UseClickProps = {}): ElementProps {
  const eventOption = (): 'click' | 'mousedown' => props.event ?? 'click';
  const toggle = (): boolean => props.toggle ?? true;
  const ignoreMouse = (): boolean => props.ignoreMouse ?? false;
  const keyboardHandlers = (): boolean => props.keyboardHandlers ?? true;
  const stickIfOpen = (): boolean => props.stickIfOpen ?? true;

  let pointerType: string | undefined;
  let didKeyDown = false;

  const reference: AnyElementProps = {
    onPointerDown(event: PointerEvent) {
      pointerType = event.pointerType;
    },
    onMouseDown(event: MouseEvent) {
      // Ignore all buttons except for the "main" button.
      // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
      if (event.button !== 0) {
        return;
      }
      if (eventOption() === 'click') {
        return;
      }
      if (isMouseLikePointerType(pointerType, true) && ignoreMouse()) {
        return;
      }

      if (
        context.open &&
        toggle() &&
        (context.data.openEvent && stickIfOpen()
          ? context.data.openEvent.type === 'mousedown'
          : true)
      ) {
        context.onOpenChange(false, event, 'click');
      } else {
        // Prevent stealing focus from the floating element
        event.preventDefault();
        context.onOpenChange(true, event, 'click');
      }
    },
    onClick(event: MouseEvent) {
      if (eventOption() === 'mousedown' && pointerType) {
        pointerType = undefined;
        return;
      }

      if (isMouseLikePointerType(pointerType, true) && ignoreMouse()) {
        return;
      }

      if (
        context.open &&
        toggle() &&
        (context.data.openEvent && stickIfOpen() ? context.data.openEvent.type === 'click' : true)
      ) {
        context.onOpenChange(false, event, 'click');
      } else {
        context.onOpenChange(true, event, 'click');
      }
    },
    onKeyDown(event: KeyboardEvent) {
      pointerType = undefined;

      if (event.defaultPrevented || !keyboardHandlers() || isButtonTarget(event)) {
        return;
      }

      if (event.key === ' ' && !isSpaceIgnored(context.elements.domReference)) {
        // Prevent scrolling
        event.preventDefault();
        didKeyDown = true;
      }

      if (isAnchorTarget(event)) {
        return;
      }

      if (event.key === 'Enter') {
        context.onOpenChange(!(context.open && toggle()), event, 'click');
      }
    },
    onKeyUp(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        !keyboardHandlers() ||
        isButtonTarget(event) ||
        isSpaceIgnored(context.elements.domReference)
      ) {
        return;
      }

      if (event.key === ' ' && didKeyDown) {
        didKeyDown = false;
        context.onOpenChange(!(context.open && toggle()), event, 'click');
      }
    },
  };

  return {
    get reference() {
      return props.enabled === false ? undefined : reference;
    },
  };
}
