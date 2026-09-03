import {
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
  useTransitionStyles,
} from 'solid-floating-ui';
import { Show, createSignal } from 'solid-js';

export default function TransitionDemo() {
  const [open, setOpen] = createSignal(false);
  const [duration, setDuration] = createSignal(250);

  const floating = useFloating({
    get open() {
      return open();
    },
    onOpenChange: (value) => {
      setOpen(value);
    },
    placement: 'top',
    middleware: [offset(10), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const interactions = useInteractions([
    useClick(floating.context),
    useDismiss(floating.context),
    useRole(floating.context, { role: 'dialog' }),
  ]);

  const transition = useTransitionStyles(floating.context, {
    get duration() {
      return duration();
    },
    initial: ({ side }) => ({
      opacity: 0,
      transform: {
        top: 'translateY(6px) scale(0.96)',
        bottom: 'translateY(-6px) scale(0.96)',
        left: 'translateX(6px) scale(0.96)',
        right: 'translateX(-6px) scale(0.96)',
      }[side],
    }),
    common: ({ side }) => ({
      'transform-origin': {
        top: 'bottom',
        bottom: 'top',
        left: 'right',
        right: 'left',
      }[side],
    }),
  });

  return (
    <>
      <div class="stage">
        <button
          type="button"
          class="trigger"
          {...interactions.getReferenceProps()}
          ref={(element) => {
            floating.refs.setReference(element);
          }}
        >
          Toggle
        </button>

        <Show when={transition.isMounted}>
          <div
            class="panel"
            {...interactions.getFloatingProps()}
            ref={(element) => {
              floating.refs.setFloating(element);
            }}
            style={{ ...floating.floatingStyles, ...transition.styles }}
          >
            <h3>Still mounted while closing</h3>
            <p>It scales out of the side it is actually on, which flip() may have changed.</p>
          </div>
        </Show>
      </div>

      <div class="controls">
        <label class="control">
          Duration
          <input
            type="number"
            min="0"
            max="2000"
            step="50"
            value={duration()}
            onInput={(event) => {
              setDuration(event.currentTarget.valueAsNumber || 0);
            }}
          />
        </label>
      </div>

      <p class="note">
        <code>isMounted</code> stays true for the length of the closing transition, so the element
        survives long enough to animate out.
      </p>
    </>
  );
}
