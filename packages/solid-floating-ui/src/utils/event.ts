import { isAndroid, isJSDOM } from './platform';

/**
 * A mouse event that may carry the pointer fields only some browsers set.
 */
interface PointerLikeMouseEvent extends MouseEvent {
  readonly mozInputSource?: number | undefined;
  readonly pointerType?: string | undefined;
}

export function stopEvent(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
}

// License: https://github.com/adobe/react-spectrum/blob/b35d5c02fe900badccd0cf1a8f23bb593419f238/packages/@react-aria/utils/src/isVirtualEvent.ts
export function isVirtualClick(event: PointerLikeMouseEvent): boolean {
  // Firefox reports `mozInputSource` of 0 for a synthesised click. The property
  // is deprecated but `react-aria` still relies on it for the same reason.
  if (event.mozInputSource === 0 && event.isTrusted) {
    return true;
  }

  if (isAndroid() && event.pointerType) {
    return event.type === 'click' && event.buttons === 1;
  }

  return event.detail === 0 && !event.pointerType;
}

export function isVirtualPointerEvent(event: PointerEvent): boolean {
  if (isJSDOM()) {
    return false;
  }
  return (
    (!isAndroid() && event.width === 0 && event.height === 0) ||
    (isAndroid() &&
      event.width === 1 &&
      event.height === 1 &&
      event.pressure === 0 &&
      event.detail === 0 &&
      event.pointerType === 'mouse') ||
    // iOS VoiceOver reports a fractional width and height.
    (event.width < 1 &&
      event.height < 1 &&
      event.pressure === 0 &&
      event.detail === 0 &&
      event.pointerType === 'touch')
  );
}

export function isMouseLikePointerType(pointerType: string | undefined, strict?: boolean): boolean {
  // On some Linux machines with Chromium, mouse inputs report a `pointerType`
  // of "pen": https://github.com/floating-ui/floating-ui/issues/2015
  const values: (string | undefined)[] = ['mouse', 'pen'];
  if (!strict) {
    values.push('', undefined);
  }
  return values.includes(pointerType);
}
