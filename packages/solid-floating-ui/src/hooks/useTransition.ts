import type { Placement, Side } from '@floating-ui/dom';
import { type Accessor, type JSX, createEffect, createSignal, onCleanup, untrack } from 'solid-js';
import type { FloatingContext, ReferenceType } from '../types';

type Duration = number | { open?: number | undefined; close?: number | undefined };

// Converts a JS style key like `backgroundColor` to a CSS transition-property
// like `background-color`.
function camelCaseToKebabCase(str: string): string {
  return str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $.toLowerCase());
}

/**
 * The side half of a placement such as `bottom-end`.
 */
function toSide(placement: Placement): Side {
  const [side] = placement.split('-');
  return side === 'top' || side === 'right' || side === 'bottom' ? side : 'left';
}

interface TransitionArgs {
  side: Side;
  placement: Placement;
}

function resolveStyles(
  value: CSSStylesProperty | undefined,
  args: TransitionArgs,
): JSX.CSSProperties | undefined {
  return typeof value === 'function' ? value(args) : value;
}

function createDelayUnmount(
  open: Accessor<boolean>,
  durationMs: Accessor<number>,
): Accessor<boolean> {
  const [isMounted, setIsMounted] = createSignal(untrack(open));

  createEffect(() => {
    if (open()) {
      setIsMounted(true);
      return;
    }

    if (untrack(isMounted)) {
      const timeout = setTimeout(() => {
        setIsMounted(false);
      }, durationMs());
      onCleanup(() => {
        clearTimeout(timeout);
      });
    }
  });

  return isMounted;
}

export interface UseTransitionStatusProps {
  /**
   * The duration of the transition in milliseconds, or an object containing
   * `open` and `close` keys for different durations.
   */
  duration?: Duration | undefined;
}

export type TransitionStatus = 'unmounted' | 'initial' | 'open' | 'close';

export interface UseTransitionStatusReturn {
  readonly isMounted: boolean;
  readonly status: TransitionStatus;
}

/**
 * Provides a status string to apply CSS transitions to a floating element,
 * correctly handling placement-aware transitions.
 * @see https://floating-ui.com/docs/useTransition#usetransitionstatus
 */
export function useTransitionStatus(
  context: FloatingContext,
  props: UseTransitionStatusProps = {},
): UseTransitionStatusReturn {
  const duration = (): Duration => props.duration ?? 250;
  const closeDuration = (): number => {
    const value = duration();
    const close = typeof value === 'number' ? value : value.close;
    return close ?? 0;
  };

  const [status, setStatus] = createSignal<TransitionStatus>('unmounted');
  const isMounted = createDelayUnmount(() => context.open, closeDuration);

  createEffect(() => {
    if (!isMounted() && untrack(status) === 'close') {
      setStatus('unmounted');
    }
  });

  createEffect(() => {
    if (!context.elements.floating) {
      return;
    }

    if (context.open) {
      setStatus('initial');

      // Ensure it opens before paint. With `FloatingDelayGroup` this avoids a
      // flicker when moving between floating elements, so one is always open
      // with no missing frames.
      const frame = requestAnimationFrame(() => {
        setStatus('open');
      });

      onCleanup(() => {
        cancelAnimationFrame(frame);
      });
      return;
    }

    setStatus('close');
  });

  return {
    get isMounted() {
      return isMounted();
    },
    get status() {
      return status();
    },
  };
}

type CSSStylesProperty =
  | JSX.CSSProperties
  | ((params: { side: Side; placement: Placement }) => JSX.CSSProperties);

export interface UseTransitionStylesProps extends UseTransitionStatusProps {
  /**
   * The styles to apply when the floating element is initially mounted.
   */
  initial?: CSSStylesProperty | undefined;
  /**
   * The styles to apply when the floating element is transitioning to the
   * `open` state.
   */
  open?: CSSStylesProperty | undefined;
  /**
   * The styles to apply when the floating element is transitioning to the
   * `close` state.
   */
  close?: CSSStylesProperty | undefined;
  /**
   * The styles to apply to all states.
   */
  common?: CSSStylesProperty | undefined;
}

export interface UseTransitionStylesReturn {
  readonly isMounted: boolean;
  readonly styles: JSX.CSSProperties;
}

/**
 * Provides styles to apply CSS transitions to a floating element, correctly
 * handling placement-aware transitions. Wrapper around `useTransitionStatus`.
 * @see https://floating-ui.com/docs/useTransition#usetransitionstyles
 */
export function useTransitionStyles<RT extends ReferenceType = ReferenceType>(
  context: FloatingContext<RT>,
  props: UseTransitionStylesProps = {},
): UseTransitionStylesReturn {
  const initialOption = (): CSSStylesProperty => props.initial ?? { opacity: 0 };
  const duration = (): Duration => props.duration ?? 250;
  const openDuration = (): number => {
    const value = duration();
    const open = typeof value === 'number' ? value : value.open;
    return open ?? 0;
  };
  const closeDuration = (): number => {
    const value = duration();
    const close = typeof value === 'number' ? value : value.close;
    return close ?? 0;
  };

  const fnArgs = (): TransitionArgs => {
    const placement = context.placement;
    return { side: toSide(placement), placement };
  };

  const [styles, setStyles] = createSignal<JSX.CSSProperties>({
    ...resolveStyles(props.common, untrack(fnArgs)),
    ...resolveStyles(untrack(initialOption), untrack(fnArgs)),
  });

  const transition = useTransitionStatus(context, {
    get duration() {
      return props.duration;
    },
  });

  createEffect(() => {
    const args = fnArgs();
    const status = transition.status;

    const initialStyles = resolveStyles(initialOption(), args) ?? {};
    const closeStyles = resolveStyles(props.close, args);
    const commonStyles = resolveStyles(props.common, args);
    const openStyles =
      resolveStyles(props.open, args) ??
      Object.keys(initialStyles).reduce((acc: Record<string, ''>, key) => {
        acc[key] = '';
        return acc;
      }, {});

    if (status === 'initial') {
      setStyles((current) => ({
        'transition-property': current['transition-property'],
        ...commonStyles,
        ...initialStyles,
      }));
    }

    if (status === 'open') {
      setStyles({
        'transition-property': Object.keys(openStyles).map(camelCaseToKebabCase).join(','),
        'transition-duration': `${openDuration()}ms`,
        ...commonStyles,
        ...openStyles,
      });
    }

    if (status === 'close') {
      const nextStyles = closeStyles ?? initialStyles;
      setStyles({
        'transition-property': Object.keys(nextStyles).map(camelCaseToKebabCase).join(','),
        'transition-duration': `${closeDuration()}ms`,
        ...commonStyles,
        ...nextStyles,
      });
    }
  });

  return {
    get isMounted() {
      return transition.isMounted;
    },
    get styles() {
      return styles();
    },
  };
}
