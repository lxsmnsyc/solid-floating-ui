import type { AnyElementProps, ElementProps } from '../types';
import { ACTIVE_KEY, FOCUSABLE_ATTRIBUTE, SELECTED_KEY } from '../utils/constants';
import { lazyProps } from '../utils/reactivity';

export interface ExtendedUserProps {
  [ACTIVE_KEY]?: boolean | undefined;
  [SELECTED_KEY]?: boolean | undefined;
}

type PropsRecord = Record<string, unknown>;

type Handler = (...args: unknown[]) => unknown;

function isHandler(value: unknown): value is Handler {
  return typeof value === 'function';
}

function computeMerged(
  userProps: (AnyElementProps & ExtendedUserProps) | undefined,
  propsList: (ElementProps | undefined)[],
  elementKey: keyof ElementProps,
): PropsRecord {
  const map = new Map<string, ((...args: unknown[]) => unknown)[]>();
  const isItem = elementKey === 'item';

  const acc: PropsRecord = {};

  if (elementKey === 'floating') {
    acc.tabindex = -1;
    acc[FOCUSABLE_ATTRIBUTE] = '';
  }

  if (userProps) {
    for (const [key, value] of Object.entries(userProps)) {
      if (isItem && (key === ACTIVE_KEY || key === SELECTED_KEY)) {
        continue;
      }
      acc[key] = value;
    }
  }

  const resolved = propsList.map((value) => {
    const propsOrGetProps = value ? value[elementKey] : null;
    if (typeof propsOrGetProps === 'function') {
      return userProps ? propsOrGetProps(userProps) : null;
    }
    return propsOrGetProps;
  });
  resolved.push(userProps);

  for (const props of resolved) {
    if (!props) {
      continue;
    }

    for (const [key, value] of Object.entries(props)) {
      if (isItem && (key === ACTIVE_KEY || key === SELECTED_KEY)) {
        continue;
      }

      if (key.startsWith('on')) {
        let handlers = map.get(key);
        if (!handlers) {
          handlers = [];
          map.set(key, handlers);
        }

        if (isHandler(value)) {
          handlers.push(value);

          acc[key] = (...args: unknown[]) =>
            map
              .get(key)
              ?.map((fn) => fn(...args))
              .find((val) => val !== undefined);
        }
      } else {
        acc[key] = value;
      }
    }
  }

  return acc;
}

/**
 * The merged props are read lazily so that every getter a hook contributes
 * stays reactive when the object is spread onto an element.
 */
function lazyMerge(
  userProps: (AnyElementProps & ExtendedUserProps) | undefined,
  propsList: (ElementProps | undefined)[],
  elementKey: keyof ElementProps,
): PropsRecord {
  return lazyProps(() => computeMerged(userProps, propsList, elementKey));
}

export interface UseInteractionsReturn {
  getReferenceProps(userProps?: AnyElementProps): PropsRecord;
  getFloatingProps(userProps?: AnyElementProps): PropsRecord;
  getItemProps(userProps?: AnyElementProps & ExtendedUserProps): PropsRecord;
}

/**
 * Merges an array of interaction hooks' props into prop getters, allowing
 * event handler functions to be composed together without overwriting one
 * another.
 * @see https://floating-ui.com/docs/useInteractions
 */
export function useInteractions(
  propsList: (ElementProps | undefined)[] = [],
): UseInteractionsReturn {
  return {
    getReferenceProps: (userProps) => lazyMerge(userProps, propsList, 'reference'),
    getFloatingProps: (userProps) => lazyMerge(userProps, propsList, 'floating'),
    getItemProps: (userProps) => lazyMerge(userProps, propsList, 'item'),
  };
}
