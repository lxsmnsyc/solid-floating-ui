import type { Derivable, Middleware, Padding } from '@floating-ui/dom';
import { arrow as arrowCore } from '@floating-ui/dom';
import type { Ref } from './utils/ref';

export interface ArrowOptions {
  /**
   * The arrow element to be positioned, or a ref holding it.
   * @default undefined
   */
  element: Ref<Element | null> | Element | null;
  /**
   * The padding between the arrow element and the floating element edges.
   * Useful when the floating element has rounded corners.
   * @default 0
   */
  padding?: Padding | undefined;
}

function isRef(value: unknown): value is Ref<Element | null> {
  return value != null && Object.hasOwn(value, 'current');
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

      if (element && isRef(element)) {
        if (element.current != null) {
          return arrowCore({ element: element.current, padding }).fn(state);
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
