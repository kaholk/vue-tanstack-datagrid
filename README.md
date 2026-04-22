# vue-tanstack-datagrid

This repository contains the extracted `vue-tanstack-datagrid` package together with a demo frontend and a lightweight backend used for local development.

## Repository Layout

```text
vue-tanstack-datagrid/
|- .vscode/
|- backend/
|- frontend/
|- packages/
|  \- datagrid/
```

- `frontend` contains the demo application and integration examples
- `backend` contains a simple backend for local testing
- `packages/datagrid` contains the publishable package
- `.vscode` contains workspace-level editor tasks and settings

## Development

Start the frontend:

```sh
bun run dev:frontend
```

Start the backend:

```sh
php -S 127.0.0.1:8000 -t backend
```

## Package Build

`packages/datagrid` has its own build output in `dist/`, so published exports point to built artifacts instead of raw `src` files.

Build the package:

```sh
bun run build:datagrid
```

Artifacts are written to `packages/datagrid/dist/`:

- `index.js`
- `index.cjs`
- `index.d.ts`
- `styles.css`

## Package Installation

Install with npm:

```sh
npm install vue vue-tanstack-datagrid @tanstack/vue-table @tanstack/vue-virtual
```

Install with bun:

```sh
bun add vue vue-tanstack-datagrid @tanstack/vue-table @tanstack/vue-virtual
```

`vue`, `@tanstack/vue-table`, and `@tanstack/vue-virtual` are peer dependencies of the package and need to be present in the target application.

Basic usage:

```ts
import { DataGrid } from 'vue-tanstack-datagrid'
import 'vue-tanstack-datagrid/styles.css'
```

## Publishing

Publishing applies only to `packages/datagrid`, not the root `package.json`.

Recommended release flow:

1. Bump `version` in `packages/datagrid/package.json`
2. Run type-check and build
3. Inspect the package with `bun pm pack --dry-run`
4. Verify registry authentication with `bun pm whoami` or `bun publish --dry-run`
5. Publish from `packages/datagrid`

Commands:

```sh
bun run type-check:datagrid
bun run build:datagrid
cd packages/datagrid
bun pm pack --dry-run
bun publish
```

## License

The repository is licensed under `MPL-2.0`. See `LICENSE` for details.
