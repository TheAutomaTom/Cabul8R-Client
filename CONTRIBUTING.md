# Contributing to Cabul8R

Thanks for helping. This guide covers the basics; architecture decisions live in
[docs/adr](https://github.com/TheAutomaTom/Cabul8R/tree/main/docs/adr) and planned work in [docs/roadmap.md](https://github.com/TheAutomaTom/Cabul8R/blob/main/docs/roadmap.md).

## Setup

- Node.js 22+ and pnpm 10.
- `pnpm install`, then `pnpm dev` (web) or `pnpm dev:desktop` (Electron).
- Electron downloads its binary the first time it launches.

## Before opening a pull request

```sh
pnpm lint
pnpm format:check   # or `pnpm format` to fix
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @cabul8r/e2e e2e   # desktop smoke tests, after `pnpm build`
```

CI runs the same steps on Windows, macOS and Linux.

> Running the e2e tests from a terminal inside VS Code works too: the tests strip the
> `ELECTRON_RUN_AS_NODE` variable that VS Code's terminal inherits.

## Ground rules

- **Units:** store real-world lengths in millimeters, and store drawn geometry in PDF page space
  (points). Convert only at display/input time with `@cabul8r/units`.
- **Commands:** user-facing actions are registered in the command registry so they work from the
  palette, keybindings and menus alike. Context menus reference command ids.
- **Host access:** feature code talks to the platform only through `HostAdapter`. Never import
  Electron or call browser file APIs from `packages/*`.
- **Theming:** use `--vscode-*` CSS variables, never hard-coded colors.
- **Tests:** parsers, geometry and measurement code need unit tests. Measurement code also needs a
  property test where one makes sense.
- **Licensing:** new dependencies must be compatible with Apache-2.0 (MIT, BSD, Apache, ISC,
  CC-BY for assets). No GPL in the core; GPL components such as DWG support live in separate
  optional plugins.

## Commit messages

Use the imperative mood and a short summary line, e.g. `Add architectural format to units`.
