import { createRenderEffect } from 'solid-js';
import type { AnyElementProps, ElementProps, FloatingRootContext } from '../types';
import { stopEvent } from '../utils/event';
import { clearTimeoutIfSet } from '../utils/schedule';

export interface UseTypeaheadProps {
  /**
   * A ref which contains an array of strings whose indices match the HTML
   * elements of the list.
   * @default empty list
   */
  listRef: () => (string | null)[];
  /**
   * The index of the active (focused or highlighted) item in the list.
   * @default null
   */
  activeIndex: number | null;
  /**
   * Callback invoked with the matching index if found as the user types.
   */
  onMatch?: ((index: number) => void) | undefined;
  /**
   * Callback invoked with the typing state as the user types.
   */
  onTypingChange?: ((isTyping: boolean) => void) | undefined;
  /**
   * Whether the hook is enabled, including all internal effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * A function that returns the matching string from the list.
   * @default lowercase-finder
   */
  findMatch?:
    | null
    | ((list: (string | null)[], typedString: string) => string | null | undefined)
    | undefined;
  /**
   * The number of milliseconds to wait before resetting the typed string.
   * @default 750
   */
  resetMs?: number | undefined;
  /**
   * An array of keys to ignore when typing.
   * @default []
   */
  ignoreKeys?: string[] | undefined;
  /**
   * The index of the selected item in the list, if available.
   * @default null
   */
  selectedIndex?: number | null | undefined;
}

/**
 * Provides a matching callback that can be used to focus an item as the user
 * types, often used in tandem with `useListNavigation()`.
 * @see https://floating-ui.com/docs/useTypeahead
 */
export function useTypeahead(context: FloatingRootContext, props: UseTypeaheadProps): ElementProps {
  const enabled = (): boolean => props.enabled !== false;
  const resetMs = (): number => props.resetMs ?? 750;
  const ignoreKeys = (): string[] => props.ignoreKeys ?? [];
  const selectedIndex = (): number | null => props.selectedIndex ?? null;

  let timeoutId = -1;
  let typedString = '';
  let prevIndex: number | null = selectedIndex() ?? props.activeIndex ?? -1;
  let matchIndex: number | null = null;

  createRenderEffect(() => {
    if (context.open) {
      timeoutId = clearTimeoutIfSet(timeoutId);
      matchIndex = null;
      typedString = '';
    }
  });

  createRenderEffect(() => {
    const nextIndex = selectedIndex() ?? props.activeIndex ?? -1;
    // Sync arrow key navigation but not typeahead navigation.
    if (context.open && typedString === '') {
      prevIndex = nextIndex;
    }
  });

  function setTypingChange(value: boolean): void {
    if (context.dataRef.current.typing !== value) {
      context.dataRef.current.typing = value;
      props.onTypingChange?.(value);
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    function getMatchingIndex(
      list: (string | null)[],
      orderedList: (string | null)[],
      searchString: string,
    ): number {
      const findMatch = props.findMatch;
      const str = findMatch
        ? findMatch(orderedList, searchString)
        : orderedList.find(
            (text) => text?.toLocaleLowerCase().indexOf(searchString.toLocaleLowerCase()) === 0,
          );

      return str ? list.indexOf(str) : -1;
    }

    const listContent = props.listRef();

    if (typedString.length > 0 && typedString[0] !== ' ') {
      if (getMatchingIndex(listContent, listContent, typedString) === -1) {
        setTypingChange(false);
      } else if (event.key === ' ') {
        stopEvent(event);
      }
    }

    if (
      ignoreKeys().includes(event.key) ||
      // Character key.
      event.key.length !== 1 ||
      // Modifier key.
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }

    if (context.open && event.key !== ' ') {
      stopEvent(event);
      setTypingChange(true);
    }

    // Bail out if the list contains a word like "llama" or "aaron".
    const allowRapidSuccessionOfFirstLetter = listContent.every((text) =>
      text ? text[0]?.toLocaleLowerCase() !== text[1]?.toLocaleLowerCase() : true,
    );

    // Allows the user to cycle through items that start with the same letter
    // in rapid succession.
    if (allowRapidSuccessionOfFirstLetter && typedString === event.key) {
      typedString = '';
      prevIndex = matchIndex;
    }

    typedString += event.key;
    timeoutId = clearTimeoutIfSet(timeoutId);
    timeoutId = window.setTimeout(() => {
      typedString = '';
      prevIndex = matchIndex;
      setTypingChange(false);
    }, resetMs());

    const startIndex = (prevIndex ?? 0) + 1;
    const index = getMatchingIndex(
      listContent,
      [...listContent.slice(startIndex), ...listContent.slice(0, startIndex)],
      typedString,
    );

    if (index !== -1) {
      props.onMatch?.(index);
      matchIndex = index;
    } else if (event.key !== ' ') {
      typedString = '';
      setTypingChange(false);
    }
  }

  const reference: AnyElementProps = { onKeyDown };

  const floating: AnyElementProps = {
    onKeyDown,
    onKeyUp(event: KeyboardEvent) {
      if (event.key === ' ') {
        setTypingChange(false);
      }
    },
  };

  return {
    get reference() {
      return enabled() ? reference : undefined;
    },
    get floating() {
      return enabled() ? floating : undefined;
    },
  };
}
