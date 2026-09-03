import { type FocusableElement, tabbable } from 'tabbable';
import { activeElement, contains, getDocument } from './element';

export function getTabbableOptions(): {
  getShadowRoot: true;
  displayCheck: 'full' | 'none';
} {
  // JSDOM does not support the `tabbable` library's display check. A real
  // `ResizeObserver` is a reliable signal that the environment is a browser.
  const isBrowser =
    typeof ResizeObserver === 'function' && ResizeObserver.toString().includes('[native code]');

  return {
    getShadowRoot: true,
    displayCheck: isBrowser ? 'full' : 'none',
  };
}

function getTabbableIn(container: HTMLElement, dir: 1 | -1): FocusableElement | undefined {
  const list = tabbable(container, getTabbableOptions());
  if (list.length === 0) {
    return undefined;
  }

  const active = activeElement(getDocument(container));
  const index = list.findIndex((element) => element === active);

  if (index === -1) {
    return dir === 1 ? list[0] : list[list.length - 1];
  }

  return list[index + dir];
}

function tabbableOrReference(
  referenceElement: Element | null,
  dir: 1 | -1,
): FocusableElement | null {
  const next = getTabbableIn(getDocument(referenceElement).body, dir);
  if (next) {
    return next;
  }
  return referenceElement instanceof HTMLElement ? referenceElement : null;
}

export function getNextTabbable(referenceElement: Element | null): FocusableElement | null {
  return tabbableOrReference(referenceElement, 1);
}

export function getPreviousTabbable(referenceElement: Element | null): FocusableElement | null {
  return tabbableOrReference(referenceElement, -1);
}

export function isOutsideEvent(event: FocusEvent, container?: Element): boolean {
  const containerElement = container ?? event.currentTarget;
  const relatedTarget = event.relatedTarget;
  if (!(containerElement instanceof Element)) {
    return true;
  }
  if (!(relatedTarget instanceof Element)) {
    return true;
  }
  return !contains(containerElement, relatedTarget);
}

export function disableFocusInside(container: HTMLElement): void {
  for (const element of tabbable(container, getTabbableOptions())) {
    if (element instanceof HTMLElement) {
      element.dataset.tabindex = element.getAttribute('tabindex') ?? '';
    }
    element.setAttribute('tabindex', '-1');
  }
}

export function enableFocusInside(container: HTMLElement): void {
  const elements = container.querySelectorAll<HTMLElement>('[data-tabindex]');
  for (const element of elements) {
    const tabindex = element.dataset.tabindex;
    delete element.dataset.tabindex;
    if (tabindex) {
      element.setAttribute('tabindex', tabindex);
    } else {
      element.removeAttribute('tabindex');
    }
  }
}
