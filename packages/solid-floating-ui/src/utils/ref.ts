/**
 * A mutable box shared across hooks and components. Solid closures capture
 * `let` bindings directly, so this is reserved for state that has to cross a
 * boundary: containers the caller creates and passes in, such as `listRef`,
 * or state several hooks mutate and observe by identity, such as `dataRef`.
 */
export interface Ref<T> {
  current: T;
}

export function createRef<T>(initial: T): Ref<T> {
  return { current: initial };
}
