import type { JSX } from 'solid-js';
import { render } from 'solid-js/web';
import ArrowCase from './cases/arrow';
import ClickCase from './cases/click';
import CompositeCase from './cases/composite';
import FocusManagerCase from './cases/focus-manager';
import HoverCase from './cases/hover';
import ListNavigationCase from './cases/list-navigation';
import PositioningCase from './cases/positioning';
import TransitionCase from './cases/transition';

// Each spec navigates to `/?case=<name>`; one bundle avoids a router
// dependency and keeps the harness startup cheap.
const CASES: Record<string, () => JSX.Element> = {
  arrow: ArrowCase,
  click: ClickCase,
  composite: CompositeCase,
  'focus-manager': FocusManagerCase,
  hover: HoverCase,
  'list-navigation': ListNavigationCase,
  positioning: PositioningCase,
  transition: TransitionCase,
};

function App(): JSX.Element {
  const name = new URLSearchParams(window.location.search).get('case');
  const Case = name === null ? undefined : CASES[name];

  if (Case === undefined) {
    return (
      <ul>
        {Object.keys(CASES).map((key) => (
          <li>
            <a href={`/?case=${key}`}>{key}</a>
          </li>
        ))}
      </ul>
    );
  }

  return <Case />;
}

const root = document.getElementById('root');

if (root === null) {
  throw new Error('Missing #root');
}

render(() => <App />, root);
