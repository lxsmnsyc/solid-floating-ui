import type { Dimensions } from '@floating-ui/dom';
import {
  type JSX,
  createContext,
  createSignal,
  mergeProps,
  splitProps,
  useContext,
} from 'solid-js';
import { useMergeRefs } from '../hooks/useMergeRefs';
import type { AnyElementProps } from '../types';
import {
  type DisabledIndices,
  type ListRef,
  createGridCellMap,
  findNonDisabledListIndex,
  getGridCellIndexOfCorner,
  getGridCellIndices,
  getGridNavigatedIndex,
  getMaxListIndex,
  getMinListIndex,
  isIndexOutOfListBounds,
  isListIndexDisabled,
} from '../utils/composite';
import { ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT, ARROW_UP } from '../utils/constants';
import { createRef } from '../utils/ref';
import { FloatingList, useListItem } from './FloatingList';

/**
 * Solid has no `cloneElement`, so the element to render is always described by
 * a callback that receives the computed props.
 */
export type RenderProp = (props: AnyElementProps) => JSX.Element;

function renderJsx(render: RenderProp | undefined, computedProps: AnyElementProps): JSX.Element {
  if (render) {
    return render(computedProps);
  }
  return <div {...computedProps} />;
}

interface CompositeContextValue {
  readonly activeIndex: number;
  onNavigate(index: number): void;
}

const CompositeContext = createContext<CompositeContextValue>({
  activeIndex: 0,
  onNavigate: () => {},
});

export interface CompositeProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'onKeyDown' | 'ref'> {
  /**
   * Called before the composite's own arrow key handling.
   */
  onKeyDown?: ((event: KeyboardEvent) => void) | undefined;
  /**
   * Determines the element to render.
   * @example
   * ```jsx
   * <Composite render={htmlProps => <ul {...htmlProps} />} />
   * ```
   */
  render?: RenderProp | undefined;
  /**
   * Determines the orientation of the composite.
   */
  orientation?: 'horizontal' | 'vertical' | 'both' | undefined;
  /**
   * Determines whether focus should loop around when navigating past the first
   * or last item.
   */
  loop?: boolean | undefined;
  /**
   * Whether the direction of the composite's navigation is in RTL layout.
   */
  rtl?: boolean | undefined;
  /**
   * Determines the number of columns there are in the composite (that is, it
   * is a grid).
   */
  cols?: number | undefined;
  /**
   * Determines which items are disabled. The `disabled` or `aria-disabled`
   * attributes are used by default.
   */
  disabledIndices?: DisabledIndices | undefined;
  /**
   * Determines which item is active. Used to externally control the active
   * item.
   */
  activeIndex?: number | undefined;
  /**
   * Called when the user navigates to a new item. Used to externally control
   * the active item.
   */
  onNavigate?: ((index: number) => void) | undefined;
  /**
   * Only for `cols > 1`, specify sizes for grid items.
   * `{ width: 2, height: 2 }` means an item is 2 columns wide and 2 rows tall.
   */
  itemSizes?: Dimensions[] | undefined;
  /**
   * Only relevant for `cols > 1` and items with different sizes, specify if
   * the grid is dense (as defined in the CSS spec for `grid-auto-flow`).
   */
  dense?: boolean | undefined;
}

/**
 * The corner to measure a grid move from: the edge closest to the direction of
 * travel, preferring top and left, so a move never lands on the same item.
 */
function cornerForKey(key: string, horizontalEndKey: string): 'tl' | 'tr' | 'bl' {
  if (key === ARROW_DOWN) {
    return 'bl';
  }
  return key === horizontalEndKey ? 'tr' : 'tl';
}

const horizontalKeys = [ARROW_LEFT, ARROW_RIGHT];
const verticalKeys = [ARROW_UP, ARROW_DOWN];
const allKeys = [...horizontalKeys, ...verticalKeys];

