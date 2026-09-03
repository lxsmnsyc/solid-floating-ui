import {
  FloatingArrow,
  type Placement,
  arrow,
  autoUpdate,
  offset,
  shift,
  useFloating,
} from 'solid-floating-ui';
import { For, createSignal } from 'solid-js';

const PLACEMENTS: Placement[] = ['top', 'right', 'bottom', 'left'];

export default function ArrowDemo() {
  const [placement, setPlacement] = createSignal<Placement>('top');
  const [arrowElement, setArrowElement] = createSignal<Element | null>(null);

  const floating = useFloating({
    open: true,
    get placement() {
      return placement();
    },
    get middleware() {
      return [offset(12), shift({ padding: 8 }), arrow({ element: arrowElement, padding: 6 })];
    },
    whileElementsMounted: autoUpdate,
  });

  return (
    <>
      <div class="stage">
        <button
          type="button"
          class="trigger"
          ref={(element) => {
            floating.refs.setReference(element);
          }}
        >
          Reference
        </button>
        <div
          class="floating"
          ref={(element) => {
            floating.refs.setFloating(element);
          }}
          style={floating.floatingStyles}
        >
          The arrow points back at the reference
          <FloatingArrow
            ref={(element: SVGSVGElement) => {
              setArrowElement(element);
            }}
            context={floating.context}
            fill="var(--floating-bg)"
          />
        </div>
      </div>

      <div class="controls">
        <label class="control">
          Placement
          <select
            value={placement()}
            onChange={(event) => {
              const value = PLACEMENTS.find((item) => item === event.currentTarget.value);
              if (value) {
                setPlacement(value);
              }
            }}
          >
            <For each={PLACEMENTS}>{(value) => <option value={value}>{value}</option>}</For>
          </select>
        </label>
      </div>

      <p class="note">
        The <code>arrow</code> middleware takes an accessor here, so it is safe to declare before
        the arrow element exists.
      </p>
    </>
  );
}
