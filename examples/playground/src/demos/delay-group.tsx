import type { JSX } from '@solidjs/web';
import {
  FloatingDelayGroup,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDelayGroup,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
  useRole,
  useTransitionStyles,
} from 'solid-floating-ui';
import { For, Show, createSignal } from 'solid-js';

const ACTIONS = ['Undo', 'Redo', 'Cut', 'Copy', 'Paste'];

function GroupedTooltip(props: { label: string }): JSX.Element {
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

  const group = useDelayGroup(floating.context);

  const interactions = useInteractions([
    useHover(floating.context, {
      move: false,
      get delay() {
        return group.delay;
      },
    }),
    useDismiss(floating.context),
    useRole(floating.context, { role: 'tooltip' }),
  ]);

  const transition = useTransitionStyles(floating.context, {
    get duration() {
      return group.isInstantPhase ? 0 : 180;
    },
    initial: { opacity: 0 },
  });

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
        {props.label}
      </button>
      <Show when={transition.isMounted}>
        <FloatingPortal>
          <div
            class="floating"
            {...interactions.getFloatingProps()}
            ref={(element) => {
              floating.refs.setFloating(element);
            }}
            style={{ ...floating.floatingStyles, ...transition.styles }}
          >
            {props.label}
          </div>
        </FloatingPortal>
      </Show>
    </>
  );
}

export default function DelayGroupDemo(): JSX.Element {
  return (
    <>
      <div class="stage">
        <FloatingDelayGroup delay={{ open: 600, close: 150 }} timeoutMs={400}>
          <For each={ACTIONS}>{(action) => <GroupedTooltip label={action} />}</For>
        </FloatingDelayGroup>
      </div>

      <p class="note">
        Hover the first button and wait. Move along the row and the rest appear with no delay and no
        fade, because the group reports its instant phase. Leave the row for a moment and the delay
        comes back.
      </p>
    </>
  );
}
