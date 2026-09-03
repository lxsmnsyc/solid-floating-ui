import type { JSX } from '@solidjs/web';
import { Composite, CompositeItem } from 'solid-floating-ui';
import { For } from 'solid-js';

const ITEMS = ['One', 'Two', 'Three'];

export default function CompositeCase(): JSX.Element {
  return (
    <Composite
      orientation="horizontal"
      loop
      render={(htmlProps) => <div {...htmlProps} data-testid="composite" />}
    >
      <For each={ITEMS}>
        {(item) => (
          <CompositeItem
            render={(htmlProps) => (
              <button type="button" {...htmlProps} data-testid={`item-${item}`}>
                {item}
              </button>
            )}
          />
        )}
      </For>
    </Composite>
  );
}
