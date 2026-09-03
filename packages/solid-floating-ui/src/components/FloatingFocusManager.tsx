import { getNodeName, isHTMLElement } from '@floating-ui/utils/dom';
import { type JSX, createRenderEffect, onCleanup, onMount } from 'solid-js';
import { type FocusableElement, focusable, isTabbable, tabbable } from 'tabbable';
import type { FloatingRootContext, OpenChangeEvent } from '../types';
import { createAttribute } from '../utils/constants';
import {
  activeElement,
  contains,
  getDocument,
  getFloatingFocusElement,
  getTarget,
  isTypeableCombobox,
} from '../utils/element';
import { clearTimeoutIfSet, enqueueFocus } from '../utils/schedule';
import { isVirtualClick, isVirtualPointerEvent, stopEvent } from '../utils/event';
import { markOthers, supportsInert } from '../utils/markOthers';
import { getNodeAncestors, getNodeChildren } from '../utils/nodes';
import { createCleanupEffect } from '../utils/reactivity';
import {
  getNextTabbable,
  getPreviousTabbable,
  getTabbableOptions,
  isOutsideEvent,
} from '../utils/tabbable';
import { usePortalContext } from './FloatingPortal';
import { useFloatingTree } from './FloatingTree';
import { FocusGuard, HIDDEN_STYLES } from './FocusGuard';

type FocusOrder = 'reference' | 'floating' | 'content';

function isFocusableElement(element: Element | null): element is HTMLElement | SVGElement {
  return element instanceof HTMLElement || element instanceof SVGElement;
}

const LIST_LIMIT = 20;
let previouslyFocusedElements: WeakRef<Element>[] = [];

function clearDisconnectedPreviouslyFocusedElements(): void {
  previouslyFocusedElements = previouslyFocusedElements.filter(
    (elementRef) => elementRef.deref()?.isConnected,
  );
}

function addPreviouslyFocusedElement(element: Element | null): void {
  clearDisconnectedPreviouslyFocusedElements();
  if (element && getNodeName(element) !== 'body') {
    previouslyFocusedElements.push(new WeakRef(element));
    if (previouslyFocusedElements.length > LIST_LIMIT) {
      previouslyFocusedElements = previouslyFocusedElements.slice(-LIST_LIMIT);
    }
  }
}

function getPreviouslyFocusedElement(): Element | undefined {
  clearDisconnectedPreviouslyFocusedElements();
  const elementRef = previouslyFocusedElements.at(-1);
  return elementRef?.deref();
}

function getFirstTabbableElement(container: Element): Element {
  const tabbableOptions = getTabbableOptions();
  if (isTabbable(container, tabbableOptions)) {
    return container;
  }

  return tabbable(container, tabbableOptions)[0] || container;
}

function handleTabIndex(floatingFocusElement: HTMLElement, order: FocusOrder[]): void {
  if (
    !order.includes('floating') &&
    !floatingFocusElement.getAttribute('role')?.includes('dialog')
  ) {
    return;
  }

  const options = getTabbableOptions();
  const focusableElements = focusable(floatingFocusElement, options);
  const tabbableContent = focusableElements.filter((element) => {
    const dataTabIndex = element.getAttribute('data-tabindex') ?? '';
    return (
      isTabbable(element, options) ||
      (element.hasAttribute('data-tabindex') && !dataTabIndex.startsWith('-'))
    );
  });
  const tabIndex = floatingFocusElement.getAttribute('tabindex');

  if (order.includes('floating') || tabbableContent.length === 0) {
    if (tabIndex !== '0') {
      floatingFocusElement.setAttribute('tabindex', '0');
    }
  } else if (
    tabIndex !== '-1' ||
    (floatingFocusElement.hasAttribute('data-tabindex') &&
      floatingFocusElement.getAttribute('data-tabindex') !== '-1')
  ) {
    floatingFocusElement.setAttribute('tabindex', '-1');
    floatingFocusElement.setAttribute('data-tabindex', '-1');
  }
}

