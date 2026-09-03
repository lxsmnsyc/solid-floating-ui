import type { Placement, Rect, Side } from '@floating-ui/dom';
import { isElement } from '@floating-ui/utils/dom';
import type { HandleClose } from './hooks/useHover';
import { contains, getTarget } from './utils/element';
import { getNodeChildren } from './utils/nodes';
import { clearTimeoutIfSet } from './utils/schedule';

type Point = [number, number];
type Polygon = Point[];

function isPointInPolygon(point: Point, polygon: Polygon): boolean {
  const [x, y] = point;
  let isInside = false;
  const length = polygon.length;
  for (let i = 0, j = length - 1; i < length; j = i++) {
    const [xi, yi] = polygon[i] ?? [0, 0];
    const [xj, yj] = polygon[j] ?? [0, 0];
    const intersect = yi >= y !== yj >= y && x <= ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) {
      isInside = !isInside;
    }
  }
  return isInside;
}

function isPointInsideRect(point: Point, rect: Rect): boolean {
  return (
    point[0] >= rect.x &&
    point[0] <= rect.x + rect.width &&
    point[1] >= rect.y &&
    point[1] <= rect.y + rect.height
  );
}

/**
 * The side half of a placement such as `bottom-end`.
 */
function toSide(placement: Placement): Side {
  const [side] = placement.split('-');
  return side === 'top' || side === 'right' || side === 'bottom' ? side : 'left';
}

/**
 * The two cursor points the triangle starts from. When the floating element is
 * larger than the reference they straddle the cursor; otherwise both sit to
 * the side the cursor left from, so the triangle points that way.
 */
function cursorSpread(
  isFloatingLarger: boolean,
  leaveFromEnd: boolean,
  origin: number,
  buffer: number,
): [number, number] {
  if (isFloatingLarger) {
    return [origin + buffer / 2, origin - buffer / 2];
  }
  const shifted = leaveFromEnd ? origin + buffer * 4 : origin - buffer * 4;
  return [shifted, shifted];
}

/**
 * The floating element's own two corners on the side facing the reference.
 * The corner the cursor left from is pulled in by the buffer, and so is the
 * opposite one when the floating element is the larger of the two.
 */
function nearEdges(
  leaveFromEnd: boolean,
  isFloatingLarger: boolean,
  bufferedEdge: number,
  plainEdge: number,
): [number, number] {
  const fallback = isFloatingLarger ? bufferedEdge : plainEdge;
  return leaveFromEnd ? [bufferedEdge, fallback] : [fallback, bufferedEdge];
}

export interface SafePolygonOptions {
  buffer?: number | undefined;
  blockPointerEvents?: boolean | undefined;
  requireIntent?: boolean | undefined;
}

/**
 * Generates a safe polygon area that the user can traverse without closing the
 * floating element once leaving the reference element.
 * @see https://floating-ui.com/docs/useHover#safepolygon
 */
