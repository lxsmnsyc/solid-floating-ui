import type {
  Derivable,
  DetectOverflowOptions,
  Middleware,
  MiddlewareState,
  SideObject,
} from '@floating-ui/dom';
import { offset } from '@floating-ui/dom';
import { evaluate, max, min, round } from '@floating-ui/utils';
import { DEV } from 'solid-js';
import type { AnyElementProps, ElementProps, FloatingRootContext } from './types';
import type { ListRef } from './utils/composite';
import { warn } from './utils/log';
import { getUserAgent } from './utils/platform';
import { createCleanupEffect } from './utils/reactivity';
import type { Ref } from './utils/ref';

function getArgsWithCustomFloatingHeight(state: MiddlewareState, height: number): MiddlewareState {
  return {
    ...state,
    rects: {
      ...state.rects,
      floating: {
        ...state.rects.floating,
        height,
      },
    },
  };
}

export interface InnerProps extends DetectOverflowOptions {
  /**
   * A ref which contains an array of HTML elements.
   * @default empty list
   */
  listRef: ListRef;
  /**
   * The index of the active (focused or highlighted) item in the list.
   * @default 0
   */
  index: number;
  /**
   * Callback invoked when the fallback state changes.
   */
  onFallbackChange?: null | ((fallback: boolean) => void) | undefined;
  /**
   * The offset to apply to the floating element.
   * @default 0
   */
  offset?: number | undefined;
  /**
   * A ref which contains the overflow of the floating element.
   */
  overflowRef?: Ref<SideObject | null> | undefined;
  /**
   * An optional ref containing an `HTMLElement`. May be used as the scrolling
   * container instead of the floating element, for instance to position inner
   * elements as direct children without being interfered with by scrolling
   * layout.
   */
  scrollRef?: (() => HTMLElement | null) | undefined;
  /**
   * The minimum number of items that should be visible in the list.
   * @default 4
   */
  minItemsVisible?: number | undefined;
  /**
   * The threshold for the reference element's overflow in pixels.
   * @default 0
   */
  referenceOverflowThreshold?: number | undefined;
}

/**
 * Positions the floating element such that an inner element inside of it is
 * anchored to the reference element.
 * @see https://floating-ui.com/docs/inner
 */
export const inner = (props: InnerProps | Derivable<InnerProps>): Middleware => ({
  name: 'inner',
  options: props,
  async fn(state) {
    const {
      listRef,
      overflowRef,
      onFallbackChange,
      offset: innerOffset = 0,
      index,
      minItemsVisible = 4,
      referenceOverflowThreshold = 0,
      scrollRef,
      ...detectOverflowOptions
    } = evaluate(props, state);

    const {
      rects,
      platform,
      elements: { floating },
    } = state;

    const item = listRef()[index];
    const scrollEl = scrollRef?.() ?? floating;

    // Valid combinations:
    // 1. Floating element is the `scrollRef` and has a border (default)
    // 2. Floating element is not the `scrollRef`, floating element has a border
    // 3. Floating element is not the `scrollRef`, `scrollRef` has a border
    const clientTop = floating.clientTop || scrollEl.clientTop;
    const floatingIsBordered = floating.clientTop !== 0;
    const scrollElIsBordered = scrollEl.clientTop !== 0;
    const floatingIsScrollEl = floating === scrollEl;

    if (DEV) {
      if (!state.placement.startsWith('bottom')) {
        warn('`placement` side must be "bottom" when using the `inner`', 'middleware.');
      }
    }

    if (!item) {
      return {};
    }

    const nextArgs = {
      ...state,
      ...(await offset(
        -item.offsetTop -
          floating.clientTop -
          rects.reference.height / 2 -
          item.offsetHeight / 2 -
          innerOffset,
      ).fn(state)),
    };

    const overflow = await platform.detectOverflow(
      getArgsWithCustomFloatingHeight(
        nextArgs,
        scrollEl.scrollHeight + clientTop + floating.clientTop,
      ),
      detectOverflowOptions,
    );
    const refOverflow = await platform.detectOverflow(nextArgs, {
      ...detectOverflowOptions,
      elementContext: 'reference',
    });

    const diffY = max(0, overflow.top);
    const nextY = nextArgs.y + diffY;
    const isScrollable = scrollEl.scrollHeight > scrollEl.clientHeight;
    const rounder = isScrollable ? (value: number) => value : round;

    const maxHeight = rounder(
      max(
        0,
        scrollEl.scrollHeight +
          ((floatingIsBordered && floatingIsScrollEl) || scrollElIsBordered ? clientTop * 2 : 0) -
          diffY -
          max(0, overflow.bottom),
      ),
    );

    scrollEl.style.maxHeight = `${maxHeight}px`;
    scrollEl.scrollTop = diffY;

    // There is not enough space, fall back to standard anchored positioning.
    if (onFallbackChange) {
      const shouldFallback =
        scrollEl.offsetHeight < item.offsetHeight * min(minItemsVisible, listRef().length) - 1 ||
        refOverflow.top >= -referenceOverflowThreshold ||
        refOverflow.bottom >= -referenceOverflowThreshold;

      onFallbackChange(shouldFallback);
    }

    if (overflowRef) {
      overflowRef.current = await platform.detectOverflow(
        getArgsWithCustomFloatingHeight(
          { ...nextArgs, y: nextY },
          scrollEl.offsetHeight + clientTop + floating.clientTop,
        ),
        detectOverflowOptions,
      );
    }

    return {
      y: nextY,
    };
  },
});

