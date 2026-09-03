/**
 * Merges several callback refs into one, for when a single element has to be
 * handed to more than one consumer.
 */
export default function useMergeRefs<T>(
  refs: (((node: T | null) => void) | undefined)[],
): (node: T | null) => void {
  return (node: T | null) => {
    for (const ref of refs) {
      ref?.(node);
    }
  };
}
