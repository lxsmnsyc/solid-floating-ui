import { isNode } from '@floating-ui/utils/dom';
import {
  type Accessor,
  type JSX,
  type Setter,
  Show,
  createContext,
  createEffect,
  createRenderEffect,
  createSignal,
  onCleanup,
  useContext,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import useId from '../hooks/useId';
import type { OpenChangeReason } from '../types';
import { createAttribute } from '../utils/constants';
import { createCleanupEffect } from '../utils/reactivity';
import { type Ref, createRef } from '../utils/ref';
import {
  disableFocusInside,
  enableFocusInside,
  getNextTabbable,
  getPreviousTabbable,
  isOutsideEvent,
} from '../utils/tabbable';
import { FocusGuard } from './FocusGuard';

// Special visually hidden styles for the `aria-owns` owner element to ensure
// owned element accessibility in iOS/Safari/VoiceControl. The owner element is
// an empty span, so most of the common visually hidden styles are not needed.
// See https://github.com/floating-ui/floating-ui/issues/3403
const HIDDEN_OWNER_STYLES: JSX.CSSProperties = {
  'clip-path': 'inset(50%)',
  position: 'fixed',
  top: '0',
  left: '0',
};

export interface FocusManagerState {
  modal: boolean;
  open: boolean;
  onOpenChange(open: boolean, event?: Event, reason?: OpenChangeReason): void;
  domReference: Element | null;
  closeOnFocusOut: boolean;
}

export interface PortalContextValue {
  preserveTabOrder: boolean;
  portalNode: HTMLElement | null;
  setFocusManagerState: Setter<FocusManagerState | null>;
  beforeInsideRef: Ref<HTMLSpanElement | null>;
  afterInsideRef: Ref<HTMLSpanElement | null>;
  beforeOutsideRef: Ref<HTMLSpanElement | null>;
  afterOutsideRef: Ref<HTMLSpanElement | null>;
}

const PortalContext = createContext<PortalContextValue | null>(null);

const attr = createAttribute('portal');

/**
 * A portal root may be given directly or through a ref.
 */
function resolveRoot(root: PortalRoot): HTMLElement | ShadowRoot | null {
  if (root == null) {
    return null;
  }
  return isNode(root) ? root : root.current;
}

export type PortalRoot =
  | HTMLElement
  | ShadowRoot
  | null
  | Ref<HTMLElement | ShadowRoot | null>
  | undefined;

export interface UseFloatingPortalNodeProps {
  id?: string | undefined;
  root?: PortalRoot;
}

/**
 * @see https://floating-ui.com/docs/FloatingPortal#usefloatingportalnode
 */
export function useFloatingPortalNode(
  props: UseFloatingPortalNodeProps = {},
): Accessor<HTMLElement | null> {
  const uniqueId = useId();
  const portalContext = usePortalContext();

  const [portalNode, setPortalNode] = createSignal<HTMLElement | null>(null);

  let created: HTMLDivElement | null = null;

  onCleanup(() => {
    portalNode()?.remove();
    created = null;
  });

  createRenderEffect(() => {
    if (created) {
      return;
    }
    const id = props.id;
    const existingIdRoot = id ? document.getElementById(id) : null;
    if (!existingIdRoot) {
      return;
    }

    const subRoot = document.createElement('div');
    subRoot.id = uniqueId;
    subRoot.setAttribute(attr, '');
    existingIdRoot.appendChild(subRoot);
    created = subRoot;
    setPortalNode(subRoot);
  });

  createRenderEffect(() => {
    const root = props.root;
    // Wait for the root to exist before creating the portal node.
    if (root === null) {
      return;
    }
    if (created) {
      return;
    }

    const id = props.id;

    let container = resolveRoot(root) ?? portalContext?.portalNode ?? document.body;

    let idWrapper: HTMLDivElement | null = null;
    if (id) {
      idWrapper = document.createElement('div');
      idWrapper.id = id;
      container.appendChild(idWrapper);
    }

    const subRoot = document.createElement('div');

    subRoot.id = uniqueId;
    subRoot.setAttribute(attr, '');

    container = idWrapper ?? container;
    container.appendChild(subRoot);

    created = subRoot;
    setPortalNode(subRoot);
  });

  return portalNode;
}

export interface FloatingPortalProps {
  children?: JSX.Element;
  /**
   * Optionally selects the node with the id if it exists, or creates it and
   * appends it to the specified `root` (by default `document.body`).
   */
  id?: string | undefined;
  /**
   * Specifies the root node the portal container will be appended to.
   */
  root?: PortalRoot;
  /**
   * When using non-modal focus management with `FloatingFocusManager`, this
   * preserves the tab order based on the component tree instead of the DOM
   * tree.
   */
  preserveTabOrder?: boolean | undefined;
}

/**
 * Portals the floating element into a given container element, by default
 * outside of the app root and into the body. This ensures the floating element
 * can appear outside any parent container that causes clipping (such as
 * `overflow: hidden`) while retaining its location in the component tree.
 * @see https://floating-ui.com/docs/FloatingPortal
 */
export function FloatingPortal(props: FloatingPortalProps): JSX.Element {
  const preserveTabOrder = (): boolean => props.preserveTabOrder ?? true;

  const portalNode = useFloatingPortalNode({
    get id() {
      return props.id;
    },
    get root() {
      return props.root;
    },
  });

  const [focusManagerState, setFocusManagerState] = createSignal<FocusManagerState | null>(null);

  const beforeOutsideRef = createRef<HTMLSpanElement | null>(null);
  const afterOutsideRef = createRef<HTMLSpanElement | null>(null);
  const beforeInsideRef = createRef<HTMLSpanElement | null>(null);
  const afterInsideRef = createRef<HTMLSpanElement | null>(null);

  const shouldRenderGuards = (): boolean => {
    const state = focusManagerState();
    return (
      // The focus manager, and therefore the floating element, is rendered.
      !!state &&
      // Guards are only for non-modal focus management.
      !state.modal &&
      // Don't render if unmount is transitioning.
      state.open &&
      preserveTabOrder() &&
      (props.root != null || portalNode() != null)
    );
  };

  // https://codesandbox.io/s/tabbable-portal-f4tng?file=/src/TabbablePortal.tsx
  createCleanupEffect(() => {
    const node = portalNode();
    if (!node || !preserveTabOrder() || focusManagerState()?.modal) {
      return undefined;
    }

    // Make sure elements inside the portal element are tabbable only when the
    // portal has already been focused, either by tabbing into a focus trap
    // element outside or using the mouse.
    function onFocus(event: FocusEvent): void {
      if (node && isOutsideEvent(event)) {
        const focusing = event.type === 'focusin';
        const manageFocus = focusing ? enableFocusInside : disableFocusInside;
        manageFocus(node);
      }
    }

    // Listen on the capture phase so these run before the focus trap elements'
    // own focus handlers.
    node.addEventListener('focusin', onFocus, true);
    node.addEventListener('focusout', onFocus, true);
    return () => {
      node.removeEventListener('focusin', onFocus, true);
      node.removeEventListener('focusout', onFocus, true);
    };
  });

  createEffect(() => {
    const node = portalNode();
    if (!node) {
      return;
    }
    if (focusManagerState()?.open) {
      return;
    }
    enableFocusInside(node);
  });

  const context: PortalContextValue = {
    get preserveTabOrder() {
      return preserveTabOrder();
    },
    get portalNode() {
      return portalNode();
    },
    setFocusManagerState,
    beforeInsideRef,
    afterInsideRef,
    beforeOutsideRef,
    afterOutsideRef,
  };

  return (
    <PortalContext.Provider value={context}>
      <Show when={shouldRenderGuards() && portalNode()}>
        {(node) => (
          <>
            <FocusGuard
              data-type="outside"
              ref={(element) => {
                beforeOutsideRef.current = element;
              }}
              onFocus={(event: FocusEvent) => {
                if (isOutsideEvent(event, node())) {
                  beforeInsideRef.current?.focus();
                } else {
                  const domReference = focusManagerState()?.domReference ?? null;
                  getPreviousTabbable(domReference)?.focus();
                }
              }}
            />
            <span aria-owns={node().id} style={HIDDEN_OWNER_STYLES} />
          </>
        )}
      </Show>
      <Show when={portalNode()}>{(node) => <Portal mount={node()}>{props.children}</Portal>}</Show>
      <Show when={shouldRenderGuards() && portalNode()}>
        {(node) => (
          <FocusGuard
            data-type="outside"
            ref={(element) => {
              afterOutsideRef.current = element;
            }}
            onFocus={(event: FocusEvent) => {
              if (isOutsideEvent(event, node())) {
                afterInsideRef.current?.focus();
              } else {
                const state = focusManagerState();
                const domReference = state?.domReference ?? null;
                getNextTabbable(domReference)?.focus();

                if (state?.closeOnFocusOut) {
                  state.onOpenChange(false, event, 'focus-out');
                }
              }
            }}
          />
        )}
      </Show>
    </PortalContext.Provider>
  );
}

export function usePortalContext(): PortalContextValue | null {
  return useContext(PortalContext);
}
