import type { JSX } from '@solidjs/web';
import {
  FloatingPortal,
  autoUpdate,
  offset,
  safePolygon,
  shift,
  useClientPoint,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
  useRole,
} from 'solid-floating-ui';
import { For, Show, createSignal } from 'solid-js';

type Axis = 'both' | 'x' | 'y';

const AXES: Axis[] = ['both', 'x', 'y'];

export default function CursorDemo(): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const [axis, setAxis] = createSignal<Axis>('x');

  const floating = useFloating({
    get open() {
      return open();
    },
    onOpenChange: (value) => {
      setOpen(value);
    },
    placement: 'bottom',
    middleware: [offset(12), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useClientPoint(floating.context, {
    get axis() {
      return axis();
    },
  });

  const interactions = useInteractions([
    useHover(floating.context, {
      handleClose: safePolygon({ requireIntent: false }),
    }),
    useDismiss(floating.context),
    useRole(floating.context, { role: 'tooltip' }),
  ]);

  return (
    <>
      <div class="stage">
        <div
          class="context-target"
          {...interactions.getReferenceProps()}
          ref={(element) => {
            floating.refs.setReference(element);
          }}
        >
          Move the pointer across this area
        </div>

        <Show when={open()}>
          <FloatingPortal>
            <div
              class="floating"
              {...interactions.getFloatingProps()}
              ref={(element) => {
                floating.refs.setFloating(element);
              }}
              style={floating.floatingStyles}
            >
              Following on the {axis()} axis. <a href="#cursor">This link is reachable.</a>
            </div>
          </FloatingPortal>
        </Show>
      </div>

      <div class="controls">
        <label class="control">
          Axis
          <select
            value={axis()}
            onChange={(event) => {
              const value = AXES.find((item) => item === event.currentTarget.value);
              if (value) {
                setAxis(value);
              }
            }}
          >
            <For each={AXES}>{(value) => <option value={value}>{value}</option>}</For>
          </select>
        </label>
      </div>

      <p class="note">
        On <code>both</code> the element sits under the cursor and is impossible to reach. On{' '}
        <code>x</code> it stays anchored vertically, so <code>safePolygon</code> has a stable path
        to protect and the link inside can be clicked.
      </p>
    </>
  );
}
