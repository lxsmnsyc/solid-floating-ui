import { Composite, CompositeItem } from 'solid-floating-ui';
import { For, createSignal } from 'solid-js';

const TOOLS = ['Bold', 'Italic', 'Underline', 'Strike'];
const CELLS = Array.from({ length: 12 }, (_, index) => index + 1);

export default function CompositeDemo() {
  const [pressed, setPressed] = createSignal('nothing yet');

  return (
    <>
      <div class="stage">
        <Composite
          orientation="horizontal"
          loop
          render={(htmlProps) => <div {...htmlProps} class="toolbar" role="toolbar" />}
        >
          <For each={TOOLS}>
            {(tool) => (
              <CompositeItem
                render={(htmlProps) => (
                  <button
                    type="button"
                    {...htmlProps}
                    onClick={() => {
                      setPressed(tool);
                    }}
                  >
                    {tool}
                  </button>
                )}
              />
            )}
          </For>
        </Composite>

        <Composite
          cols={4}
          orientation="both"
          loop
          render={(htmlProps) => <div {...htmlProps} class="grid" role="grid" />}
        >
          <For each={CELLS}>
            {(cell) => (
              <CompositeItem
                render={(htmlProps) => (
                  <button
                    type="button"
                    {...htmlProps}
                    onClick={() => {
                      setPressed(`cell ${cell}`);
                    }}
                  >
                    {cell}
                  </button>
                )}
              />
            )}
          </For>
        </Composite>
      </div>

      <p class="readout">last pressed: {pressed()}</p>
      <p class="note">
        Each group is one tab stop. Arrow keys move inside it, and the grid navigates on both axes
        because <code>cols</code> is set. Nothing here is a floating element.
      </p>
    </>
  );
}
