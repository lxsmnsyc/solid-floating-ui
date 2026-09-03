import { createUniqueId } from 'solid-js';

/**
 * Returns a stable, SSR-safe id.
 * @see https://floating-ui.com/docs/react-utils#useid
 */
export default function useId(): string {
  return createUniqueId();
}
