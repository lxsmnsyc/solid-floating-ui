import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from 'solid-floating-ui';
import { type JSX, Show, createSignal } from 'solid-js';

function Tooltip(props: { label: string; delay: number; children: string }): JSX.Element {
  const [open, setOpen] = createSignal(false);

  const floating = useFloating({
    get open() {
      return open();
    },
    onOpenChange: (value) => {
      setOpen(value);
    },
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const interactions = useInteractions([
    useHover(floating.context, {
      move: false,
      get delay() {
        return { open: props.delay, close: 80 };
      },
    }),
    useFocus(floating.context),
    useDismiss(floating.context),
    useRole(floating.context, { role: 'tooltip' }),
  ]);

  return (
    <>
      <button
        type="button"
        class="trigger"
        {...interactions.getReferenceProps()}
        ref={(element) => {
          floating.refs.setReference(element);
        }}
      >
        {props.children}
      </button>
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
            {props.label}
          </div>
        </FloatingPortal>
      </Show>
    </>
  );
}

export default function TooltipDemo(): JSX.Element {
  const [delay, setDelay] = createSignal(300);

  return (
    <>
      <div class="stage">
        <Tooltip label="Saves the current document" delay={delay()}>
          Save
        </Tooltip>
        <Tooltip label="Throws the document away" delay={delay()}>
          Discard
        </Tooltip>
        <Tooltip label="Sends it to everyone on the list" delay={delay()}>
          Publish
        </Tooltip>
      </div>

      <div class="controls">
        <label class="control">
          Open delay
          <input
            type="number"
            min="0"
            max="2000"
            step="50"
            value={delay()}
            onInput={(event) => {
              setDelay(event.currentTarget.valueAsNumber || 0);
            }}
          />
        </label>
      </div>

      <p class="note">
        Tab between the buttons: <code>useFocus</code> opens the tooltip for keyboard users too.
        Each tooltip waits out its own delay, which the delay group demo changes.
      </p>
    </>
  );
}
