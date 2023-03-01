# solid-floating-ui

> SolidJS bindings for [Floating UI](https://floating-ui.com/). Based on [`@floating-ui/react-dom`](https://floating-ui.com/docs/react-dom)

[![NPM](https://img.shields.io/npm/v/solid-floating-ui.svg)](https://www.npmjs.com/package/solid-floating-ui) [![JavaScript Style Guide](https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb)](https://github.com/airbnb/javascript)

## Install

```bash
npm install --save @floating-ui/dom solid-floating-ui
```

```bash
yarn add @floating-ui/dom solid-floating-ui
```

```bash
pnpm add @floating-ui/dom solid-floating-ui
```

## Usage

```js
import { createSignal } from 'solid-js';
import { useFloating } from 'solid-floating-ui';

function App() {
  const [reference, setReference] = createSignal();
  const [floating, setFloating] = createSignal();

  // `position` is a reactive object.
  const position = useFloating(reference, floating);
 
  return (
    <>
      <button ref={setReference}>Button</button>
      <div
        ref={setFloating}
        style={{
          position: position.strategy,
          top: position.x ?? 0,
          left: position.y ?? 0,
        }}
      >
        Tooltip
      </div>
    </>
  );
}
```

`position` is based on [`computePosition`'s return value](https://floating-ui.com/docs/computeposition#return-value) has the following fields:

- `x` and `y` are the positioning coords. Initial values are null.
- `strategy` is either `absolute` (default) or `fixed`. Refer to [`strategy` option](https://floating-ui.com/docs/computeposition#strategy)
- `placement` is refers to the [`placement` options](https://floating-ui.com/docs/computeposition#placement)

Middlewares can also be used:

```js
import { useFloating } from 'solid-floating-ui';
import { offset, flip, shift } from '@floating-ui/dom';

const [reference, setReference] = createSignal();
const [floating, setFloating] = createSignal();

useFloating(reference, floating, {
  placement: 'right',
  strategy: 'fixed',
  middleware: [offset(10), flip(), shift()],
});
```

## Updating

`useFloating()` only calculates the position **once** on render, or when the reference/floating elements changed — for example, the floating element gets mounted via conditional rendering.

If the floating element lives in a different `offsetParent` context to the reference element, it will need to be updated while mounted to remain “anchored”. This includes scrolling and resizing the window or the elements themselves.

To do so, use the `autoUpdate` utility:

```js
import { useFloating } from 'solid-floating-ui';
import { autoUpdate } from '@floating-ui/dom';
 
function App() {
  const [reference, setReference] = createSignal();
  const [floating, setFloating] = createSignal();

  useFloating(reference, floating, {
    whileElementsMounted: autoUpdate,
 
    // Or, pass options. Ensure the cleanup function is returned.
    whileElementsMounted: (reference, floating, update) => (
      autoUpdate(reference, floating, update, {
        animationFrame: true,
      }),
    )
  });
}
```

Alternatively (or additionally), you may want to update manually in some cases. The primitive returns an `update()` function to update the position at will:

```js

const position = useFloating();

position.update();
```

### Virtual Elements

See [Virtual Elements](https://floating-ui.com/docs/virtual-elements) for details.

```js
function App() {
  const [floating, setFloating] = createSignal();

  const position = useFloating(
    () => ({
      getBoundingClientRect() {
        return {
          // ...
        };
      },
    }),
    floating,
  );

  return (
    <div
      ref={floating}
      style={{
        position: position.strategy,
        top: position.y ?? 0,
        left: position.x ?? 0,
      }}
    >
      Tooltip
    </div>
  );
}
```

## Sponsors

![Sponsors](https://github.com/lxsmnsyc/sponsors/blob/main/sponsors.svg?raw=true)

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
