---
description: Scaffold a solid-floating-ui pattern into the current project
argument-hint: 'tooltip|popover|dialog|select|menu|context-menu|cursor|composite|transition|delay-group|arrow'
---

Build the `$ARGUMENTS` pattern in this project using `solid-floating-ui`.

1. Read `${CLAUDE_PLUGIN_ROOT}/skills/solid-floating-ui/reference/api.md`, then
   `${CLAUDE_PLUGIN_ROOT}/skills/solid-floating-ui/reference/$ARGUMENTS.md`. If
   the argument is empty or does not name a recipe, list the recipes in that
   directory and ask which one.
2. Check that `solid-floating-ui` and `@floating-ui/dom` are dependencies. If
   they are not, say so and install them with the project's package manager
   before writing code.
3. Look at how this project writes components: file layout, TypeScript or not,
   styling approach, whether it uses a UI kit. Match it. The recipe is the
   wiring, not a house style.
4. Write the component, keeping every option a getter and every prop getter
   spread once. Do not simplify away `useDismiss` or `useRole`.
5. Add the styles the recipe's markup implies, in whatever way the project
   already styles things.
6. Report what was created and what the user should try in the browser to see
   it working, including the keyboard interaction.
