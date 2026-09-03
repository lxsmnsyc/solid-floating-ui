import { type JSX, createContext, createRenderEffect, createSignal, useContext } from 'solid-js';
import { getDelay } from '../hooks/useHover';
import type { Delay, FloatingRootContext } from '../types';
import { createCleanupEffect } from '../utils/reactivity';

export interface GroupState {
  readonly delay: Delay;
  readonly initialDelay: Delay;
  readonly currentId: string | null;
  readonly timeoutMs: number;
  readonly isInstantPhase: boolean;
}

export interface GroupContext extends GroupState {
  setCurrentId(currentId: string | null): void;
  setState(state: Partial<GroupState>): void;
}

const NOOP = (): void => {};

const defaultGroupContext: GroupContext = {
  delay: 0,
  initialDelay: 0,
  timeoutMs: 0,
  currentId: null,
  isInstantPhase: false,
  setCurrentId: NOOP,
  setState: NOOP,
};

const FloatingDelayGroupContext = createContext<GroupContext>(defaultGroupContext);

/**
 * Reads the surrounding `FloatingDelayGroup` context directly. Most callers
 * want the return value of `useDelayGroup()` instead.
 */
export function useDelayGroupContext(): GroupContext {
  return useContext(FloatingDelayGroupContext);
}

export interface FloatingDelayGroupProps {
  children?: JSX.Element;
  /**
   * The delay to use for the group.
   */
  delay: Delay;
  /**
   * An optional explicit timeout to use for the group, which represents when
   * grouping logic will no longer be active after the close delay completes.
   * Useful if grouping should last longer than the close delay, for example
   * when there is no close delay at all.
   */
  timeoutMs?: number | undefined;
}

/**
 * Provides context for a group of floating elements that should share a
 * `delay`.
 * @see https://floating-ui.com/docs/FloatingDelayGroup
 */
export function FloatingDelayGroup(props: FloatingDelayGroupProps): JSX.Element {
  const [delay, setDelay] = createSignal<Delay>(props.delay);
  const [currentId, setCurrentIdSignal] = createSignal<string | null>(null);
  const [isInstantPhase, setIsInstantPhase] = createSignal(false);

  let initialCurrentId: string | null = null;

  function setState(state: Partial<GroupState>): void {
    if ('delay' in state) {
      setDelay(() => state.delay!);
    }
    if ('currentId' in state) {
      setCurrentIdSignal(state.currentId ?? null);
    }
    if ('isInstantPhase' in state) {
      setIsInstantPhase(!!state.isInstantPhase);
    }
  }

  createRenderEffect(() => {
    const id = currentId();
    if (id) {
      if (initialCurrentId === null) {
        initialCurrentId = id;
      } else if (!isInstantPhase()) {
        setIsInstantPhase(true);
      }
    } else {
      if (isInstantPhase()) {
        setIsInstantPhase(false);
      }
      initialCurrentId = null;
    }
  });

  const context: GroupContext = {
    get delay() {
      return delay();
    },
    get initialDelay() {
      return props.delay;
    },
    get timeoutMs() {
      return props.timeoutMs ?? 0;
    },
    get currentId() {
      return currentId();
    },
    get isInstantPhase() {
      return isInstantPhase();
    },
    setCurrentId(id) {
      setCurrentIdSignal(() => id);
    },
    setState,
  };

  return (
    <FloatingDelayGroupContext.Provider value={context}>
      {props.children}
    </FloatingDelayGroupContext.Provider>
  );
}

export interface UseDelayGroupOptions {
  /**
   * Whether delay grouping should be enabled.
   * @default true
   */
  enabled?: boolean | undefined;
  id?: string | undefined;
}

/**
 * Enables grouping when called inside a component that is a child of a
 * `FloatingDelayGroup`.
 * @see https://floating-ui.com/docs/FloatingDelayGroup
 */
export function useDelayGroup(
  context: FloatingRootContext,
  options: UseDelayGroupOptions = {},
): GroupContext {
  const enabled = (): boolean => options.enabled !== false;
  const id = (): string => options.id ?? context.floatingId;

  const groupContext = useDelayGroupContext();

  createRenderEffect(() => {
    if (!enabled()) {
      return;
    }
    if (!groupContext.currentId) {
      return;
    }

    groupContext.setState({
      delay: {
        open: 1,
        close: getDelay(groupContext.initialDelay, 'close'),
      },
    });

    if (groupContext.currentId !== id()) {
      context.onOpenChange(false);
    }
  });

  createCleanupEffect(() => {
    function unset(): void {
      context.onOpenChange(false);
      groupContext.setState({
        delay: groupContext.initialDelay,
        currentId: null,
      });
    }

    if (!enabled()) {
      return undefined;
    }
    if (!groupContext.currentId) {
      return undefined;
    }

    if (!context.open && groupContext.currentId === id()) {
      if (groupContext.timeoutMs) {
        const timeout = window.setTimeout(unset, groupContext.timeoutMs);
        return () => {
          clearTimeout(timeout);
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
    if (groupContext.setCurrentId === NOOP || !context.open) {
      return;
    }
    groupContext.setCurrentId(id());
  });

  return groupContext;
}
