import type { JSX } from '@solidjs/web';
import { createContext, createSignal, onCleanup, useContext } from 'solid-js';
import { getDelay } from '../hooks/useHover';
import type { Delay, FloatingRootContext } from '../types';
import { createCleanupEffect, createTrackingEffect } from '../utils/reactivity';
import { clearTimeoutIfSet } from '../utils/schedule';

interface CurrentContext {
  onOpenChange(open: boolean): void;
  setIsInstantPhase(value: boolean): void;
}

/**
 * Bookkeeping the group members share. Mutated in place, because changing it
 * must not re-run the members that read it.
 */
interface NextGroupState {
  timeoutId: number;
  currentId: string | null;
  current: CurrentContext | null;
}

interface NextGroupContextValue {
  hasProvider: boolean;
  readonly timeoutMs: number;
  readonly initialDelay: Delay;
  delay(): Delay;
  setDelay(delay: Delay): void;
  state: NextGroupState;
}

const NextFloatingDelayGroupContext = createContext<NextGroupContextValue>({
  hasProvider: false,
  timeoutMs: 0,
  initialDelay: 0,
  delay: () => 0,
  setDelay: () => {},
  state: { timeoutId: -1, currentId: null, current: null },
});

export interface NextFloatingDelayGroupProps {
  children?: JSX.Element;
  /**
   * The delay to use for the group when it is not in the instant phase.
   */
  delay: Delay;
  /**
   * An optional explicit timeout to use for the group, which represents when
   * grouping logic will no longer be active after the close delay completes.
   */
  timeoutMs?: number | undefined;
}

/**
 * Experimental next version of `FloatingDelayGroup`, to become the default in
 * the future. Provides context for a group of floating elements that should
 * share a `delay`.
 */
export function NextFloatingDelayGroup(props: NextFloatingDelayGroupProps): JSX.Element {
  const [delay, setDelay] = createSignal<Delay>(props.delay);
  const state: NextGroupState = { timeoutId: -1, currentId: null, current: null };

  const context: NextGroupContextValue = {
    hasProvider: true,
    get timeoutMs() {
      return props.timeoutMs ?? 0;
    },
    get initialDelay() {
      return props.delay;
    },
    delay,
    setDelay(value) {
      setDelay(() => value);
    },
    state,
  };

  return (
    <NextFloatingDelayGroupContext value={context}>{props.children}</NextFloatingDelayGroupContext>
  );
}

export interface UseNextDelayGroupOptions {
  /**
   * Whether delay grouping should be enabled.
   * @default true
   */
  enabled?: boolean | undefined;
}

export interface UseNextDelayGroupReturn {
  /**
   * The delay the group is currently imposing.
   */
  readonly delay: Delay;
  /**
   * Whether animations should be removed.
   */
  readonly isInstantPhase: boolean;
  /**
   * Whether a `<NextFloatingDelayGroup>` provider is present.
   */
  hasProvider: boolean;
}

/**
 * Enables grouping when called inside a component that is a child of a
 * `NextFloatingDelayGroup`.
 */
export function useNextDelayGroup(
  context: FloatingRootContext,
  options: UseNextDelayGroupOptions = {},
): UseNextDelayGroupReturn {
  const enabled = (): boolean => options.enabled !== false;

  const groupContext = useContext(NextFloatingDelayGroupContext);
  const state = groupContext.state;

  const [isInstantPhase, setIsInstantPhase] = createSignal(false);

  createCleanupEffect(() => {
    function unset(): void {
      setIsInstantPhase(false);
      state.current?.setIsInstantPhase(false);
      state.currentId = null;
      state.current = null;
      groupContext.setDelay(groupContext.initialDelay);
    }

    if (!enabled()) {
      return undefined;
    }
    if (!state.currentId) {
      return undefined;
    }

    if (!context.open && state.currentId === context.floatingId) {
      setIsInstantPhase(false);

      if (groupContext.timeoutMs) {
        state.timeoutId = window.setTimeout(unset, groupContext.timeoutMs);
        return () => {
          state.timeoutId = clearTimeoutIfSet(state.timeoutId);
        };
      }

      unset();
    }

    return undefined;
  });

  createTrackingEffect(() => {
    if (!enabled()) {
      return;
    }
    if (!context.open) {
      return;
    }

    const prevContext = state.current;
    const prevId = state.currentId;

    state.current = {
      onOpenChange: (open) => {
        context.onOpenChange(open);
      },
      setIsInstantPhase: (value) => {
        setIsInstantPhase(value);
      },
    };
    state.currentId = context.floatingId;
    groupContext.setDelay({
      open: 0,
      close: getDelay(groupContext.initialDelay, 'close'),
    });

    if (prevId !== null && prevId !== context.floatingId) {
      state.timeoutId = clearTimeoutIfSet(state.timeoutId);
      setIsInstantPhase(true);
      prevContext?.setIsInstantPhase(true);
      prevContext?.onOpenChange(false);
    } else {
      setIsInstantPhase(false);
      prevContext?.setIsInstantPhase(false);
    }
  });

  onCleanup(() => {
    state.current = null;
  });

  return {
    hasProvider: groupContext.hasProvider,
    get delay() {
      return groupContext.delay();
    },
    get isInstantPhase() {
      return isInstantPhase();
    },
  };
}
