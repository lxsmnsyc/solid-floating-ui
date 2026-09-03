import { createUniqueId } from 'solid-js';

/**
 * Returns a stable, SSR-safe id.
 */
export default function useId(): string {
  return createUniqueId();
}
