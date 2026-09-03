import { getWindow, isElement, isHTMLElement } from '@floating-ui/utils/dom';
import { onCleanup } from 'solid-js';
import type { AnyElementProps, ElementProps, FloatingRootContext, OpenChangeEvent } from '../types';
import { createAttribute } from '../utils/constants';
import {
  activeElement,
  contains,
  getDocument,
  getTarget,
  isTypeableElement,
  matchesFocusVisible,
} from '../utils/element';
import { isMac, isSafari } from '../utils/platform';
import { createCleanupEffect } from '../utils/reactivity';
import { clearTimeoutIfSet } from '../utils/schedule';

function isMacSafari(): boolean {
  return isMac() && isSafari();
}

export interface UseFocusProps {
  /**
   * Whether the hook is enabled, including all internal effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * Whether the open state only changes if the focus event is considered
   * visible (`:focus-visible` CSS selector).
   * @default true
   */
  visibleOnly?: boolean | undefined;
}

/**
 * Opens the floating element while the reference element has focus, like CSS
 * `:focus`.
 * @see https://floating-ui.com/docs/useFocus
 */
export function useFocus(context: FloatingRootContext, props: UseFocusProps = {}): ElementProps {
  const enabled = (): boolean => props.enabled !== false;
  const visibleOnly = (): boolean => props.visibleOnly ?? true;

  let blockFocus = false;
  let timeoutId = -1;
  let keyboardModality = true;

  createCleanupEffect(() => {
    if (!enabled()) {
      return undefined;
    }

    const domReference = context.elements.domReference;
    const open = context.open;
    const win = getWindow(domReference);

    // If the reference was focused and the user left the tab/window, and the
    // floating element was not open, the focus should be blocked when they
    // return to the tab/window.
    function onBlur(): void {
      if (
        !open &&
        isHTMLElement(domReference) &&
        domReference === activeElement(getDocument(domReference))
      ) {
        blockFocus = true;
      }
    }

    function onKeyDown(): void {
      keyboardModality = true;
    }

    function onPointerDown(): void {
      keyboardModality = false;
    }

    win.addEventListener('blur', onBlur);

    if (isMacSafari()) {
      win.addEventListener('keydown', onKeyDown, true);
      win.addEventListener('pointerdown', onPointerDown, true);
    }

    return () => {
      win.removeEventListener('blur', onBlur);

      if (isMacSafari()) {
        win.removeEventListener('keydown', onKeyDown, true);
        win.removeEventListener('pointerdown', onPointerDown, true);
      }
    };
  });

  createCleanupEffect(() => {
    if (!enabled()) {
      return undefined;
    }

    const events = context.events;

    function onOpenChange({ reason }: OpenChangeEvent): void {
      if (reason === 'reference-press' || reason === 'escape-key') {
        blockFocus = true;
      }
    }

    events.on('openchange', onOpenChange);
    return () => {
      events.off('openchange', onOpenChange);
    };
  });

  onCleanup(() => {
    timeoutId = clearTimeoutIfSet(timeoutId);
  });

  const reference: AnyElementProps = {
    onMouseLeave() {
      blockFocus = false;
    },
    onFocusIn(event: FocusEvent) {
      if (blockFocus) {
        return;
      }

      const target = getTarget(event);

      if (visibleOnly() && isElement(target)) {
        // Safari fails to match `:focus-visible` if focus was initially
        // outside the document.
        if (isMacSafari() && !event.relatedTarget) {
          if (!keyboardModality && !isTypeableElement(target)) {
            return;
          }
        } else if (!matchesFocusVisible(target)) {
          return;
        }
      }

      context.onOpenChange(true, event, 'focus');
    },
    onFocusOut(event: FocusEvent) {
      blockFocus = false;
      const relatedTarget = event.relatedTarget;

      // Hit the non-modal focus management portal guard. Focus will be
      // moved into the floating element immediately after.
      const movedToFocusGuard =
        isElement(relatedTarget) &&
        relatedTarget.hasAttribute(createAttribute('focus-guard')) &&
        relatedTarget.getAttribute('data-type') === 'outside';

      // Wait for the window blur listener to fire.
      timeoutId = window.setTimeout(() => {
        const domReference = context.elements.domReference;
        const activeEl = activeElement(domReference ? domReference.ownerDocument : document);

        // Focus left the page, keep it open.
        if (!relatedTarget && activeEl === domReference) {
          return;
        }

        // When focusing the reference element (e.g. regular click), then
        // clicking into the floating element, prevent it from hiding.
        // Note: it must be focusable, e.g. `tabindex="-1"`.
        // We cannot rely on `relatedTarget` to point to the correct element as
        // it will only point to the shadow host of the newly focused element
        // and not the element that actually received focus if it is located
        // inside a shadow root.
        if (
          contains(context.dataRef.current.floatingContext?.refs.floating.current, activeEl) ||
          contains(domReference, activeEl) ||
          movedToFocusGuard
        ) {
          return;
        }

        context.onOpenChange(false, event, 'focus');
      });
    },
  };

  return {
    get reference() {
      return enabled() ? reference : undefined;
    },
  };
}