export interface UseInnerOffsetProps {
  /**
   * Whether the hook is enabled, including all internal effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * A ref which contains the overflow of the floating element.
   */
  overflowRef: Ref<SideObject | null>;
  /**
   * An optional ref containing an `HTMLElement` used as the scrolling
   * container instead of the floating element.
   */
  scrollRef?: (() => HTMLElement | null) | undefined;
  /**
   * Callback invoked when the offset changes.
   */
  onChange: (offset: number | ((offset: number) => number)) => void;
}

/**
 * Changes the `inner` middleware's `offset` upon a `wheel` event to expand the
 * floating element's height, revealing more list items.
 * @see https://floating-ui.com/docs/inner
 */
export function useInnerOffset(
  context: FloatingRootContext,
  props: UseInnerOffsetProps,
): ElementProps {
  const enabled = (): boolean => props.enabled !== false;

  let controlledScrolling = false;
  let prevScrollTop: number | null = null;

  createCleanupEffect(() => {
    if (!enabled()) {
      return undefined;
    }

    const el = props.scrollRef?.() ?? context.elements.floating;

    function onWheel(event: WheelEvent): void {
      if (event.ctrlKey || !el || props.overflowRef.current == null) {
        return;
      }

      const dY = event.deltaY;
      const isAtTop = props.overflowRef.current.top >= -0.5;
      const isAtBottom = props.overflowRef.current.bottom >= -0.5;
      const remainingScroll = el.scrollHeight - el.clientHeight;
      const sign = dY < 0 ? -1 : 1;
      const method = dY < 0 ? 'max' : 'min';

      if (el.scrollHeight <= el.clientHeight) {
        return;
      }

      if ((!isAtTop && dY > 0) || (!isAtBottom && dY < 0)) {
        event.preventDefault();
        props.onChange((d) => d + Math[method](dY, remainingScroll * sign));
      } else if (/firefox/i.test(getUserAgent())) {
        // Needed to propagate scrolling during the momentum scrolling phase
        // once it gets limited by the boundary.
        el.scrollTop += dY;
      }
    }

    if (context.open && el) {
      el.addEventListener('wheel', onWheel);

      // Wait for the position to be ready.
      requestAnimationFrame(() => {
        prevScrollTop = el.scrollTop;
      });

      return () => {
        prevScrollTop = null;
        el.removeEventListener('wheel', onWheel);
      };
    }

    return undefined;
  });

  const floating: AnyElementProps = {
    onKeyDown() {
      controlledScrolling = true;
    },
    onWheel() {
      controlledScrolling = false;
    },
    onPointerMove() {
      controlledScrolling = false;
    },
    onScroll() {
      const el = props.scrollRef?.() ?? context.elements.floating;

      if (!props.overflowRef.current || !el || !controlledScrolling) {
        return;
      }

      if (prevScrollTop !== null) {
        const scrollDiff = el.scrollTop - prevScrollTop;

        if (
          (props.overflowRef.current.bottom < -0.5 && scrollDiff < -1) ||
          (props.overflowRef.current.top < -0.5 && scrollDiff > 1)
        ) {
          props.onChange((d) => d + scrollDiff);
        }
      }

      // [Firefox] Wait for the height change to have been applied.
      requestAnimationFrame(() => {
        prevScrollTop = el.scrollTop;
      });
    },
  };

  return {
    get floating() {
      return enabled() ? floating : undefined;
    },
  };
}
