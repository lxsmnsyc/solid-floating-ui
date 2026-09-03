import {
  type JSX,
  createContext,
  createRenderEffect,
  createSignal,
  onCleanup,
  useContext,
} from 'solid-js';
import { getDelay } from '../hooks/useHover';
import type { Delay, FloatingRootContext } from '../types';
import { createCleanupEffect } from '../utils/reactivity';
import { type Ref, createRef } from '../utils/ref';
import { clearTimeoutIfSet } from '../utils/schedule';

interface CurrentContext {
  onOpenChange(open: boolean): void;
  setIsInstantPhase(value: boolean): void;
}

interface NextGroupContextValue {
  hasProvider: boolean;
  readonly timeoutMs: number;
  delayRef: Ref<Delay>;
  initialDelayRef: Ref<Delay>;
  timeoutIdRef: Ref<number>;
  currentIdRef: Ref<string | null>;
  currentContextRef: Ref<CurrentContext | null>;
}

const NextFloatingDelayGroupContext = createContext<NextGroupContextValue>({
  hasProvider: false,
  timeoutMs: 0,
  delayRef: { current: 0 },
  initialDelayRef: { current: 0 },
  timeoutIdRef: { current: -1 },
  currentIdRef: { current: null },
  currentContextRef: { current: null },
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
 * @see https://floating-ui.com/docs/FloatingDelayGroup
 */
export function NextFloatingDelayGroup(props: NextFloatingDelayGroupProps): JSX.Element {
  const delayRef = createRef<Delay>(props.delay);
  const initialDelayRef = createRef<Delay>(props.delay);
  const currentIdRef = createRef<string | null>(null);
  const currentContextRef = createRef<CurrentContext | null>(null);
  const timeoutIdRef = createRef(-1);

  const context: NextGroupContextValue = {
    hasProvider: true,
    get timeoutMs() {
      return props.timeoutMs ?? 0;
    },
    delayRef,
    initialDelayRef,
    currentIdRef,
    currentContextRef,
    timeoutIdRef,
  };

  return (
    <NextFloatingDelayGroupContext.Provider value={context}>
      {props.children}
    </NextFloatingDelayGroupContext.Provider>
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
   * The delay reference object.
   */
  delayRef: Ref<Delay>;
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
 * @see https://floating-ui.com/docs/FloatingDelayGroup
 */
export function useNextDelayGroup(
  context: FloatingRootContext,
  options: UseNextDelayGroupOptions = {},
): UseNextDelayGroupReturn {
  const enabled = (): boolean => options.enabled !== false;

  const groupContext = useContext(NextFloatingDelayGroupContext);
  const { currentIdRef, delayRef, initialDelayRef, currentContextRef, timeoutIdRef } = groupContext;

  const [isInstantPhase, setIsInstantPhase] = createSignal(false);

  createCleanupEffect(() => {
    function unset(): void {
      setIsInstantPhase(false);
      currentContextRef.current?.setIsInstantPhase(false);
      currentIdRef.current = null;
      currentContextRef.current = null;
      delayRef.current = initialDelayRef.current;
    }

    if (!enabled()) {
      return undefined;
    }
    if (!currentIdRef.current) {
      return undefined;
    }

    if (!context.open && currentIdRef.current === context.floatingId) {
      setIsInstantPhase(false);

      if (groupContext.timeoutMs) {
        timeoutIdRef.current = window.setTimeout(unset, groupContext.timeoutMs);
        return () => {
          timeoutIdRef.current = clearTimeoutIfSet(timeoutIdRef.current);
        };
      }

      unset();
    }

    return undefined;
  });

  createRenderEffect(() => {
    if (!enabled()) {
      return;
    }
    if (!context.open) {
      return;
    }

    const prevContext = currentContextRef.current;
    const prevId = currentIdRef.current;

    currentContextRef.current = {
      onOpenChange: (open) => {
        context.onOpenChange(open);
      },
      setIsInstantPhase: (value) => {
        setIsInstantPhase(value);
      },
    };
    currentIdRef.current = context.floatingId;
    delayRef.current = {
      open: 0,
      close: getDelay(initialDelayRef.current, 'close'),
    };

    if (prevId !== null && prevId !== context.floatingId) {
      timeoutIdRef.current = clearTimeoutIfSet(timeoutIdRef.current);
      setIsInstantPhase(true);
      prevContext?.setIsInstantPhase(true);
      prevContext?.onOpenChange(false);
    } else {
      setIsInstantPhase(false);
      prevContext?.setIsInstantPhase(false);
    }
  });

  onCleanup(() => {
    currentContextRef.current = null;
  });

  return {
    hasProvider: groupContext.hasProvider,
    delayRef,
    get isInstantPhase() {
      return isInstantPhase();
    },
  };
}