/**
 * Creates a single tab stop whose items are navigated by arrow keys, which
 * provides list navigation outside of floating element contexts. A menubar is
 * an example of a composite, with each reference element being an item.
 * @see https://floating-ui.com/docs/Composite
 */
export function Composite(props: CompositeProps): JSX.Element {
  const [local, domProps] = splitProps(props, [
    'render',
    'orientation',
    'loop',
    'rtl',
    'cols',
    'disabledIndices',
    'activeIndex',
    'onNavigate',
    'itemSizes',
    'dense',
    'onKeyDown',
  ]);

  const orientation = (): 'horizontal' | 'vertical' | 'both' => local.orientation ?? 'both';
  const loop = (): boolean => local.loop ?? true;
  const rtl = (): boolean => local.rtl ?? false;
  const cols = (): number => local.cols ?? 1;
  const dense = (): boolean => local.dense ?? false;

  const [internalActiveIndex, setInternalActiveIndex] = createSignal(0);
  const activeIndex = (): number => local.activeIndex ?? internalActiveIndex();

  function onNavigate(index: number): void {
    if (local.onNavigate) {
      local.onNavigate(index);
    } else {
      setInternalActiveIndex(index);
    }
  }

  const elementsRef = createRef<(HTMLElement | null)[]>([]);
  // `FloatingList` fills the container in, and the navigation helpers read it.
  const listRef: ListRef = () => elementsRef.current;

  function handleKeyDown(event: KeyboardEvent): void {
    if (!allKeys.includes(event.key)) {
      return;
    }

    const disabledIndices = local.disabledIndices;
    const currentActiveIndex = activeIndex();
    const currentCols = cols();
    const currentRtl = rtl();
    const currentOrientation = orientation();
    const isGrid = currentCols > 1;

    let nextIndex = currentActiveIndex;
    const minIndex = getMinListIndex(listRef, disabledIndices);
    const maxIndex = getMaxListIndex(listRef, disabledIndices);

    const horizontalEndKey = currentRtl ? ARROW_LEFT : ARROW_RIGHT;
    const horizontalStartKey = currentRtl ? ARROW_RIGHT : ARROW_LEFT;

    if (isGrid) {
      const sizes =
        local.itemSizes ??
        Array.from({ length: listRef().length }, () => ({
          width: 1,
          height: 1,
        }));
      // To calculate movements on the grid, we use hypothetical cell indices
      // as if every item was 1x1, then convert back to real indices.
      const cellMap = createGridCellMap(sizes, currentCols, dense());
      const explicitDisabledIndices =
        typeof disabledIndices === 'function' ? undefined : disabledIndices;
      const minGridIndex = cellMap.findIndex(
        (index) => index != null && !isListIndexDisabled(listRef, index, disabledIndices),
      );
      // Last enabled index.
      const maxGridIndex = cellMap.reduce(
        (foundIndex: number, index, cellIndex) =>
          index != null && !isListIndexDisabled(listRef, index, disabledIndices)
            ? cellIndex
            : foundIndex,
        -1,
      );

      const maybeNextIndex =
        cellMap[
          getGridNavigatedIndex(
            () => cellMap.map((itemIndex) => (itemIndex ? (listRef()[itemIndex] ?? null) : null)),
            {
              event,
              orientation: currentOrientation,
              loop: loop(),
              rtl: currentRtl,
              cols: currentCols,
              // Treat undefined (empty grid spaces) as disabled indices so we
              // don't end up in them.
              disabledIndices: getGridCellIndices(
                [
                  ...(explicitDisabledIndices ??
                    listRef().map((_, index) =>
                      isListIndexDisabled(listRef, index, disabledIndices) ? index : undefined,
                    )),
                  undefined,
                ],
                cellMap,
              ),
              minIndex: minGridIndex,
              maxIndex: maxGridIndex,
              prevIndex: getGridCellIndexOfCorner(
                currentActiveIndex > maxIndex ? minIndex : currentActiveIndex,
                sizes,
                cellMap,
                currentCols,
                cornerForKey(event.key, horizontalEndKey),
              ),
            },
          )
        ];

      if (maybeNextIndex != null) {
        nextIndex = maybeNextIndex;
      }
    }

    const toEndKeys = {
      horizontal: [horizontalEndKey],
      vertical: [ARROW_DOWN],
      both: [horizontalEndKey, ARROW_DOWN],
    }[currentOrientation];

    const toStartKeys = {
      horizontal: [horizontalStartKey],
      vertical: [ARROW_UP],
      both: [horizontalStartKey, ARROW_UP],
    }[currentOrientation];

    const preventedKeys = isGrid
      ? allKeys
      : {
          horizontal: horizontalKeys,
          vertical: verticalKeys,
          both: allKeys,
        }[currentOrientation];

    if (nextIndex === currentActiveIndex && [...toEndKeys, ...toStartKeys].includes(event.key)) {
      if (loop() && nextIndex === maxIndex && toEndKeys.includes(event.key)) {
        nextIndex = minIndex;
      } else if (loop() && nextIndex === minIndex && toStartKeys.includes(event.key)) {
        nextIndex = maxIndex;
      } else {
        nextIndex = findNonDisabledListIndex(listRef, {
          startingIndex: nextIndex,
          decrement: toStartKeys.includes(event.key),
          disabledIndices,
        });
      }
    }

    if (nextIndex !== currentActiveIndex && !isIndexOutOfListBounds(listRef, nextIndex)) {
      event.stopPropagation();

      if (preventedKeys.includes(event.key)) {
        event.preventDefault();
      }

      onNavigate(nextIndex);
      listRef()[nextIndex]?.focus();
    }
  }

  const context: CompositeContextValue = {
    get activeIndex() {
      return activeIndex();
    },
    onNavigate,
  };

  const ariaOrientation = (): 'horizontal' | 'vertical' | undefined => {
    const value = orientation();
    return value === 'both' ? undefined : value;
  };

  // `mergeProps` keeps each value lazy without rebuilding the object, so the
  // element's own ref is read once while the reactive props stay live.
  const computedProps = mergeProps(domProps, {
    get 'aria-orientation'() {
      return ariaOrientation();
    },
    onKeyDown(event: KeyboardEvent) {
      local.onKeyDown?.(event);
      handleKeyDown(event);
    },
  }) as AnyElementProps;

  return (
    <CompositeContext.Provider value={context}>
      <FloatingList elementsRef={elementsRef}>
        {renderJsx(local.render, computedProps)}
      </FloatingList>
    </CompositeContext.Provider>
  );
}

