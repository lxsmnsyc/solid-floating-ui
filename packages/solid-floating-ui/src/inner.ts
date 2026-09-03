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
import type { ListItems } from './utils/composite';
import { warn } from './utils/log';
import { getUserAgent } from './utils/platform';
import { createCleanupEffect } from './utils/reactivity';

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
   * Reads the list items, in index order.
   * @default empty list
   */
  items: ListItems;
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
   * Called with the floating element's measured overflow. Pair it with
   * `useInnerOffset`, which reads the same value back.
   */
  onOverflowChange?: ((overflow: SideObject) => void) | undefined;
  /**
   * Reads an element to use as the scrolling container instead of the floating
   * element, for instance to position inner elements as direct children
   * without being interfered with by scrolling layout.
   */
  scrollElement?: (() => HTMLElement | null) | undefined;
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
 */
export const inner = (props: InnerProps | Derivable<InnerProps>): Middleware => ({
  name: 'inner',
  options: props,
  async fn(state) {
    const {
      items,
      onOverflowChange,
      onFallbackChange,
      offset: innerOffset = 0,
      index,
      minItemsVisible = 4,
      referenceOverflowThreshold = 0,
      scrollElement,
      ...detectOverflowOptions
    } = evaluate(props, state);

    const {
      rects,
      platform,
      elements: { floating },
    } = state;

    const item = items()[index];
    const scrollEl = scrollElement?.() ?? floating;

    // Valid combinations:
    // 1. Floating element is the `scrollElement` and has a border (default)
    // 2. Floating element is not the `scrollElement`, floating element has a border
    // 3. Floating element is not the `scrollElement`, `scrollElement` has a border
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
        scrollEl.offsetHeight < item.offsetHeight * min(minItemsVisible, items().length) - 1 ||
        refOverflow.top >= -referenceOverflowThreshold ||
        refOverflow.bottom >= -referenceOverflowThreshold;

      onFallbackChange(shouldFallback);
    }

    if (onOverflowChange) {
      onOverflowChange(
        await platform.detectOverflow(
          getArgsWithCustomFloatingHeight(
            { ...nextArgs, y: nextY },
            scrollEl.offsetHeight + clientTop + floating.clientTop,
          ),
          detectOverflowOptions,
        ),
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
   * Reads the floating element's overflow, as reported by the `inner`
   * middleware's `onOverflowChange`.
   */
  overflow: () => SideObject | null;
  /**
   * Reads an element to use as the scrolling container instead of the floating
   * element.
   */
  scrollElement?: (() => HTMLElement | null) | undefined;
  /**
   * Callback invoked when the offset changes.
   */
  onChange: (offset: number | ((offset: number) => number)) => void;
}

/**
 * Changes the `inner` middleware's `offset` upon a `wheel` event to expand the
 * floating element's height, revealing more list items.
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

    const el = props.scrollElement?.() ?? context.elements.floating;

    function onWheel(event: WheelEvent): void {
      const currentOverflow = props.overflow();

      if (event.ctrlKey || !el || currentOverflow == null) {
        return;
      }

      const dY = event.deltaY;
      const isAtTop = currentOverflow.top >= -0.5;
      const isAtBottom = currentOverflow.bottom >= -0.5;
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
      const el = props.scrollElement?.() ?? context.elements.floating;

      const currentOverflow = props.overflow();

      if (!currentOverflow || !el || !controlledScrolling) {
        return;
      }

      if (prevScrollTop !== null) {
        const scrollDiff = el.scrollTop - prevScrollTop;

        if (
          (currentOverflow.bottom < -0.5 && scrollDiff < -1) ||
          (currentOverflow.top < -0.5 && scrollDiff > 1)
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
