import { createEffect, createTrackedEffect } from 'solid-js';
import type { AnyElementProps } from '../types';

/**
 * The teardown an effect may hand back, or nothing when it has none.
 */
export type EffectCleanup = (() => void) | undefined;

/**
 * Runs `effect` whenever its reactive reads change, and registers whatever
 * teardown it returns against that run.
 *
 * Tracking and the work happen in the same scope, because which values an
 * interaction hook reads depends on the branch it takes.
 */
export function createCleanupEffect(effect: () => EffectCleanup): void {
  createTrackedEffect(effect);
}

/**
 * Runs `effect` whenever its reactive reads change. Same scope tracking, as
 * above, for effects with no teardown.
 */
export function createTrackingEffect(effect: () => void): void {
  createTrackedEffect(effect);
}

const EMPTY = (): void => {};

/**
 * Runs `effect` once, after the element is in the document. The compute reads
 * nothing, so the effect never runs again.
 */
export function onMount(effect: () => void): void {
  createEffect(EMPTY, effect);
}

/**
 * Presents a computed props object as a live one. Every trap recomputes, so a
 * reactive read inside `compute` is tracked by whoever spreads the result onto
 * an element, and props that come and go are picked up as well as props whose
 * value changes.
 */
export function lazyProps(compute: () => AnyElementProps): AnyElementProps {
  return new Proxy<AnyElementProps>(
    {},
    {
      get(_target, key) {
        return typeof key === 'string' ? compute()[key] : undefined;
      },
      has(_target, key) {
        return key in compute();
      },
      ownKeys() {
        return Reflect.ownKeys(compute());
      },
      getOwnPropertyDescriptor(_target, key) {
        const resolved = compute();
        if (typeof key !== 'string' || !(key in resolved)) {
          return undefined;
        }
        return {
          configurable: true,
          enumerable: true,
          value: resolved[key],
          writable: true,
        };
      },
    },
  );
}