function VisuallyHiddenDismiss(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element {
  return <button {...props} type="button" tabindex={-1} style={HIDDEN_STYLES} />;
}

export interface FloatingFocusManagerProps {
  children: JSX.Element;
  /**
   * The floating context returned from `useFloatingRootContext`.
   */
  context: FloatingRootContext;
  /**
   * Whether the focus manager should be disabled. Useful to delay focus
   * management until after a transition completes or some other conditional
   * state.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * The order in which focus cycles.
   * @default ['content']
   */
  order?: FocusOrder[] | undefined;
  /**
   * Which element to initially focus. Can be either a number (tabbable index as
   * specified by the `order`) or an accessor returning the element.
   * @default 0
   */
  initialFocus?: number | (() => HTMLElement | null) | undefined;
  /**
   * Determines if the focus guards are rendered. If not, focus can escape into
   * the address bar, console or browser UI, like in native dialogs.
   * @default true
   */
  guards?: boolean | undefined;
  /**
   * Determines if focus should be returned to the reference element once the
   * floating element closes or unmounts (or, if that is not available, the
   * previously focused element). Ignored if the floating element lost focus.
   * Can also be set to an accessor to explicitly control the element to return
   * focus to.
   * @default true
   */
  returnFocus?: boolean | (() => HTMLElement | null) | undefined;
  /**
   * Determines if focus should be restored to the nearest tabbable element if
   * focus inside the floating element is lost, such as when the currently
   * focused element is removed from the DOM.
   * @default false
   */
  restoreFocus?: boolean | undefined;
  /**
   * Determines if focus is "modal", meaning focus is fully trapped inside the
   * floating element and outside content cannot be accessed. This includes
   * screen reader virtual cursors.
   * @default true
   */
  modal?: boolean | undefined;
  /**
   * If focus management is modal and there is no explicit close button
   * available, renders a visually hidden dismiss button at the start and end of
   * the floating element, so touch-based screen readers can escape it.
   * @default undefined
   */
  visuallyHiddenDismiss?: boolean | string | undefined;
  /**
   * Determines whether `focusout` listeners that close the floating element
   * when focus moves outside of it are attached to the reference and floating
   * elements. Affects non-modal focus management.
   * @default true
   */
  closeOnFocusOut?: boolean | undefined;
  /**
   * Determines whether outside elements are `inert` when `modal` is enabled.
   * This enables pointer modality without a backdrop.
   * @default false
   */
  outsideElementsInert?: boolean | undefined;
  /**
   * Returns a list of elements that should be considered part of the floating
   * element.
   */
  getInsideElements?: (() => Element[]) | undefined;
}

/**
 * Provides focus management for the floating element.
 * @see https://floating-ui.com/docs/FloatingFocusManager
 */
export function FloatingFocusManager(props: FloatingFocusManagerProps): JSX.Element {
  const context = props.context;

  const disabled = (): boolean => props.disabled ?? false;
  const order = (): FocusOrder[] => props.order ?? ['content'];
  const initialFocus = (): number | (() => HTMLElement | null) => props.initialFocus ?? 0;
  const returnFocus = (): boolean | (() => HTMLElement | null) => props.returnFocus ?? true;
  const restoreFocus = (): boolean => props.restoreFocus ?? false;
  const modal = (): boolean => props.modal ?? true;
  const visuallyHiddenDismiss = (): boolean | string => props.visuallyHiddenDismiss ?? false;
  const closeOnFocusOut = (): boolean => props.closeOnFocusOut ?? true;
  const outsideElementsInert = (): boolean => props.outsideElementsInert ?? false;
  const getInsideElements = (): Element[] => props.getInsideElements?.() ?? [];

  const getNodeId = (): string | undefined => context.dataRef.current.floatingContext?.nodeId;

  const ignoreInitialFocus = (): boolean => {
    const value = initialFocus();
    return typeof value === 'number' && value < 0;
  };

  // If the reference is a combobox and is typeable (such as an input or
  // textarea), there are different focus semantics. The guards should not be
  // rendered, but `aria-hidden` should still be applied to all nodes. The
  // visually hidden dismiss button should only appear at the end of the list.
  const isUntrappedTypeableCombobox = (): boolean =>
    isTypeableCombobox(context.elements.domReference) && ignoreInitialFocus();

  // Force the guards to be rendered if the `inert` attribute is unsupported.
  const inertSupported = supportsInert();
  const guards = (): boolean => (inertSupported ? (props.guards ?? true) : true);
  const useInert = (): boolean => !guards() || (inertSupported && outsideElementsInert());

  const tree = useFloatingTree();
  const portalContext = usePortalContext();

  let startDismissButton: HTMLButtonElement | null = null;
  let endDismissButton: HTMLButtonElement | null = null;
  let beforeGuard: HTMLSpanElement | null = null;
  let afterGuard: HTMLSpanElement | null = null;
  let preventReturnFocus = false;
  let isPointerDown = false;
  let tabbableIndex = -1;
  let blurTimeoutId = -1;

  const isInsidePortal = portalContext != null;
  const floatingFocusElement = (): HTMLElement | null =>
    getFloatingFocusElement(context.elements.floating);

  function getTabbableContent(
    container: Element | null = floatingFocusElement(),
  ): FocusableElement[] {
    return container ? tabbable(container, getTabbableOptions()) : [];
  }

  function getTabbableElements(container?: Element): FocusableElement[] {
    const content = getTabbableContent(container);
    const focusElement = floatingFocusElement();
    const domReference = context.elements.domReference;

    const elements: FocusableElement[] = [];
    for (const type of order()) {
      if (type === 'reference' && isFocusableElement(domReference)) {
        elements.push(domReference);
      } else if (type === 'floating' && focusElement) {
        elements.push(focusElement);
      } else {
        elements.push(...content);
      }
    }
    return elements;
  }

  createCleanupEffect(() => {
    if (disabled()) {
      return undefined;
    }
    if (!modal()) {
      return undefined;
    }

    const focusElement = floatingFocusElement();
    const domReference = context.elements.domReference;

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Tab') {
        return;
      }

      // The focus guards have nothing to focus, so we need to stop the event.
      if (
        contains(focusElement, activeElement(getDocument(focusElement))) &&
        getTabbableContent().length === 0 &&
        !isUntrappedTypeableCombobox()
      ) {
        stopEvent(event);
      }

      const els = getTabbableElements();
      const target = getTarget(event);
      const currentOrder = order();

      if (currentOrder[0] === 'reference' && target === domReference) {
        stopEvent(event);
        if (event.shiftKey) {
          enqueueFocus(els[els.length - 1]);
        } else {
          enqueueFocus(els[1]);
        }
      }

      if (currentOrder[1] === 'floating' && target === focusElement && event.shiftKey) {
        stopEvent(event);
        enqueueFocus(els[0]);
      }
    }

    const doc = getDocument(focusElement);
    doc.addEventListener('keydown', onKeyDown);
    return () => {
      doc.removeEventListener('keydown', onKeyDown);
    };
  });

  createCleanupEffect(() => {
    if (disabled()) {
      return undefined;
    }
    const floating = context.elements.floating;
    if (!floating) {
      return undefined;
    }

    function handleFocusIn(event: FocusEvent): void {
      const target = getTarget(event);
      const nextIndex = getTabbableContent().findIndex((element) => element === target);
      if (nextIndex !== -1) {
        tabbableIndex = nextIndex;
      }
    }

    floating.addEventListener('focusin', handleFocusIn);
    return () => {
      floating.removeEventListener('focusin', handleFocusIn);
    };
  });

  createCleanupEffect(() => {
    if (disabled()) {
      return undefined;
    }
    if (!closeOnFocusOut()) {
      return undefined;
    }

    const floating = context.elements.floating;
    const domReference = context.elements.domReference;

    // In Safari, buttons lose focus when pressing them.
    function handlePointerDown(): void {
      isPointerDown = true;
      setTimeout(() => {
        isPointerDown = false;
      });
    }

    function handleFocusOutside(event: FocusEvent): void {
      const relatedTarget = event.relatedTarget instanceof Element ? event.relatedTarget : null;
      const currentTarget = event.currentTarget;
      const eventTarget = getTarget(event);
      const target = eventTarget instanceof Element ? eventTarget : null;

      queueMicrotask(() => {
        const nodeId = getNodeId();
        const focusElement = floatingFocusElement();
        const movedToUnrelatedNode = !(
          contains(domReference, relatedTarget) ||
          contains(floating, relatedTarget) ||
          contains(relatedTarget, floating) ||
          contains(portalContext?.portalNode, relatedTarget) ||
          relatedTarget?.hasAttribute(createAttribute('focus-guard')) === true ||
          (tree !== null &&
            (getNodeChildren(tree.nodesRef.current, nodeId).some(
              (node) =>
                contains(node.context?.elements.floating, relatedTarget) ||
                contains(node.context?.elements.domReference, relatedTarget),
            ) ||
              getNodeAncestors(tree.nodesRef.current, nodeId).some(
                (node) =>
                  node.context?.elements.floating === relatedTarget ||
                  getFloatingFocusElement(node.context?.elements.floating) === relatedTarget ||
                  node.context?.elements.domReference === relatedTarget,
              )))
        );

        if (currentTarget === domReference && focusElement) {
          handleTabIndex(focusElement, order());
        }

        // Restore focus to the previous tabbable element index to prevent
        // focus from being lost outside the floating tree.
        if (
          restoreFocus() &&
          currentTarget !== domReference &&
          !target?.isConnected &&
          activeElement(getDocument(focusElement)) === getDocument(focusElement).body
        ) {
          // Let the `FloatingPortal` effect know that focus is still inside
          // the floating tree.
          if (isHTMLElement(focusElement)) {
            focusElement.focus();
          }

          const content = getTabbableContent();
          const fallback: Element | null =
            content.length > 0 ? content[content.length - 1] : focusElement;
          const nodeToFocus: Element | null =
            tabbableIndex >= 0 && tabbableIndex < content.length
              ? content[tabbableIndex]
              : fallback;

          if (isHTMLElement(nodeToFocus)) {
            nodeToFocus.focus();
          }
        }

        // https://github.com/floating-ui/floating-ui/issues/3060
        if (context.dataRef.current.insideTree) {
          context.dataRef.current.insideTree = false;
          return;
        }

        // Focus did not move inside the floating tree, and there are no
        // tabbable portal guards to handle closing.
        if (
          (isUntrappedTypeableCombobox() ? true : !modal()) &&
          relatedTarget &&
          movedToUnrelatedNode &&
          !isPointerDown &&
          relatedTarget !== getPreviouslyFocusedElement()
        ) {
          preventReturnFocus = true;
          context.onOpenChange(false, event, 'focus-out');
        }
      });
    }

    const shouldHandleBlurCapture = Boolean(!tree && portalContext);

    function markInsideTree(): void {
      blurTimeoutId = clearTimeoutIfSet(blurTimeoutId);
      context.dataRef.current.insideTree = true;
      blurTimeoutId = window.setTimeout(() => {
        context.dataRef.current.insideTree = false;
      });
    }

    if (floating && isHTMLElement(domReference)) {
      domReference.addEventListener('focusout', handleFocusOutside);
      domReference.addEventListener('pointerdown', handlePointerDown);
      floating.addEventListener('focusout', handleFocusOutside);

      if (shouldHandleBlurCapture) {
        floating.addEventListener('focusout', markInsideTree, true);
      }

      return () => {
        domReference.removeEventListener('focusout', handleFocusOutside);
        domReference.removeEventListener('pointerdown', handlePointerDown);
        floating.removeEventListener('focusout', handleFocusOutside);

        if (shouldHandleBlurCapture) {
          floating.removeEventListener('focusout', markInsideTree, true);
        }
      };
    }

    return undefined;
  });

  createCleanupEffect(() => {
    if (disabled()) {
      return undefined;
    }
    const floating = context.elements.floating;
    if (!floating) {
      return undefined;
    }

    const domReference = context.elements.domReference;

    // Don't hide portals nested within the parent portal.
    const portalNodes = Array.from(
      portalContext?.portalNode?.querySelectorAll(`[${createAttribute('portal')}]`) ?? [],
    );

    const ancestors = tree ? getNodeAncestors(tree.nodesRef.current, getNodeId()) : [];
    const rootAncestorComboboxDomReference = ancestors.find((node) =>
      isTypeableCombobox(node.context?.elements.domReference ?? null),
    )?.context?.elements.domReference;

    const insideElements = [
      floating,
      rootAncestorComboboxDomReference,
      ...portalNodes,
      ...getInsideElements(),
      startDismissButton,
      endDismissButton,
      beforeGuard,
      afterGuard,
      portalContext?.beforeOutsideRef.current,
      portalContext?.afterOutsideRef.current,
      order().includes('reference') || isUntrappedTypeableCombobox() ? domReference : null,
    ].filter((x): x is Element => x != null);

    const cleanup =
      modal() || isUntrappedTypeableCombobox()
        ? markOthers(insideElements, !useInert(), useInert())
        : markOthers(insideElements);

    return () => {
      cleanup();
    };
  });

  createRenderEffect(() => {
    const focusElement = floatingFocusElement();
    if (disabled() || !isHTMLElement(focusElement)) {
      return;
    }

    const open = context.open;
    const doc = getDocument(focusElement);
    const previouslyFocusedElement = activeElement(doc);

    // Wait for any effect that sets `tabIndex` to execute.
    queueMicrotask(() => {
      const focusableElements = getTabbableElements(focusElement);
      const initialFocusValue = initialFocus();
      const requestedFocus =
        typeof initialFocusValue === 'number'
          ? focusableElements[initialFocusValue]
          : initialFocusValue();
      const elToFocus = requestedFocus ?? focusElement;
      const focusAlreadyInsideFloatingEl = contains(focusElement, previouslyFocusedElement);

      if (!ignoreInitialFocus() && !focusAlreadyInsideFloatingEl && open) {
        enqueueFocus(elToFocus, {
          preventScroll: elToFocus === focusElement,
        });
      }
    });
  });

  createCleanupEffect(() => {
    const focusElement = floatingFocusElement();
    if (disabled() || !focusElement) {
      return undefined;
    }

    const floating = context.elements.floating;
    const domReference = context.elements.domReference;
    const events = context.events;
    const doc = getDocument(focusElement);
    const previouslyFocusedElement = activeElement(doc);

    addPreviouslyFocusedElement(previouslyFocusedElement);

    // Dismissing via outside press should always ignore `returnFocus` to
    // prevent unwanted scrolling.
    function onOpenChange(payload: OpenChangeEvent): void {
      const { reason, event, nested } = payload;

      if (
        event &&
        reason &&
        ['hover', 'safe-polygon'].includes(reason) &&
        event.type === 'mouseleave'
      ) {
        preventReturnFocus = true;
      }

      if (reason !== 'outside-press' || !event) {
        return;
      }

      const isVirtual =
        (event instanceof PointerEvent && isVirtualPointerEvent(event)) ||
        (event instanceof MouseEvent && isVirtualClick(event));

      if (nested) {
        preventReturnFocus = false;
      } else if (isVirtual) {
        preventReturnFocus = false;
      } else {
        let isPreventScrollSupported = false;
        document.createElement('div').focus({
          get preventScroll() {
            isPreventScrollSupported = true;
            return false;
          },
        });

        preventReturnFocus = !isPreventScrollSupported;
      }
    }

    events.on('openchange', onOpenChange);

    const fallbackEl = doc.createElement('span');
    fallbackEl.setAttribute('tabindex', '-1');
    fallbackEl.setAttribute('aria-hidden', 'true');
    Object.assign(fallbackEl.style, {
      border: '0',
      clipPath: 'inset(50%)',
      height: '1px',
      margin: '-1px',
      overflow: 'hidden',
      padding: '0',
      position: 'fixed',
      whiteSpace: 'nowrap',
      width: '1px',
      top: '0',
      left: '0',
    });

    if (isInsidePortal && domReference) {
      domReference.insertAdjacentElement('afterend', fallbackEl);
    }

    function getReturnElement(): Element {
      const value = returnFocus();
      if (typeof value === 'boolean') {
        const el = domReference ?? getPreviouslyFocusedElement();
        return el?.isConnected ? el : fallbackEl;
      }

      return value() ?? fallbackEl;
    }

    return () => {
      events.off('openchange', onOpenChange);

      const activeEl = activeElement(doc);
      const isFocusInsideFloatingTree =
        contains(floating, activeEl) ||
        (tree &&
          getNodeChildren(tree.nodesRef.current, getNodeId(), false).some((node) =>
            contains(node.context?.elements.floating, activeEl),
          ));

      const returnElement = getReturnElement();
      const shouldReturnFocus = returnFocus();

      queueMicrotask(() => {
        // This is `returnElement` if it is tabbable, or its first tabbable
        // child.
        const tabbableReturnElement = getFirstTabbableElement(returnElement);
        if (
          shouldReturnFocus &&
          !preventReturnFocus &&
          isHTMLElement(tabbableReturnElement) &&
          // If the focus moved somewhere else after mount, avoid returning
          // focus since it likely entered a different element which should be
          // respected: https://github.com/floating-ui/floating-ui/issues/2607
          (tabbableReturnElement !== activeEl && activeEl !== doc.body
            ? isFocusInsideFloatingTree
            : true)
        ) {
          tabbableReturnElement.focus({ preventScroll: true });
        }

        fallbackEl.remove();
      });
    };
  });

  onMount(() => {
    // The `returnFocus` cleanup behavior is inside a microtask; wait for it to
    // complete before resetting the flag.
    queueMicrotask(() => {
      preventReturnFocus = false;
    });
  });

  onCleanup(() => {
    queueMicrotask(clearDisconnectedPreviouslyFocusedElements);
  });

  // Synchronize the context and `modal` value to the `FloatingPortal` context,
  // which decides whether it needs to render its own guards.
  createCleanupEffect(() => {
    if (disabled()) {
      return undefined;
    }
    if (!portalContext) {
      return undefined;
    }

    portalContext.setFocusManagerState({
      modal: modal(),
      closeOnFocusOut: closeOnFocusOut(),
      open: context.open,
      onOpenChange: (open, event, reason) => {
        context.onOpenChange(open, event, reason);
      },
      domReference: context.elements.domReference,
    });

    return () => {
      portalContext.setFocusManagerState(null);
    };
  });

  createRenderEffect(() => {
    const focusElement = floatingFocusElement();
    if (disabled()) {
      return;
    }
    if (!focusElement) {
      return;
    }
    handleTabIndex(focusElement, order());
  });

  function renderDismissButton(location: 'start' | 'end'): JSX.Element {
    if (disabled() || !visuallyHiddenDismiss() || !modal()) {
      return null;
    }

    const label = visuallyHiddenDismiss();

    return (
      <VisuallyHiddenDismiss
        ref={(element) => {
          if (location === 'start') {
            startDismissButton = element;
          } else {
            endDismissButton = element;
          }
        }}
        onClick={(event: MouseEvent) => {
          context.onOpenChange(false, event);
        }}
      >
        {typeof label === 'string' ? label : 'Dismiss'}
      </VisuallyHiddenDismiss>
    );
  }

  const shouldRenderGuards = (): boolean =>
    !disabled() &&
    guards() &&
    (modal() ? !isUntrappedTypeableCombobox() : true) &&
    (isInsidePortal || modal());

  return (
    <>
      {shouldRenderGuards() && (
        <FocusGuard
          data-type="inside"
          ref={(element) => {
            beforeGuard = element;
            if (portalContext) {
              portalContext.beforeInsideRef.current = element;
            }
          }}
          onFocus={(event: FocusEvent) => {
            if (modal()) {
              const els = getTabbableElements();
              enqueueFocus(order()[0] === 'reference' ? els[0] : els[els.length - 1]);
            } else if (portalContext?.preserveTabOrder && portalContext.portalNode) {
              preventReturnFocus = false;
              if (isOutsideEvent(event, portalContext.portalNode)) {
                getNextTabbable(context.elements.domReference)?.focus();
              } else {
                portalContext.beforeOutsideRef.current?.focus();
              }
            }
          }}
        />
      )}
      {/*
        Ensure the first swipe is the list item. The end of the listbox popup
        will have a dismiss button.
      */}
      {!isUntrappedTypeableCombobox() && renderDismissButton('start')}
      {props.children}
      {renderDismissButton('end')}
      {shouldRenderGuards() && (
        <FocusGuard
          data-type="inside"
          ref={(element) => {
            afterGuard = element;
            if (portalContext) {
              portalContext.afterInsideRef.current = element;
            }
          }}
          onFocus={(event: FocusEvent) => {
            if (modal()) {
              enqueueFocus(getTabbableElements()[0]);
            } else if (portalContext?.preserveTabOrder && portalContext.portalNode) {
              if (closeOnFocusOut()) {
                preventReturnFocus = true;
              }

              if (isOutsideEvent(event, portalContext.portalNode)) {
                getPreviousTabbable(context.elements.domReference)?.focus();
              } else {
                portalContext.afterOutsideRef.current?.focus();
              }
            }
          }}
        />
      )}
    </>
  );
}
