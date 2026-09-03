import type { ComputePositionConfig } from '@floating-ui/dom';
import { computePosition } from '@floating-ui/dom';
import { type JSX, batch, createMemo, createRenderEffect, createSignal } from 'solid-js';
import type { ReferenceType, UsePositionOptions, UsePositionReturn } from '../types';
import { roundByDPR } from '../utils/dpr';
import { error } from '../utils/log';
import { createCleanupEffect } from '../utils/reactivity';
import { createRef } from '../utils/ref';

interface PositionState {
  x: number;
  y: number;
  placement: NonNullable<UsePositionOptions['placement']>;
  strategy: NonNullable<UsePositionOptions['strategy']>;
  middlewareData: NonNullable<UsePositionReturn['middlewareData']>;
  isPositioned: boolean;
}

/**
 * Positions a floating element against a reference element. This is the
 * SolidJS counterpart of `useFloating` from `@floating-ui/react-dom`; the
 * exported `useFloating` builds the interaction context on top of it.
 */
export default function usePosition<RT extends ReferenceType = ReferenceType>(
  options: UsePositionOptions<RT> = {},
): UsePositionReturn<RT> {
  const placement = (): NonNullable<UsePositionOptions['placement']> =>
    options.placement ?? 'bottom';
  const strategy = (): NonNullable<UsePositionOptions['strategy']> =>
    options.strategy ?? 'absolute';
  const transform = (): boolean => options.transform ?? true;

  const [x, setX] = createSignal(0);
  const [y, setY] = createSignal(0);
  const [currentPlacement, setCurrentPlacement] = createSignal(placement());
  const [currentStrategy, setCurrentStrategy] = createSignal(strategy());
  const [middlewareData, setMiddlewareData] = createSignal<PositionState['middlewareData']>(
    {},
    { equals: false },
  );
  const [isPositioned, setIsPositioned] = createSignal(false);

  const [internalReference, setInternalReference] = createSignal<RT | null>(null);
  const [internalFloating, setInternalFloating] = createSignal<HTMLElement | null>(null);

  const referenceRef = createRef<RT | null>(null);
  const floatingRef = createRef<HTMLElement | null>(null);

  const referenceEl = createMemo<RT | null>(
    () => options.elements?.reference ?? internalReference(),
  );
  const floatingEl = createMemo<HTMLElement | null>(
    () => options.elements?.floating ?? internalFloating(),
  );

  function setReference(node: RT | null): void {
    if (node !== referenceRef.current) {
      referenceRef.current = node;
      setInternalReference(() => node);
    }
  }

  function setFloating(node: HTMLElement | null): void {
    if (node !== floatingRef.current) {
      floatingRef.current = node;
      setInternalFloating(node);
    }
  }

  let disposed = false;

  function currentConfig(): ComputePositionConfig {
    const config: ComputePositionConfig = {
      placement: placement(),
      strategy: strategy(),
      middleware: options.middleware,
    };

    if (options.platform) {
      config.platform = options.platform;
    }

    return config;
  }

  function update(config: ComputePositionConfig = currentConfig()): void {
    const reference = referenceRef.current;
    const floating = floatingRef.current;

    if (!reference || !floating) {
      return;
    }

    const positioned = options.open !== false;

    computePosition(reference, floating, config)
      .then((data) => {
        if (disposed) {
          return;
        }
        batch(() => {
          setX(data.x);
          setY(data.y);
          setCurrentPlacement(data.placement);
          setCurrentStrategy(data.strategy);
          setMiddlewareData(data.middlewareData);
          // The floating element's position may be recomputed while it's closed
          // but still mounted (such as when transitioning out). To ensure
          // `isPositioned` will be `false` initially on the next open, avoid
          // setting it to `true` when `open === false`.
          setIsPositioned(positioned);
        });
      })
      .catch((reason: unknown) => {
        error('`computePosition` failed:', String(reason));
      });
  }

  createRenderEffect(() => {
    if (options.open === false && isPositioned()) {
      setIsPositioned(false);
    }
  });

  createCleanupEffect(() => {
    disposed = false;
    return () => {
      disposed = true;
    };
  });

  createCleanupEffect(() => {
    const reference = referenceEl();
    const floating = floatingEl();

    // Read here so the effect re-runs whenever the positioning configuration
    // changes, and not only when the elements themselves do.
    const config = currentConfig();

    if (reference) {
      referenceRef.current = reference;
    }
    if (floating) {
      floatingRef.current = floating;
    }

    if (reference && floating) {
      if (options.whileElementsMounted) {
        return options.whileElementsMounted(reference, floating, () => {
          update();
        });
      }

      update(config);
    }
    return undefined;
  });

  const floatingStyles = createMemo<JSX.CSSProperties>(() => {
    const initialStyles: JSX.CSSProperties = {
      position: strategy(),
      left: '0',
      top: '0',
    };

    const floating = floatingEl();
    if (!floating) {
      return initialStyles;
    }

    const roundedX = roundByDPR(floating, x());
    const roundedY = roundByDPR(floating, y());

    if (transform()) {
      return {
        ...initialStyles,
        transform: `translate(${roundedX}px, ${roundedY}px)`,
      };
    }

    return {
      position: strategy(),
      left: `${roundedX}px`,
      top: `${roundedY}px`,
    };
  });

  const refs = {
    reference: referenceRef,
    floating: floatingRef,
    setReference,
    setFloating,
  };

  const elements = {
    get reference() {
      return referenceEl();
    },
    get floating() {
      return floatingEl();
    },
  };

  return {
    get x() {
      return x();
    },
    get y() {
      return y();
    },
    get placement() {
      return currentPlacement();
    },
    get strategy() {
      return currentStrategy();
    },
    get middlewareData() {
      return middlewareData();
    },
    get isPositioned() {
      return isPositioned();
    },
    get floatingStyles() {
      return floatingStyles();
    },
    update,
    refs,
    elements,
  };
}
