import type { JSX } from '@solidjs/web';
import { onMount } from '../utils/reactivity';
import { createSignal } from 'solid-js';
import { createAttribute } from '../utils/constants';
import { isSafari } from '../utils/platform';

// See Diego Haz's Sandbox for making this logic work well on Safari/iOS:
// https://codesandbox.io/s/tabbable-portal-f4tng?file=/src/FocusTrap.tsx

export const HIDDEN_STYLES: JSX.CSSProperties = {
  border: '0',
  'clip-path': 'inset(50%)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: '0',
  position: 'fixed',
  'white-space': 'nowrap',
  width: '1px',
  top: '0',
  left: '0',
};

export function FocusGuard(props: JSX.HTMLAttributes<HTMLSpanElement>): JSX.Element {
  const [role, setRole] = createSignal<'button' | undefined>();

  onMount(() => {
    if (isSafari()) {
      // Unlike other screen readers such as NVDA and JAWS, the virtual cursor
      // on VoiceOver does trigger the focus event, so we can use the focus
      // trap element. On Safari, only buttons trigger the focus event.
      setRole('button');
    }
  });

  return (
    <span
      {...props}
      tabindex={0}
      // Role is only for VoiceOver.
      role={role()}
      aria-hidden={role() ? undefined : 'true'}
      {...{ [createAttribute('focus-guard')]: '' }}
      style={HIDDEN_STYLES}
    />
  );
}
