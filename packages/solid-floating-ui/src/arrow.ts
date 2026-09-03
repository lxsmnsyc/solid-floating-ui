import type { Derivable, Middleware, Padding } from '@floating-ui/dom';
import { arrow as arrowCore } from '@floating-ui/dom';

export interface ArrowOptions {
  /**
   * The arrow element to be positioned, or an accessor returning it.
   * @default undefined
   */
  element: (() => Element | null) | Element | null;
  /**
   * The padding between the arrow element and the floating element edges.
   * Useful when the floating element has rounded corners.
   * @default 0
   */
  padding?: Padding | undefined;
}

/**
 * Provides data to position an inner element of the floating element so that it
 * appears centered to the reference element. Wraps the core `arrow` middleware
 * to allow a ref as the element.
 * @see https://floating-ui.com/docs/arrow
 */
export function arrow(options: ArrowOptions | Derivable<ArrowOptions>): Middleware {
  return {
    name: 'arrow',
    options,
    fn(state): ReturnType<Middleware['fn']> {
      const { element, padding } = typeof options === 'function' ? options(state) : options;

      if (typeof element === 'function') {
        const resolved = element();
        if (resolved != null) {
          return arrowCore({ element: resolved, padding }).fn(state);
        }

        return {};
      }

      if (element) {
        return arrowCore({ element, padding }).fn(state);
      }

      return {};
    },
  };
}
