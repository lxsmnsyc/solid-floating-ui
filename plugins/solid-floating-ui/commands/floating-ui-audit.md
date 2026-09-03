---
description: Review solid-floating-ui usage in this project for reactivity and accessibility mistakes
argument-hint: '[path]'
---

Audit how this project uses `solid-floating-ui`. Search `$ARGUMENTS` if given,
otherwise the whole source tree.

Read `${CLAUDE_PLUGIN_ROOT}/skills/solid-floating-ui/reference/api.md` first, then
check every call site for these, in order of how much damage they do:

1. An option that changes passed as a value rather than a getter, or props
   destructured before being passed. The element silently stops updating.
2. A return value destructured out of the object, which freezes it.
3. `useDismiss` missing, so Escape and outside presses do nothing.
4. `useRole` missing, or a role that does not match the pattern.
5. A floating element inside a clipping or stacking ancestor with no
   `FloatingPortal`.
6. An interactive floating element with no `FloatingFocusManager`, or a modal
   one with `modal={false}`.
7. `whileElementsMounted: autoUpdate` missing on an element that must stay
   anchored while the page scrolls.
8. A prop getter called inside a loop instead of `getItemProps`.
9. `createRef` used where the option takes an accessor, or the reverse.
10. Markup gated on `open()` while a transition hook is in use, so the exit
    animation never plays.

Report findings as a list, each naming the file, the line and the fix. Do not
change anything unless asked.
