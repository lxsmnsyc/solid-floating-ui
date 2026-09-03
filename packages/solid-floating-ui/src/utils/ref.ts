/**
 * A mutable box shared across hooks and components. Solid closures capture
 * `let` bindings directly, so this is reserved for state the library writes to
 * across a boundary: containers it fills in for the caller, such as
 * `elementsRef`, or state several hooks mutate and observe by identity, such as
 * `dataRef`. Anything the library only reads takes an accessor instead.
 */
export interface Ref<T> {
  current: T;
}

export function createRef<T>(initial: T): Ref<T> {
  return { current: initial };
}
