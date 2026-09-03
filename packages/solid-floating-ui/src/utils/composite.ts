import type { Dimensions } from '@floating-ui/dom';
import { floor } from '@floating-ui/utils';
import { DEV } from 'solid-js';
import { ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT, ARROW_UP } from './constants';
import { stopEvent } from './event';

export type DisabledIndices = number[] | ((index: number) => boolean);

/**
 * Reads the list items in index order.
 */
export type ListItems = () => (HTMLElement | null)[];

export function isDifferentGridRow(index: number, cols: number, prevRow: number): boolean {
  return Math.floor(index / cols) !== prevRow;
}

export function isIndexOutOfListBounds(items: ListItems, index: number): boolean {
  return index < 0 || index >= items().length;
}

export function getMinListIndex(
  items: ListItems,
  disabledIndices: DisabledIndices | undefined,
): number {
  return findNonDisabledListIndex(items, { disabledIndices });
}

export function getMaxListIndex(
  items: ListItems,
  disabledIndices: DisabledIndices | undefined,
): number {
  return findNonDisabledListIndex(items, {
    decrement: true,
    startingIndex: items().length,
    disabledIndices,
  });
}

export function findNonDisabledListIndex(
  items: ListItems,
  {
    startingIndex = -1,
    decrement = false,
    disabledIndices,
    amount = 1,
  }: {
    startingIndex?: number | undefined;
    decrement?: boolean | undefined;
    disabledIndices?: DisabledIndices | undefined;
    amount?: number | undefined;
  } = {},
): number {
  let index = startingIndex;
  do {
    index += decrement ? -amount : amount;
  } while (
    index >= 0 &&
    index <= items().length - 1 &&
    isListIndexDisabled(items, index, disabledIndices)
  );

  return index;
}

export function getGridNavigatedIndex(
  items: ListItems,
  {
    event,
    orientation,
    loop,
    rtl,
    cols,
    disabledIndices,
    minIndex,
    maxIndex,
    prevIndex,
    stopEvent: stop = false,
  }: {
    event: KeyboardEvent;
    orientation: 'horizontal' | 'vertical' | 'both';
    loop: boolean;
    rtl: boolean;
    cols: number;
    disabledIndices: DisabledIndices | undefined;
    minIndex: number;
    maxIndex: number;
    prevIndex: number;
    stopEvent?: boolean | undefined;
  },
): number {
  let nextIndex = prevIndex;

  if (event.key === ARROW_UP) {
    if (stop) {
      stopEvent(event);
    }

    if (prevIndex === -1) {
      nextIndex = maxIndex;
    } else {
      nextIndex = findNonDisabledListIndex(items, {
        startingIndex: nextIndex,
        amount: cols,
        decrement: true,
        disabledIndices,
      });

      if (loop && (prevIndex - cols < minIndex || nextIndex < 0)) {
        const col = prevIndex % cols;
        const maxCol = maxIndex % cols;
        const offset = maxIndex - (maxCol - col);

        if (maxCol === col) {
          nextIndex = maxIndex;
        } else {
          nextIndex = maxCol > col ? offset : offset - cols;
        }
      }
    }

    if (isIndexOutOfListBounds(items, nextIndex)) {
      nextIndex = prevIndex;
    }
  }

  if (event.key === ARROW_DOWN) {
    if (stop) {
      stopEvent(event);
    }

    if (prevIndex === -1) {
      nextIndex = minIndex;
    } else {
      nextIndex = findNonDisabledListIndex(items, {
        startingIndex: prevIndex,
        amount: cols,
        disabledIndices,
      });

      if (loop && prevIndex + cols > maxIndex) {
        nextIndex = findNonDisabledListIndex(items, {
          startingIndex: (prevIndex % cols) - cols,
          amount: cols,
          disabledIndices,
        });
      }
    }

    if (isIndexOutOfListBounds(items, nextIndex)) {
      nextIndex = prevIndex;
    }
  }

  // Remains on the same row/column.
  if (orientation === 'both') {
    const prevRow = floor(prevIndex / cols);

    if (event.key === (rtl ? ARROW_LEFT : ARROW_RIGHT)) {
      if (stop) {
        stopEvent(event);
      }

      if (prevIndex % cols !== cols - 1) {
        nextIndex = findNonDisabledListIndex(items, {
          startingIndex: prevIndex,
          disabledIndices,
        });

        if (loop && isDifferentGridRow(nextIndex, cols, prevRow)) {
          nextIndex = findNonDisabledListIndex(items, {
            startingIndex: prevIndex - (prevIndex % cols) - 1,
            disabledIndices,
          });
        }
      } else if (loop) {
        nextIndex = findNonDisabledListIndex(items, {
          startingIndex: prevIndex - (prevIndex % cols) - 1,
          disabledIndices,
        });
      }

      if (isDifferentGridRow(nextIndex, cols, prevRow)) {
        nextIndex = prevIndex;
      }
    }

    if (event.key === (rtl ? ARROW_RIGHT : ARROW_LEFT)) {
      if (stop) {
        stopEvent(event);
      }

      if (prevIndex % cols !== 0) {
        nextIndex = findNonDisabledListIndex(items, {
          startingIndex: prevIndex,
          decrement: true,
          disabledIndices,
        });

        if (loop && isDifferentGridRow(nextIndex, cols, prevRow)) {
          nextIndex = findNonDisabledListIndex(items, {
            startingIndex: prevIndex + (cols - (prevIndex % cols)),
            decrement: true,
            disabledIndices,
          });
        }
      } else if (loop) {
        nextIndex = findNonDisabledListIndex(items, {
          startingIndex: prevIndex + (cols - (prevIndex % cols)),
          decrement: true,
          disabledIndices,
        });
      }

      if (isDifferentGridRow(nextIndex, cols, prevRow)) {
        nextIndex = prevIndex;
      }
    }

    const lastRow = floor(maxIndex / cols) === prevRow;

    if (isIndexOutOfListBounds(items, nextIndex)) {
      if (loop && lastRow) {
        nextIndex =
          event.key === (rtl ? ARROW_RIGHT : ARROW_LEFT)
            ? maxIndex
            : findNonDisabledListIndex(items, {
                startingIndex: prevIndex - (prevIndex % cols) - 1,
                disabledIndices,
              });
      } else {
        nextIndex = prevIndex;
      }
    }
  }

  return nextIndex;
}

