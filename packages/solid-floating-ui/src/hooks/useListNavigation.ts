import type { Dimensions } from '@floating-ui/dom';
import { isHTMLElement } from '@floating-ui/utils/dom';
import { DEV, createSignal } from 'solid-js';
import { useFloatingParentNodeId, useFloatingTree } from '../components/FloatingTree';
import type { AnyElementProps, ElementProps, FloatingRootContext } from '../types';
import {
  type DisabledIndices,
  type ListItems,
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
import {
  activeElement,
  contains,
  getDocument,
  getFloatingFocusElement,
  isTypeableCombobox,
} from '../utils/element';
import { enqueueFocus } from '../utils/schedule';
import { isVirtualClick, isVirtualPointerEvent, stopEvent } from '../utils/event';
import { warn } from '../utils/log';
import { getDeepestNode } from '../utils/nodes';
import { createCleanupEffect, createTrackingEffect, lazyProps } from '../utils/reactivity';

export const ESCAPE = 'Escape';

/**
 * The element a delegated handler is attached to.
 */
function currentTargetElement(event: Event): HTMLElement | null {
  return event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
}

type Orientation = 'vertical' | 'horizontal' | 'both';

function doSwitch(
  orientation: Orientation | undefined,
  vertical: boolean,
  horizontal: boolean,
): boolean {
  switch (orientation) {
    case 'vertical':
      return vertical;
    case 'horizontal':
      return horizontal;
    case 'both':
    case undefined:
    default:
      return vertical || horizontal;
  }
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

function isMainOrientationKey(key: string, orientation: Orientation | undefined): boolean {
  const vertical = key === ARROW_UP || key === ARROW_DOWN;
  const horizontal = key === ARROW_LEFT || key === ARROW_RIGHT;
  return doSwitch(orientation, vertical, horizontal);
}

function isMainOrientationToEndKey(
  key: string,
  orientation: Orientation | undefined,
  rtl: boolean,
): boolean {
  const vertical = key === ARROW_DOWN;
  const horizontal = rtl ? key === ARROW_LEFT : key === ARROW_RIGHT;
  return (
    doSwitch(orientation, vertical, horizontal) || key === 'Enter' || key === ' ' || key === ''
  );
}

function isCrossOrientationOpenKey(
  key: string,
  orientation: Orientation | undefined,
  rtl: boolean,
): boolean {
  const vertical = rtl ? key === ARROW_LEFT : key === ARROW_RIGHT;
  const horizontal = key === ARROW_DOWN;
  return doSwitch(orientation, vertical, horizontal);
}

function isCrossOrientationCloseKey(
  key: string,
  orientation: Orientation | undefined,
  rtl: boolean,
  cols?: number,
): boolean {
  const vertical = rtl ? key === ARROW_RIGHT : key === ARROW_LEFT;
  const horizontal = key === ARROW_UP;
  if (orientation === 'both' || (orientation === 'horizontal' && cols && cols > 1)) {
    return key === ESCAPE;
  }
  return doSwitch(orientation, vertical, horizontal);
}

export interface UseListNavigationProps {
  /**
   * Reads the list items, in index order.
   * @default empty list
   */
  items: ListItems;
  /**
   * The index of the currently active (focused or highlighted) item, which may
   * or may not be selected.
   * @default null
   */
  activeIndex: number | null;
  /**
   * A callback that is called when the user navigates to a new active item,
   * passed in a new `activeIndex`.
   */
  onNavigate?: ((activeIndex: number | null) => void) | undefined;
  /**
   * Whether the hook is enabled, including all internal effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * The currently selected item index, which may or may not be active.
   * @default null
   */
  selectedIndex?: number | null | undefined;
  /**
   * Whether to focus the item upon opening the floating element. `'auto'`
   * infers what to do based on the input type (keyboard vs. pointer), while a
   * boolean value forces the value.
   * @default 'auto'
   */
  focusItemOnOpen?: boolean | 'auto' | undefined;
  /**
   * Whether hovering an item synchronizes the focus.
   * @default true
   */
  focusItemOnHover?: boolean | undefined;
  /**
   * Whether pressing an arrow key on the navigation's main axis opens the
   * floating element.
   * @default true
   */
  openOnArrowKeyDown?: boolean | undefined;
  /**
   * By default elements with either a `disabled` or `aria-disabled` attribute
   * are skipped in the list navigation, which requires the items to be
   * rendered. This prop lets you specify indices which should be disabled,
   * overriding the default logic. For Windows-style select menus, where the
   * menu does not open when navigating via arrow keys, specify an empty array.
   * @default undefined
   */
  disabledIndices?: DisabledIndices | undefined;
  /**
   * Determines whether focus can escape the list, such that nothing is selected
   * after navigating beyond the boundary of the list. `loop` must be `true`.
   * @default false
   */
  allowEscape?: boolean | undefined;
  /**
   * Determines whether focus should loop around when navigating past the first
   * or last item.
   * @default false
   */
  loop?: boolean | undefined;
  /**
   * If the list is nested within another one (such as a nested submenu), the
   * navigation semantics change.
   * @default false
   */
  nested?: boolean | undefined;
  /**
   * The orientation of the parent list, used to determine the direction of the
   * navigation. Useful when list navigation is used within a `Composite`,
   * where the orientation of the parent list cannot be determined
   * automatically.
   */
  parentOrientation?: Orientation | undefined;
  /**
   * Whether the direction of the floating element's navigation is in RTL
   * layout.
   * @default false
   */
  rtl?: boolean | undefined;
  /**
   * Whether the focus is virtual (using `aria-activedescendant`). Use this if
   * you need focus to remain on the reference element (such as an input) but
   * allow arrow keys to navigate list items. Virtually-focused list items must
   * have a unique `id` set on them.
   * @default false
   */
  virtual?: boolean | undefined;
  /**
   * The orientation in which navigation occurs.
   * @default 'vertical'
   */
  orientation?: Orientation | undefined;
  /**
   * Specifies how many columns the list has (that is, it is a grid). Use an
   * orientation of `'horizontal'` or `'both'`.
   * @default 1
   */
  cols?: number | undefined;
  /**
   * Whether to scroll the active item into view when navigating. The default
   * value uses nearest options.
   */
  scrollItemIntoView?: boolean | ScrollIntoViewOptions | undefined;
  /**
   * Called with the virtually-focused item when virtual focus management is in
   * use. Requires `FloatingTree` to be set up.
   */
  onVirtualItemChange?: ((item: HTMLElement | null) => void) | undefined;
  /**
   * Only for `cols > 1`, specify sizes for grid items.
   * `{ width: 2, height: 2 }` means an item is 2 columns wide and 2 rows tall.
   */
  itemSizes?: Dimensions[] | undefined;
  /**
   * Only relevant for `cols > 1` and items with different sizes, specify if
   * the grid is dense (as defined in the CSS spec for `grid-auto-flow`).
   * @default false
   */
  dense?: boolean | undefined;
}

/**
 * Adds arrow key-based navigation of a list of items, either using real DOM
 * focus or virtual focus.
 */
export function useListNavigation(
  context: FloatingRootContext,
  props: UseListNavigationProps,
): ElementProps {
  const enabled = (): boolean => props.enabled !== false;
  const selectedIndex = (): number | null => props.selectedIndex ?? null;
  const allowEscape = (): boolean => props.allowEscape ?? false;
  const loop = (): boolean => props.loop ?? false;
  const nested = (): boolean => props.nested ?? false;
  const rtl = (): boolean => props.rtl ?? false;
  const virtual = (): boolean => props.virtual ?? false;
  const focusItemOnOpen = (): boolean | 'auto' => props.focusItemOnOpen ?? 'auto';
  const focusItemOnHover = (): boolean => props.focusItemOnHover ?? true;
  const openOnArrowKeyDown = (): boolean => props.openOnArrowKeyDown ?? true;
  const orientation = (): Orientation => props.orientation ?? 'vertical';
  const cols = (): number => props.cols ?? 1;
  const scrollItemIntoView = (): boolean | ScrollIntoViewOptions =>
    props.scrollItemIntoView ?? true;
  const dense = (): boolean => props.dense ?? false;

  if (DEV) {
    if (allowEscape()) {
      if (!loop()) {
        warn('`useListNavigation` looping must be enabled to allow escaping.');
      }

      if (!virtual()) {
        warn('`useListNavigation` must be virtual to allow escaping.');
      }
    }

    if (orientation() === 'vertical' && cols() > 1) {
      warn(
        'In grid list navigation mode (`cols` > 1), the `orientation` should',
        'be either "horizontal" or "both".',
      );
    }
  }

  const floatingFocusElement = (): HTMLElement | null =>
    getFloatingFocusElement(context.elements.floating);

  const parentId = useFloatingParentNodeId();
  const tree = useFloatingTree();

  createTrackingEffect(() => {
    context.data.orientation = orientation();
  });

  const typeableComboboxReference = (): boolean =>
    isTypeableCombobox(context.elements.domReference);

  let currentFocusItemOnOpen: boolean | 'auto' = focusItemOnOpen();
  let index = selectedIndex() ?? -1;
  let key: string | null = null;
  let isPointerModality = true;
  let previousMounted = !!context.elements.floating;
  let previousOpen = context.open;
  let forceSyncFocus = false;
  let forceScrollIntoView = false;

  const [activeId, setActiveId] = createSignal<string | undefined>();
  const [virtualId, setVirtualId] = createSignal<string | undefined>();

  function onNavigate(): void {
    props.onNavigate?.(index === -1 ? null : index);
  }

  // Called with the previous `onNavigate` when the floating element unmounts,
  // since it can be specified conditionally by the caller.
  let previousOnNavigate = onNavigate;

  function focusItem(): void {
    const items = props.items;

    function runFocus(item: HTMLElement): void {
      if (virtual()) {
        if (item.id.endsWith('-fui-option')) {
          item.id = `${context.floatingId}-${Math.random().toString(16).slice(2, 10)}`;
        }
        setActiveId(item.id);
        tree?.events.emit('virtualfocus', item);
        props.onVirtualItemChange?.(item);
      } else {
        enqueueFocus(item, {
          sync: forceSyncFocus,
          preventScroll: true,
        });
      }
    }

    const initialItem = items()[index];
    const shouldForceScrollIntoView = forceScrollIntoView;

    if (initialItem) {
      runFocus(initialItem);
    }

    const scheduler = forceSyncFocus
      ? (callback: () => void) => {
          callback();
        }
      : requestAnimationFrame;

    scheduler(() => {
      const waitedItem = items()[index] ?? initialItem;

      if (!waitedItem) {
        return;
      }

      if (!initialItem) {
        runFocus(waitedItem);
      }

      const scrollIntoViewOptions = scrollItemIntoView();
      const shouldScrollIntoView =
        scrollIntoViewOptions && (shouldForceScrollIntoView || !isPointerModality);

      if (shouldScrollIntoView) {
        // JSDOM doesn't support `.scrollIntoView()` but it's widely supported
        // by all browsers.
        waitedItem.scrollIntoView(
          typeof scrollIntoViewOptions === 'boolean'
            ? { block: 'nearest', inline: 'nearest' }
            : scrollIntoViewOptions,
        );
      }
    });
  }

  // Sync `selectedIndex` to be the `activeIndex` upon opening the floating
  // element. Also, reset `activeIndex` upon closing the floating element.
  createTrackingEffect(() => {
    if (!enabled()) {
      return;
    }

    const currentSelectedIndex = selectedIndex();

    if (context.open && context.elements.floating) {
      if (currentFocusItemOnOpen && currentSelectedIndex != null) {
        // Regardless of the pointer modality, we want to ensure the selected
        // item comes into view when the floating element is opened.
        forceScrollIntoView = true;
        index = currentSelectedIndex;
        onNavigate();
      }
    } else if (previousMounted) {
      index = -1;
      previousOnNavigate();
    }
  });

  // Sync `activeIndex` to be the focused item while the floating element is
  // open.
  createTrackingEffect(() => {
    if (!enabled()) {
      return;
    }
    if (!context.open) {
      return;
    }
    if (!context.elements.floating) {
      return;
    }

    const activeIndex = props.activeIndex;

    if (activeIndex == null) {
      forceSyncFocus = false;

      if (selectedIndex() != null) {
        return;
      }

      // Reset while the floating element was open (for example the list
      // changed).
      if (previousMounted) {
        index = -1;
        focusItem();
      }

      // Initial sync.
      if (
        (!previousOpen || !previousMounted) &&
        currentFocusItemOnOpen &&
        (key != null || currentFocusItemOnOpen === true)
      ) {
        let runs = 0;
        const waitForListPopulated = (): void => {
          if (props.items()[0] == null) {
            // Avoid letting the browser paint if possible on the first try,
            // otherwise use rAF. Don't try more than twice, since something
            // is wrong otherwise.
            if (runs < 2) {
              const scheduler = runs ? requestAnimationFrame : queueMicrotask;
              scheduler(waitForListPopulated);
            }
            runs++;
          } else {
            index =
              key == null || isMainOrientationToEndKey(key, orientation(), rtl()) || nested()
                ? getMinListIndex(props.items, props.disabledIndices)
                : getMaxListIndex(props.items, props.disabledIndices);
            key = null;
            onNavigate();
          }
        };

        waitForListPopulated();
      }
    } else if (!isIndexOutOfListBounds(props.items, activeIndex)) {
      index = activeIndex;
      focusItem();
      forceScrollIntoView = false;
    }
  });

  // Ensure the parent floating element has focus when a nested child closes
  // to allow arrow key navigation to work after the pointer leaves the child.
  createTrackingEffect(() => {
    if (!enabled() || context.elements.floating || !tree || virtual() || !previousMounted) {
      return;
    }

    const nodes = tree.nodes();
    const parent = nodes.find((node) => node.id === parentId)?.context?.elements.floating;
    const activeEl = activeElement(getDocument(context.elements.floating));
    const treeContainsActiveEl = nodes.some(
      (node) => node.context && contains(node.context.elements.floating, activeEl),
    );

    if (parent && !treeContainsActiveEl && isPointerModality) {
      parent.focus({ preventScroll: true });
    }
  });

  createCleanupEffect(() => {
    if (!enabled()) {
      return undefined;
    }
    if (!tree) {
      return undefined;
    }
    if (!virtual()) {
      return undefined;
    }
    if (parentId) {
      return undefined;
    }

    function handleVirtualFocus(item: HTMLElement): void {
      setVirtualId(item.id);

      props.onVirtualItemChange?.(item);
    }

    tree.events.on('virtualfocus', handleVirtualFocus);
    return () => {
      tree.events.off('virtualfocus', handleVirtualFocus);
    };
  });

  // Declared last so the effects above still see the values from the previous
  // run before this one overwrites them.
  createTrackingEffect(() => {
    previousOnNavigate = onNavigate;
    previousOpen = context.open;
    previousMounted = !!context.elements.floating;
  });

  createTrackingEffect(() => {
    if (!context.open) {
      key = null;
      currentFocusItemOnOpen = focusItemOnOpen();
    }
  });

  function syncCurrentTarget(currentTarget: HTMLElement | null): void {
    if (!context.open) {
      return;
    }
    const nextIndex = props.items().indexOf(currentTarget);
    if (nextIndex !== -1 && index !== nextIndex) {
      index = nextIndex;
      onNavigate();
    }
  }

  const item: AnyElementProps = {
    onFocusIn(event: FocusEvent) {
      forceSyncFocus = true;
      syncCurrentTarget(currentTargetElement(event));
    },
    // Safari does not focus a clicked item on its own.
    onClick(event: MouseEvent) {
      currentTargetElement(event)?.focus({ preventScroll: true });
    },
    onMouseMove(event: MouseEvent) {
      forceSyncFocus = true;
      forceScrollIntoView = false;
      if (focusItemOnHover()) {
        syncCurrentTarget(currentTargetElement(event));
      }
    },
    onPointerLeave(event: PointerEvent) {
      if (!isPointerModality || event.pointerType === 'touch') {
        return;
      }

      forceSyncFocus = true;

      if (!focusItemOnHover()) {
        return;
      }

      index = -1;
      onNavigate();

      if (!virtual()) {
        floatingFocusElement()?.focus({ preventScroll: true });
      }
    },
  };

  function getParentOrientation(): Orientation | undefined {
    return (
      props.parentOrientation ??
      tree?.nodes().find((node) => node.id === parentId)?.context?.data.orientation
    );
  }

  function commonOnKeyDown(event: KeyboardEvent): void {
    isPointerModality = false;
    forceSyncFocus = true;

    // When composing a character, Chrome fires ArrowDown twice.
    if (event.isComposing) {
      return;
    }

    // If the floating element is animating out, ignore navigation. Otherwise
    // the `activeIndex` gets set to 0 despite not being open, so the next time
    // the user presses ArrowDown the first item won't be focused.
    if (!context.open && event.currentTarget === floatingFocusElement()) {
      return;
    }

    const items = props.items;
    const disabledIndices = props.disabledIndices;
    const currentOrientation = orientation();
    const currentRtl = rtl();
    const currentCols = cols();

    if (
      nested() &&
      isCrossOrientationCloseKey(event.key, currentOrientation, currentRtl, currentCols)
    ) {
      // If the nested list's close key is also the parent navigation key, let
      // the parent navigate. Otherwise, stop propagating the event.
      if (!isMainOrientationKey(event.key, getParentOrientation())) {
        stopEvent(event);
      }

      context.onOpenChange(false, event, 'list-navigation');

      if (isHTMLElement(context.elements.domReference)) {
        if (virtual()) {
          tree?.events.emit('virtualfocus', context.elements.domReference);
        } else {
          context.elements.domReference.focus();
        }
      }

      return;
    }

    const currentIndex = index;
    const minIndex = getMinListIndex(items, disabledIndices);
    const maxIndex = getMaxListIndex(items, disabledIndices);

    if (!typeableComboboxReference()) {
      if (event.key === 'Home') {
        stopEvent(event);
        index = minIndex;
        onNavigate();
      }

      if (event.key === 'End') {
        stopEvent(event);
        index = maxIndex;
        onNavigate();
      }
    }

    // Grid navigation.
    if (currentCols > 1) {
      const sizes =
        props.itemSizes ??
        Array.from({ length: items().length }, () => ({
          width: 1,
          height: 1,
        }));
      // To calculate movements on the grid, we use hypothetical cell indices
      // as if every item was 1x1, then convert back to real indices.
      const cellMap = createGridCellMap(sizes, currentCols, dense());
      const explicitDisabledIndices =
        typeof disabledIndices === 'function' ? undefined : disabledIndices;
      const minGridIndex = cellMap.findIndex(
        (cellIndex) => cellIndex != null && !isListIndexDisabled(items, cellIndex, disabledIndices),
      );
      // Last enabled index.
      const maxGridIndex = cellMap.reduce(
        (foundIndex: number, cellItemIndex, cellIndex) =>
          cellItemIndex != null && !isListIndexDisabled(items, cellItemIndex, disabledIndices)
            ? cellIndex
            : foundIndex,
        -1,
      );

      const nextIndex =
        cellMap[
          getGridNavigatedIndex(
            () => cellMap.map((itemIndex) => (itemIndex == null ? null : items()[itemIndex]!)),
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
                    items().map((_, itemIndex) =>
                      isListIndexDisabled(items, itemIndex, disabledIndices)
                        ? itemIndex
                        : undefined,
                    )),
                  undefined,
                ],
                cellMap,
              ),
              minIndex: minGridIndex,
              maxIndex: maxGridIndex,
              prevIndex: getGridCellIndexOfCorner(
                index > maxIndex ? minIndex : index,
                sizes,
                cellMap,
                currentCols,
                // Use a corner matching the edge closest to the direction we
                // are moving in so we don't end up in the same item. Prefer
                // top/left over bottom/right.
                cornerForKey(event.key, currentRtl ? ARROW_LEFT : ARROW_RIGHT),
              ),
              stopEvent: true,
            },
          )
        ];

      if (nextIndex != null) {
        index = nextIndex;
        onNavigate();
      }

      if (currentOrientation === 'both') {
        return;
      }
    }

    if (isMainOrientationKey(event.key, currentOrientation)) {
      stopEvent(event);

      // Reset the index if no item is focused.
      const currentTarget = currentTargetElement(event);
      if (
        context.open &&
        !virtual() &&
        currentTarget !== null &&
        activeElement(currentTarget.ownerDocument) === currentTarget
      ) {
        index = isMainOrientationToEndKey(event.key, currentOrientation, currentRtl)
          ? minIndex
          : maxIndex;
        onNavigate();
        return;
      }

      if (isMainOrientationToEndKey(event.key, currentOrientation, currentRtl)) {
        if (loop()) {
          if (currentIndex < maxIndex) {
            index = findNonDisabledListIndex(items, {
              startingIndex: currentIndex,
              disabledIndices,
            });
          } else if (allowEscape() && currentIndex !== items().length) {
            // Escaping the list leaves nothing selected.
            index = -1;
          } else {
            index = minIndex;
          }
        } else {
          index = Math.min(
            maxIndex,
            findNonDisabledListIndex(items, {
              startingIndex: currentIndex,
              disabledIndices,
            }),
          );
        }
      } else if (loop()) {
        if (currentIndex > minIndex) {
          index = findNonDisabledListIndex(items, {
            startingIndex: currentIndex,
            decrement: true,
            disabledIndices,
          });
        } else if (allowEscape() && currentIndex !== -1) {
          // Escaping past the start parks the index beyond the last item.
          index = items().length;
        } else {
          index = maxIndex;
        }
      } else {
        index = Math.max(
          minIndex,
          findNonDisabledListIndex(items, {
            startingIndex: currentIndex,
            decrement: true,
            disabledIndices,
          }),
        );
      }

      if (isIndexOutOfListBounds(items, index)) {
        index = -1;
      }

      onNavigate();
    }
  }

  function ariaActiveDescendantProp(): AnyElementProps {
    return virtual() && context.open && props.activeIndex != null
      ? { 'aria-activedescendant': virtualId() ?? activeId() }
      : {};
  }

  function floatingProps(): AnyElementProps {
    const currentOrientation = orientation();
    return {
      'aria-orientation': currentOrientation === 'both' ? undefined : currentOrientation,
      ...(typeableComboboxReference() ? {} : ariaActiveDescendantProp()),
      onKeyDown: commonOnKeyDown,
      onPointerMove() {
        isPointerModality = true;
      },
    };
  }

  function checkVirtualMouse(event: MouseEvent): void {
    if (focusItemOnOpen() === 'auto' && isVirtualClick(event)) {
      currentFocusItemOnOpen = true;
    }
  }

  function checkVirtualPointer(event: PointerEvent): void {
    // `pointerdown` fires first, reset the state then perform the checks.
    currentFocusItemOnOpen = focusItemOnOpen();
    if (focusItemOnOpen() === 'auto' && isVirtualPointerEvent(event)) {
      currentFocusItemOnOpen = true;
    }
  }

  function referenceProps(): AnyElementProps {
    return {
      ...ariaActiveDescendantProp(),
      onKeyDown(event: KeyboardEvent) {
        isPointerModality = false;

        const items = props.items;
        const currentOrientation = orientation();
        const currentRtl = rtl();
        const isArrowKey = event.key.startsWith('Arrow');
        const isHomeOrEndKey = ['Home', 'End'].includes(event.key);
        const isMoveKey = isArrowKey || isHomeOrEndKey;
        const isCrossOpenKey = isCrossOrientationOpenKey(event.key, currentOrientation, currentRtl);
        const isCrossCloseKey = isCrossOrientationCloseKey(
          event.key,
          currentOrientation,
          currentRtl,
          cols(),
        );
        const isParentCrossOpenKey = isCrossOrientationOpenKey(
          event.key,
          getParentOrientation(),
          currentRtl,
        );
        const isMainKey = isMainOrientationKey(event.key, currentOrientation);
        const isSelectionKey = event.key === 'Enter' || event.key.trim() === '';
        const isNavigationKey = (nested() ? isParentCrossOpenKey : isMainKey) || isSelectionKey;

        if (virtual() && context.open) {
          const rootNode = tree?.nodes().find((node) => node.parentId == null);
          const deepestNode = tree && rootNode ? getDeepestNode(tree.nodes(), rootNode.id) : null;

          if (isMoveKey && deepestNode && props.onVirtualItemChange) {
            const eventObject = new KeyboardEvent('keydown', {
              key: event.key,
              bubbles: true,
            });

            if (isCrossOpenKey || isCrossCloseKey) {
              const isCurrentTarget =
                deepestNode.context?.elements.domReference === event.currentTarget;
              let dispatchItem: Element | null | undefined = null;
              if (isCrossCloseKey && !isCurrentTarget) {
                dispatchItem = deepestNode.context?.elements.domReference;
              } else if (isCrossOpenKey) {
                dispatchItem = items().find((listItem) => listItem?.id === activeId());
              }

              if (dispatchItem) {
                stopEvent(event);
                dispatchItem.dispatchEvent(eventObject);
                setVirtualId(undefined);
              }
            }

            if ((isMainKey || isHomeOrEndKey) && deepestNode.context) {
              if (
                deepestNode.context.open &&
                deepestNode.parentId &&
                event.currentTarget !== deepestNode.context.elements.domReference
              ) {
                stopEvent(event);
                deepestNode.context.elements.domReference?.dispatchEvent(eventObject);
                return;
              }
            }
          }

          commonOnKeyDown(event);
          return;
        }

        // If a floating element should not open on arrow key down, avoid
        // setting `activeIndex` while it's closed.
        if (!context.open && !openOnArrowKeyDown() && isArrowKey) {
          return;
        }

        if (isNavigationKey) {
          const isParentMainKey = isMainOrientationKey(event.key, getParentOrientation());
          key = nested() && isParentMainKey ? null : event.key;
        }

        if (nested()) {
          if (isParentCrossOpenKey) {
            stopEvent(event);

            if (context.open) {
              index = getMinListIndex(items, props.disabledIndices);
              onNavigate();
            } else {
              context.onOpenChange(true, event, 'list-navigation');
            }
          }

          return;
        }

        if (isMainKey) {
          const currentSelectedIndex = selectedIndex();
          if (currentSelectedIndex != null) {
            index = currentSelectedIndex;
          }

          stopEvent(event);

          if (!context.open && openOnArrowKeyDown()) {
            context.onOpenChange(true, event, 'list-navigation');
          } else {
            commonOnKeyDown(event);
          }

          if (context.open) {
            onNavigate();
          }
        }
      },
      onFocusIn() {
        if (context.open && !virtual()) {
          index = -1;
          onNavigate();
        }
      },
      onPointerDown: checkVirtualPointer,
      onPointerEnter: checkVirtualPointer,
      onMouseDown: checkVirtualMouse,
      onClick: checkVirtualMouse,
    };
  }

  const reference = lazyProps(referenceProps);
  const floating = lazyProps(floatingProps);

  return {
    get reference() {
      return enabled() ? reference : undefined;
    },
    get floating() {
      return enabled() ? floating : undefined;
    },
    get item() {
      return enabled() ? item : undefined;
    },
  };
}
