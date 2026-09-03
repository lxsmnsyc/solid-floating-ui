# Composite

Arrow key navigation for a group of elements that is not a floating element at
all: a toolbar, a tab list, a grid of swatches. The group is one tab stop, and
arrow keys move inside it.

```tsx
import { Composite, CompositeItem } from 'solid-floating-ui';
import { For, type JSX } from 'solid-js';

export function Toolbar(props: { tools: string[]; onRun: (tool: string) => void }): JSX.Element {
  return (
    <Composite
      orientation="horizontal"
      loop
      render={(htmlProps) => <div {...htmlProps} class="toolbar" role="toolbar" />}
    >
      <For each={props.tools}>
        {(tool) => (
          <CompositeItem
            render={(htmlProps) => (
              <button
                type="button"
                {...htmlProps}
                onClick={() => {
                  props.onRun(tool);
                }}
              >
                {tool}
              </button>
            )}
          />
        )}
      </For>
    </Composite>
  );
}
```

A grid is the same component with `cols` set:

```tsx
<Composite
  cols={4}
  orientation="both"
  loop
  render={(htmlProps) => <div {...htmlProps} class="grid" role="grid" />}
>
  <For each={swatches}>
    {(swatch) => <CompositeItem render={(htmlProps) => <button type="button" {...htmlProps} />} />}
  </For>
</Composite>
```

## Notes

- `render` is the only way to choose the element. Without it both components
  render a plain `div`.
- Spread `htmlProps` onto the element before your own handlers, so the
  composite's `ref`, `tabindex` and key handling land.
- `orientation` decides which arrows move: `'horizontal'`, `'vertical'` or
  `'both'`. Set `'both'` with `cols` for a grid.
- Control the active item from outside with `activeIndex` and `onNavigate` when
  something else owns the selection.
- `itemSizes` and `dense` handle grids whose items span several cells.
- Items carrying `disabled` or `aria-disabled` are skipped. Override with
  `disabledIndices`.
- Add the ARIA role yourself. `Composite` handles keys and focus, not
  semantics.
