import type { Ref } from '../utils/ref';

export type RefLike<T> = Ref<T | null> | ((node: T | null) => void) | undefined;

/**
 * Merges an array of refs into a single callback ref.
 * @see https://floating-ui.com/docs/react-utils#usemergerefs
 */
export function useMergeRefs<T>(refs: RefLike<T>[]): (node: T | null) => void {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }
  };
}
