import {
  createEffect,
  createSignal,
  onCleanup,
} from 'solid-js';
import {
  computePosition,
  ComputePositionConfig,
  ComputePositionReturn,
} from '@floating-ui/dom';

export default function useFloating<R extends HTMLElement, F extends HTMLElement>(
  reference: () => R | undefined | null,
  floating: () => F | undefined | null,
  options?: Partial<ComputePositionConfig>,
): () => ComputePositionReturn | undefined {
  const [data, setData] = createSignal<ComputePositionReturn>();

  const [error, setError] = createSignal<{ value: any } | undefined>();

  createEffect(() => {
    const currentError = error();
    if (currentError) {
      throw currentError.value;
    }
  });

  createEffect(() => {
    const currentReference = reference();
    const currentFloating = floating();

    if (currentFloating && currentReference) {
      let mounted = true;

      onCleanup(() => {
        mounted = false;
      });

      computePosition(
        currentReference,
        currentFloating,
        {
          middleware: options?.middleware,
          placement: options?.placement,
          strategy: options?.strategy,
        },
      ).then((currentData) => {
        if (mounted) {
          setData(currentData);
        }
      }, (err) => {
        setError(err);
      });
    }
  });

  return () => data();
}
