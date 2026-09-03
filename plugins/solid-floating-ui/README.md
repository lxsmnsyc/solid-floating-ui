# solid-floating-ui plugin

Recipes for building floating elements in SolidJS with
[`solid-floating-ui`](https://github.com/lxsmnsyc/solid-floating-ui).

## Install

```
/plugin marketplace add lxsmnsyc/solid-floating-ui
/plugin install solid-floating-ui@solid-floating-ui
```

## What it adds

A skill, `solid-floating-ui`, that loads on its own whenever the work involves
anchored or overlay UI in a SolidJS project. It carries a complete working
recipe for each pattern, plus the reactivity rules that decide whether the
result actually updates.

| Recipe         | Covers                                                          |
| -------------- | --------------------------------------------------------------- |
| `tooltip`      | Hover and focus label, portalled, with the ARIA wiring          |
| `popover`      | Click-triggered anchored panel with focus management            |
| `dialog`       | Centred modal, backdrop, scroll lock, focus trap                |
| `select`       | Listbox with arrow keys, typeahead and a selected value         |
| `menu`         | Dropdown and nested menus related through `FloatingTree`        |
| `context-menu` | Right-click menu placed at a stored point                       |
| `cursor`       | Pointer-following element, and the axis that makes it reachable |
| `composite`    | Toolbar and grid arrow key navigation, no floating element      |
| `transition`   | Enter and exit animations that survive unmounting               |
| `delay-group`  | A row of tooltips sharing one hover delay                       |
| `arrow`        | A pointer that stays aimed at the reference                     |

Two commands:

- `/floating-ui-recipe <name>` scaffolds one of them into the current project,
  matching the project's own conventions.
- `/floating-ui-audit [path]` reviews existing usage for the mistakes that make
  a floating element stop updating or become unreachable.

## Why a plugin

The hooks are easy to wire up wrongly in ways that type-check and render, and
then quietly never update: an option passed as a value instead of a getter, a
return value destructured, a prop getter called inside a loop. The recipes are
written so that the working version is the one nearest to hand.
