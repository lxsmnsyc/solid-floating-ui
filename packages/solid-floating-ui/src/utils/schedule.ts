import type { FocusableElement } from 'tabbable';

interface EnqueueFocusOptions {
  preventScroll?: boolean | undefined;
  cancelPrevious?: boolean | undefined;
  sync?: boolean | undefined;
}

let rafId = 0;

/**
 * Focuses an element on the next frame, so it runs after the DOM settles.
 */
export function enqueueFocus(
  el: FocusableElement | null | undefined,
  options: EnqueueFocusOptions = {},
): void {
  const { preventScroll = false, cancelPrevious = true, sync = false } = options;
  if (cancelPrevious) {
    cancelAnimationFrame(rafId);
  }
  const exec = (): void => {
    el?.focus({ preventScroll });
  };
  if (sync) {
    exec();
  } else {
    rafId = requestAnimationFrame(exec);
  }
}

/**
 * Clears a pending timeout and returns the id to store back, so callers can
 * keep the id in a plain `let`.
 */
export function clearTimeoutIfSet(id: number): number {
  if (id !== -1) {
    clearTimeout(id);
  }
  return -1;
}
