import { For, Show, createSignal, onCleanup } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { DEMOS } from './demos';

function currentId() {
  return window.location.hash.slice(1) || DEMOS[0].id;
}

export default function App() {
  const [id, setId] = createSignal(currentId());

  function onHashChange() {
    setId(currentId());
  }

  window.addEventListener('hashchange', onHashChange);
  onCleanup(() => {
    window.removeEventListener('hashchange', onHashChange);
  });

  const demo = () => DEMOS.find((entry) => entry.id === id()) ?? DEMOS[0];

  return (
    <div class="layout">
      <aside class="sidebar">
        <h1>solid-floating-ui</h1>
        <nav>
          <For each={DEMOS}>
            {(entry) => (
              <a href={`#${entry.id}`} aria-current={entry.id === demo().id ? 'page' : undefined}>
                {entry.title}
              </a>
            )}
          </For>
        </nav>
      </aside>
      <main class="main">
        <header>
          <h2>{demo().title}</h2>
          <p>{demo().description}</p>
        </header>
        <Show when={demo()} keyed>
          {(entry) => <Dynamic component={entry.component} />}
        </Show>
      </main>
    </div>
  );
}
