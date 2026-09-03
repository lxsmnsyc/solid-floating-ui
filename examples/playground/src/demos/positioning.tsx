import { type Placement, autoUpdate, flip, offset, shift, useFloating } from 'solid-floating-ui';
import { For, type JSX, createSignal } from 'solid-js';

const PLACEMENTS: Placement[] = [
  'top',
  'top-start',
  'top-end',
  'right',
  'right-start',
  'right-end',
  'bottom',
  'bottom-start',
  'bottom-end',
  'left',
  'left-start',
  'left-end',
];

export default function PositioningDemo(): JSX.Element {
  const [placement, setPlacement] = createSignal<Placement>('bottom');
  const [distance, setDistance] = createSignal(8);
  const [useFlip, setUseFlip] = createSignal(true);
  const [useShift, setUseShift] = createSignal(true);

  const floating = useFloating({
    open: true,
    get placement() {
      return placement();
    },
    get middleware() {
      return [
        offset(distance()),
        useFlip() ? flip() : null,
        useShift() ? shift({ padding: 8 }) : null,
      ];
    },
    whileElementsMounted: autoUpdate,
  });

  return (
    <>
      <div class="stage">
        <div class="scroll-area">
          <div class="inner">
            <button
              type="button"
              class="trigger"
              ref={(element) => {
                floating.refs.setReference(element);
              }}
            >
              Reference
            </button>
          </div>
        </div>
        <div
          class="floating"
          ref={(element) => {
            floating.refs.setFloating(element);
          }}
          style={floating.floatingStyles}
        >
          Floating element
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
        <label class="control">
          Offset
          <input
            type="number"
            min="0"
            max="48"
            value={distance()}
            onInput={(event) => {
              setDistance(event.currentTarget.valueAsNumber || 0);
            }}
          />
        </label>
        <label class="control">
          <input
            type="checkbox"
            checked={useFlip()}
            onChange={(event) => {
              setUseFlip(event.currentTarget.checked);
            }}
          />
          flip()
        </label>
        <label class="control">
          <input
            type="checkbox"
            checked={useShift()}
            onChange={(event) => {
              setUseShift(event.currentTarget.checked);
            }}
          />
          shift()
        </label>
      </div>

      <p class="readout">
        placement: {floating.placement} · x: {Math.round(floating.x)} · y: {Math.round(floating.y)}{' '}
        · isPositioned: {String(floating.isPositioned)}
      </p>
      <p class="note">
        Scroll the dashed area to push the reference toward an edge. With <code>flip()</code> on,
        the element swaps sides; with <code>shift()</code> on, it slides along the side to stay in
        view.
      </p>
    </>
  );
}
