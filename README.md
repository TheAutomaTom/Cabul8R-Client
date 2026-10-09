# Cabul8R-Client

The desktop (Electron) and web (PWA) app for [Cabul8R](https://github.com/TheAutomaTom/Cabul8R):
open PDF plans, set their scale, draw and dimension on them, and report drawn vs. scaled sizes.

> **Status: early development.** Open PDF plans, set each page's scale (calibrate or pick a preset),
> and measure drawn vs. scaled lengths. Project files and drawing tools are next. See the
> [roadmap](https://github.com/TheAutomaTom/Cabul8R/blob/main/docs/roadmap.md).

## Getting started

Requires Node.js 22+ and pnpm 10.

```sh
pnpm install
pnpm dev            # web app at http://localhost:5173
pnpm dev:desktop    # Electron app
pnpm test           # unit tests
pnpm build          # build everything
pnpm e2e            # desktop smoke tests (after build)
```

## Layout

| Path                 | What it is                                                              |
| -------------------- | ----------------------------------------------------------------------- |
| `apps/desktop`       | Electron main/preload and the desktop `HostAdapter`                     |
| `apps/web`           | PWA entry and the browser `HostAdapter`                                 |
| `packages/workbench` | VS Code-style shell: layout, commands, keybindings, menus, themes       |
| `packages/app`       | Cabul8R features on top of the workbench                                |
| `packages/units`     | Length expression parser and formatter (metric and fractional imperial) |
| `packages/geometry`  | 2D geometry (M4+)                                                       |
| `packages/document`  | Document model, undo/redo, `.c8r` project files (M2+)                   |
| `packages/canvas`    | Scene graph, tools, snapping, screen/PDF paint backends (M4+)           |
| `packages/pdf`       | pdf.js worker: tiled rendering and vector extraction (M2+)              |
| `packages/schema`    | JSON Schemas shared with Cabul8R-Api                                    |
| `e2e`                | Playwright smoke tests for the desktop app                              |

Icons come from [Cabul8R-Icons](https://github.com/TheAutomaTom/Cabul8R-Icons).

## License

[Apache-2.0](LICENSE). See [NOTICE](NOTICE) for third-party attributions. Cabul8R is not affiliated
with Microsoft or Visual Studio Code.