export function safePolygon(options: SafePolygonOptions = {}): HandleClose {
  const { buffer = 0.5, blockPointerEvents = false, requireIntent = true } = options;

  let timeoutId = -1;

  let hasLanded = false;
  let lastX: number | null = null;
  let lastY: number | null = null;
  let lastCursorTime = typeof performance === 'undefined' ? 0 : performance.now();

  function getCursorSpeed(x: number, y: number): number | null {
    const currentTime = performance.now();
    const elapsedTime = currentTime - lastCursorTime;

    if (lastX === null || lastY === null || elapsedTime === 0) {
      lastX = x;
      lastY = y;
      lastCursorTime = currentTime;
      return null;
    }

    const deltaX = x - lastX;
    const deltaY = y - lastY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const speed = distance / elapsedTime; // px / ms

    lastX = x;
    lastY = y;
    lastCursorTime = currentTime;

    return speed;
  }

  const fn: HandleClose = ({ x, y, placement, elements, onClose, nodeId, tree }) =>
    function onMouseMove(event: MouseEvent): void {
      function close(): void {
        timeoutId = clearTimeoutIfSet(timeoutId);
        onClose();
      }

      timeoutId = clearTimeoutIfSet(timeoutId);

      if (!elements.domReference || !elements.floating) {
        return;
      }

      const { clientX, clientY } = event;
      const clientPoint: Point = [clientX, clientY];
      const eventTarget = getTarget(event);
      const target = eventTarget instanceof Element ? eventTarget : null;
      const isLeave = event.type === 'mouseleave';
      const isOverFloatingEl = contains(elements.floating, target);
      const isOverReferenceEl = contains(elements.domReference, target);
      const refRect = elements.domReference.getBoundingClientRect();
      const rect = elements.floating.getBoundingClientRect();
      const side = toSide(placement);
      const cursorLeaveFromRight = x > rect.right - rect.width / 2;
      const cursorLeaveFromBottom = y > rect.bottom - rect.height / 2;
      const isOverReferenceRect = isPointInsideRect(clientPoint, refRect);
      const isFloatingWider = rect.width > refRect.width;
      const isFloatingTaller = rect.height > refRect.height;
      const left = (isFloatingWider ? refRect : rect).left;
      const right = (isFloatingWider ? refRect : rect).right;
      const top = (isFloatingTaller ? refRect : rect).top;
      const bottom = (isFloatingTaller ? refRect : rect).bottom;

      if (isOverFloatingEl) {
        hasLanded = true;

        if (!isLeave) {
          return;
        }
      }

      if (isOverReferenceEl) {
        hasLanded = false;
      }

      if (isOverReferenceEl && !isLeave) {
        hasLanded = true;
        return;
      }

      // Prevent overlapping floating element from being stuck in an open-close
      // loop: https://github.com/floating-ui/floating-ui/issues/1910
      if (
        isLeave &&
        isElement(event.relatedTarget) &&
        contains(elements.floating, event.relatedTarget)
      ) {
        return;
      }

      // If any nested child is open, abort.
      if (tree && getNodeChildren(tree.nodesRef.current, nodeId).length) {
        return;
      }

      // If the pointer is leaving from the opposite side, the "buffer" logic
      // creates a point where the floating element remains open, but should be
      // ignored.
      // A constant of 1 handles floating point rounding errors.
      if (
        (side === 'top' && y >= refRect.bottom - 1) ||
        (side === 'bottom' && y <= refRect.top + 1) ||
        (side === 'left' && x >= refRect.right - 1) ||
        (side === 'right' && x <= refRect.left + 1)
      ) {
        close();
        return;
      }

      // Ignore when the cursor is within the rectangular trough between the
      // two elements. Since the triangle is created from the cursor point,
      // which can start beyond the ref element's edge, traversing back and
      // forth from the ref to the floating element can cause it to close. This
      // ensures it always remains open in that case.
      let rectPoly: Point[] = [];

      switch (side) {
        case 'top':
          rectPoly = [
            [left, refRect.top + 1],
            [left, rect.bottom - 1],
            [right, rect.bottom - 1],
            [right, refRect.top + 1],
          ];
          break;
        case 'bottom':
          rectPoly = [
            [left, rect.top + 1],
            [left, refRect.bottom - 1],
            [right, refRect.bottom - 1],
            [right, rect.top + 1],
          ];
          break;
        case 'left':
          rectPoly = [
            [rect.right - 1, bottom],
            [rect.right - 1, top],
            [refRect.left + 1, top],
            [refRect.left + 1, bottom],
          ];
          break;
        case 'right':
          rectPoly = [
            [refRect.right - 1, bottom],
            [refRect.right - 1, top],
            [rect.left + 1, top],
            [rect.left + 1, bottom],
          ];
          break;
      }

      // Builds the triangle from the cursor origin `x`/`y` captured when the
      // pointer left, out to the near edge of the floating element.
      function getPolygon(): Point[] {
        switch (side) {
          case 'top': {
            const [oneX, twoX] = cursorSpread(isFloatingWider, cursorLeaveFromRight, x, buffer);
            const cursorY = y + buffer + 1;
            const [leftY, rightY] = nearEdges(
              cursorLeaveFromRight,
              isFloatingWider,
              rect.bottom - buffer,
              rect.top,
            );
            return [
              [oneX, cursorY],
              [twoX, cursorY],
              [rect.left, leftY],
              [rect.right, rightY],
            ];
          }
          case 'bottom': {
            const [oneX, twoX] = cursorSpread(isFloatingWider, cursorLeaveFromRight, x, buffer);
            const cursorY = y - buffer;
            const [leftY, rightY] = nearEdges(
              cursorLeaveFromRight,
              isFloatingWider,
              rect.top + buffer,
              rect.bottom,
            );
            return [
              [oneX, cursorY],
              [twoX, cursorY],
              [rect.left, leftY],
              [rect.right, rightY],
            ];
          }
          case 'left': {
            const [oneY, twoY] = cursorSpread(isFloatingTaller, cursorLeaveFromBottom, y, buffer);
            const cursorX = x + buffer + 1;
            const [topX, bottomX] = nearEdges(
              cursorLeaveFromBottom,
              isFloatingTaller,
              rect.right - buffer,
              rect.left,
            );
            return [
              [topX, rect.top],
              [bottomX, rect.bottom],
              [cursorX, oneY],
              [cursorX, twoY],
            ];
          }
          case 'right':
          default: {
            const [oneY, twoY] = cursorSpread(isFloatingTaller, cursorLeaveFromBottom, y, buffer);
            const cursorX = x - buffer;
            const [topX, bottomX] = nearEdges(
              cursorLeaveFromBottom,
              isFloatingTaller,
              rect.left + buffer,
              rect.right,
            );
            return [
              [cursorX, oneY],
              [cursorX, twoY],
              [topX, rect.top],
              [bottomX, rect.bottom],
            ];
          }
        }
      }

      if (isPointInPolygon([clientX, clientY], rectPoly)) {
        return;
      }

      if (hasLanded && !isOverReferenceRect) {
        close();
        return;
      }

      if (!isLeave && requireIntent) {
        const cursorSpeed = getCursorSpeed(event.clientX, event.clientY);
        const cursorSpeedThreshold = 0.1;
        if (cursorSpeed !== null && cursorSpeed < cursorSpeedThreshold) {
          close();
          return;
        }
      }

      if (!isPointInPolygon([clientX, clientY], getPolygon())) {
        close();
      } else if (!hasLanded && requireIntent) {
        timeoutId = window.setTimeout(close, 40);
      }
    };

  fn.options = {
    blockPointerEvents,
  };

  return fn;
}