/** For each cell index, gets the item index that occupies that cell */
export function createGridCellMap(
  sizes: Dimensions[],
  cols: number,
  dense: boolean,
): (number | undefined)[] {
  const cellMap: (number | undefined)[] = [];
  let startIndex = 0;
  sizes.forEach(({ width, height }, index) => {
    if (width > cols) {
      if (DEV) {
        throw new Error(
          `[Floating UI]: Invalid grid - item width at index ${index} is greater than grid columns`,
        );
      }
    }
    let itemPlaced = false;
    if (dense) {
      startIndex = 0;
    }
    while (!itemPlaced) {
      const targetCells: number[] = [];
      for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
          targetCells.push(startIndex + i + j * cols);
        }
      }
      if (
        (startIndex % cols) + width <= cols &&
        targetCells.every((cell) => cellMap[cell] == null)
      ) {
        targetCells.forEach((cell) => {
          cellMap[cell] = index;
        });
        itemPlaced = true;
      } else {
        startIndex++;
      }
    }
  });

  // convert into a non-sparse array
  return [...cellMap];
}

/** Gets cell index of an item's corner or -1 when index is -1. */
export function getGridCellIndexOfCorner(
  index: number,
  sizes: Dimensions[],
  cellMap: (number | undefined)[],
  cols: number,
  corner: 'tl' | 'tr' | 'bl' | 'br',
): number {
  if (index === -1) {
    return -1;
  }

  const firstCellIndex = cellMap.indexOf(index);
  const sizeItem = sizes[index];

  switch (corner) {
    case 'tr':
      return firstCellIndex + sizeItem.width - 1;
    case 'bl':
      return firstCellIndex + (sizeItem.height - 1) * cols;
    case 'br':
      return cellMap.lastIndexOf(index);
    case 'tl':
    default:
      return firstCellIndex;
  }
}

/** Gets all cell indices that correspond to the specified indices */
export function getGridCellIndices(
  indices: (number | undefined)[],
  cellMap: (number | undefined)[],
): number[] {
  return cellMap.flatMap((index, cellIndex) => (indices.includes(index) ? [cellIndex] : []));
}

export function isListIndexDisabled(
  items: ListItems,
  index: number,
  disabledIndices?: DisabledIndices,
): boolean {
  if (typeof disabledIndices === 'function') {
    return disabledIndices(index);
  } else if (disabledIndices) {
    return disabledIndices.includes(index);
  }

  const element = items()[index];
  return (
    element == null ||
    element.hasAttribute('disabled') ||
    element.getAttribute('aria-disabled') === 'true'
  );
}
