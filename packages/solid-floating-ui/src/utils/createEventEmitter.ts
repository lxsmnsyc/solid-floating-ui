import type { FloatingEventMap, FloatingEvents } from '../types';

/**
 * Method-position parameters stay bivariant, which lets one set hold handlers
 * for events with different payloads.
 */
type AnyListener = {
  bivariance(data: FloatingEventMap[keyof FloatingEventMap]): void;
}['bivariance'];

export default function createEventEmitter(): FloatingEvents {
  const map = new Map<string, Set<AnyListener>>();
  return {
    emit(event, data) {
      for (const listener of map.get(event) ?? []) {
        listener(data);
      }
    },
    on(event, listener) {
      let listeners = map.get(event);
      if (!listeners) {
        listeners = new Set();
        map.set(event, listeners);
      }
      listeners.add(listener);
    },
    off(event, listener) {
      map.get(event)?.delete(listener);
    },
  };
}