export interface CompositeItemProps extends Omit<
  JSX.HTMLAttributes<HTMLElement>,
  'onFocus' | 'ref'
> {
  /**
   * Called before the item reports itself as the active one.
   */
  onFocus?: ((event: FocusEvent) => void) | undefined;
  /**
   * Determines the element to render.
   * @example
   * ```jsx
   * <CompositeItem render={htmlProps => <li {...htmlProps} />} />
   * ```
   */
  render?: RenderProp | undefined;
  ref?: ((node: HTMLElement | null) => void) | undefined;
}

/**
 * @see https://floating-ui.com/docs/Composite
 */
export function CompositeItem(props: CompositeItemProps): JSX.Element {
  const [local, domProps] = splitProps(props, ['render', 'ref', 'onFocus']);

  const compositeContext = useContext(CompositeContext);
  const listItem = useListItem();
  const mergedRef = useMergeRefs<HTMLElement>([listItem.ref, local.ref]);
  const isActive = (): boolean => compositeContext.activeIndex === listItem.index;

  const computedProps = mergeProps(domProps, {
    ref: mergedRef,
    get tabindex() {
      return isActive() ? 0 : -1;
    },
    get 'data-active'() {
      return isActive() ? '' : undefined;
    },
    onFocus(event: FocusEvent) {
      local.onFocus?.(event);
      compositeContext.onNavigate(listItem.index);
    },
  }) as AnyElementProps;

  return renderJsx(local.render, computedProps);
}
