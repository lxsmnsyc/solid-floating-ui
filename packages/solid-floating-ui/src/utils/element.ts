import { isHTMLElement, isShadowRoot } from '@floating-ui/utils/dom';
import { FOCUSABLE_ATTRIBUTE, TYPEABLE_SELECTOR } from './constants';
import { isJSDOM } from './platform';

/**
 * The focused element, following shadow roots down to the innermost one.
 */
export function activeElement(doc: Document): Element | null {
  let active = doc.activeElement;

  while (active?.shadowRoot?.activeElement != null) {
    active = active.shadowRoot.activeElement;
  }

  return active;
}

/**
 * Like `Node.contains`, but able to cross shadow boundaries.
 */
export function contains(parent?: Element | null, child?: Element | null): boolean {
  if (!parent || !child) {
    return false;
  }

  if (parent.contains(child)) {
    return true;
  }

  if (!isShadowRoot(child.getRootNode())) {
    return false;
  }

  let next: Node | null = child;
  while (next) {
    if (parent === next) {
      return true;
    }
    next = isShadowRoot(next) ? next.host : next.parentNode;
  }

  return false;
}

/**
 * The innermost element an event started from, looking through shadow roots.
 */
export function getTarget(event: Event): EventTarget | null {
  return event.composedPath()[0] ?? event.target;
}

export function isEventTargetWithin(event: Event, node: Node | null | undefined): boolean {
  if (node == null) {
    return false;
  }

  return event.composedPath().includes(node);
}

export function isRootElement(element: Element): boolean {
  return element.matches('html,body');
}

export function getDocument(node: Element | null | undefined): Document {
  const owner = node?.ownerDocument;
  // A node cloned from a `<template>` belongs to an inert document until it is
  // inserted, and Solid hands refs over before insertion. That document has no
  // window, so events would never be seen on it.
  return owner?.defaultView ? owner : document;
}

export function isTypeableElement(element: unknown): boolean {
  return isHTMLElement(element) && element.matches(TYPEABLE_SELECTOR);
}

export function isTypeableCombobox(element: Element | null): boolean {
  if (!element) {
    return false;
  }
  return element.getAttribute('role') === 'combobox' && isTypeableElement(element);
}

export function matchesFocusVisible(element: Element | null): boolean {
  // Focus should still work with `visibleOnly` under JSDOM, which does not
  // match `:focus-visible` when the element has `:focus`.
  if (!element || isJSDOM()) {
    return true;
  }
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}

/**
 * The element the floating props were spread onto. When the floating element
 * is only a positioning wrapper, focus belongs on the child that carries the
 * event handlers and aria props.
 */
export function getFloatingFocusElement(
  floatingElement: HTMLElement | null | undefined,
): HTMLElement | null {
  if (!floatingElement) {
    return null;
  }

  if (floatingElement.hasAttribute(FOCUSABLE_ATTRIBUTE)) {
    return floatingElement;
  }

  return floatingElement.querySelector<HTMLElement>(`[${FOCUSABLE_ATTRIBUTE}]`) ?? floatingElement;
}
