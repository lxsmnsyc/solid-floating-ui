# AGENTS.md

SolidJS bindings for [Floating UI](https://floating-ui.com). The published
package is `solid-floating-ui` in [packages/solid-floating-ui](packages/solid-floating-ui).

## Commands

`pnpm` only, never npm or yarn.

| Task                | Command                                  |
| ------------------- | ---------------------------------------- |
| Build every package | `pnpm build`                             |
| Run the playground  | `pnpm dev`                               |
| Run tests           | `pnpm test`                              |
| Type-check          | `pnpm run type-check`                    |
| Lint                | `pnpm lint` (`pnpm lint:fix` to autofix) |
| Format              | `pnpm fmt` (`pnpm fmt:check` in CI)      |
| Add a changeset     | `pnpm cs:add`                            |

Formatting is `oxfmt` and linting is `oxlint` with
[@lxsmnsyc/oxlint-config](https://npmjs.com/package/@lxsmnsyc/oxlint-config).
Builds are `tsdown`. Do not reintroduce Biome, ESLint, Prettier, Lerna or
pridepack.

## Releasing

Releases run from `.github/workflows/release.yml` on every push to `main`. Do
not run `pnpm cs:ver` or `pnpm cs:pub` by hand.

- While changesets are pending, the workflow opens a "chore: version packages"
  pull request that bumps the version and writes `CHANGELOG.md`.
- Merging that pull request publishes to npm and creates the GitHub release.

The `2.0` branch releases the same way, but it is in changesets pre mode, so it
publishes prereleases such as `2.0.0-next.0` under the npm `next` tag. That mode
lives in `.changeset/pre.json`, so do not delete it. Run `pnpm cs:pre:exit` when
the branch is ready for a stable release, and take `2.0` out of the release
workflow's branch list once it has merged.

## Changesets

Every change ships with a changeset. Writing one is part of finishing the work,
not a step somebody has to ask for.

The bump level is about whether the thing existed before, not about how big the
change looks:

- `patch` when something that already existed now behaves differently.
- `minor` when something exists now that did not exist before.
- `major` only with the maintainer's explicit approval, so ask first.

When one change does both, take the higher of the two.

The file is a markdown file in `.changeset/`, named in kebab-case as a short
sentence about the change:

```markdown
---
'solid-floating-ui': minor
---

- `useHover` now closes the floating element when the pointer leaves the safe polygon.
- `FloatingArrow` accepts a `staticOffset` prop.
```

Rules for the prose:

- Keep it short. One sentence per change is usually enough.
- Write plainly, so somebody reading `CHANGELOG.md` understands it without the diff.
- Use a list of sentences when the changeset covers more than one thing.
- Name the behaviour, not the file or the function.
- Never use an em dash.
