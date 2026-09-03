---
'solid-floating-ui': patch
---

- `useId` is gone. It only called `createUniqueId`, so call that from `solid-js` instead.
