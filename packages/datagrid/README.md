# vue-tanstack-datagrid

`vue-tanstack-datagrid` is a server-side data grid for Vue 3 built on top of:

- `@tanstack/vue-table`
- `@tanstack/vue-virtual`
- JSX/TSX

It is designed for large datasets where pagination, sorting, filtering, and search are handled by the backend.

## Features

- server-side pagination
- server-side sorting
- server-side filtering
- global search
- row and column virtualization
- left and right column pinning
- column ordering, resizing, and visibility control
- saved views in `localStorage` or via a backend / database
- quick filters in the toolbar
- selection panel with copy and summary support

## Installation

Install with npm:

```sh
npm install vue vue-tanstack-datagrid @tanstack/vue-table @tanstack/vue-virtual
```

Install with bun:

```sh
bun add vue vue-tanstack-datagrid @tanstack/vue-table @tanstack/vue-virtual
```

`vue`, `@tanstack/vue-table`, and `@tanstack/vue-virtual` are required peer dependencies and must be installed in the consuming application.

Basic usage:

```ts
import { DataGrid } from 'vue-tanstack-datagrid'
import 'vue-tanstack-datagrid/styles.css'
```

## Quick Start

A minimal integration needs:

1. column definitions
2. a `fetchPage` function
3. the package stylesheet

```tsx
import { defineComponent } from 'vue'
import {
  DataGrid,
  type DataGridColumn,
  type DataGridFetchParams,
  type DataGridFetchResult,
} from 'vue-tanstack-datagrid'
import 'vue-tanstack-datagrid/styles.css'

type UserRow = {
  id: number
  email: string
  firstName: string
  lastName: string
}

const columns: DataGridColumn<UserRow>[] = [
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    size: 90,
    align: 'end',
    serverField: 'id',
  },
  {
    id: 'email',
    accessorKey: 'email',
    header: 'Email',
    size: 260,
    serverField: 'email',
  },
  {
    id: 'firstName',
    accessorKey: 'firstName',
    header: 'First name',
    size: 160,
    serverField: 'first_name',
  },
  {
    id: 'lastName',
    accessorKey: 'lastName',
    header: 'Last name',
    size: 160,
    serverField: 'last_name',
  },
]

async function fetchUsers(
  params: DataGridFetchParams,
  signal?: AbortSignal,
): Promise<DataGridFetchResult<UserRow>> {
  const response = await fetch('/api/users/grid', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
    signal,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.json()
}

export default defineComponent({
  name: 'UsersPage',
  setup() {
    return () => (
      <DataGrid
        columns={columns}
        fetchPage={fetchUsers}
        initialState={{
          pagination: {
            pageIndex: 0,
            pageSize: 50,
          },
        }}
      />
    )
  },
})
```

## How It Works

The grid is fully manual on the data side:

- pagination is handled by the backend
- sorting is handled by the backend
- filtering is handled by the backend
- global search is handled by the backend

The frontend sends the current grid state to `fetchPage` and expects a ready-to-render result for the current page.

Whenever any of the following changes, the grid calls `fetchPage` again:

- page
- page size
- sorting
- filters
- global search
- visible server-side columns

## `fetchPage` Contract

### Input

```ts
type DataGridFetchParams = {
  pageIndex: number
  pageSize: number
  sorting: ColumnSort[]
  filters: ColumnFiltersState
  search?: string
  include_columns?: string[]
}
```

Field meanings:

- `pageIndex`: zero-based page index
- `pageSize`: number of rows per page
- `sorting`: TanStack sorting, for example `[{ id: 'email', desc: false }]`
- `filters`: active column filters, for example `[{ id: 'status', value: ['active', 'pending'] }]`
- `search`: global search value from the filters dialog
- `include_columns`: list of backend fields to return

### `include_columns`

`include_columns` is not a list of every defined column.

It is built dynamically from:

- currently visible columns with `serverField`
- `requiredServerFields` from local columns
- the `id` field

This allows the backend to return only the fields required for the current view.

### Output

```ts
type DataGridFetchResult<TData> = {
  rows: TData[]
  totalRows: number
  pageCount: number
  meta?: Record<string, unknown>
}
```

## `DataGrid` Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `columns` | `DataGridColumn<T>[]` | required | Column definitions |
| `fetchPage` | `(params, signal?) => Promise<DataGridFetchResult<T>>` | required | Data loading function |
| `locale` | `'en' \| 'pl'` | `en` | Built-in text preset |
| `preset` | `DataGridPreset<T>` | `undefined` | Shared defaults for grid state, locale, selection, export, and layout |
| `toolbarFilters` | `DataGridFilterConfig[]` | `[]` | Additional filters not tied 1:1 to a column |
| `quickFilters` | `DataGridQuickFilterConfig[]` | `[]` | Filter shortcuts shown in the toolbar |
| `initialState` | `DataGridInitialState` | `{}` | Initial grid state |
| `rowHeight` | `number` | `42` | Estimated row height for virtualization |
| `overscanRows` | `number` | `10` | Row virtualization buffer |
| `overscanColumns` | `number` | `3` | Column virtualization buffer |
| `height` | `number \| 'fill'` | `560` | Fixed viewport height in px or fill the available parent height |
| `localeText` | `DataGridLocaleText \| undefined` | built-in labels | Text labels used by the grid |
| `resetPageOnFilterChange` | `boolean` | `true` | Reset to the first page after filter changes |
| `viewStorageKey` | `string` | `''` | `localStorage` key for saved views |
| `savedViewsPersistence` | `DataGridSavedViewsPersistence \| undefined` | `undefined` | Custom saved views persistence |
| `metaItems` | `DataGridMetaConfig[]` | `rows`, `fetched`, `datasetSize` | Footer metadata to display |
| `pageSizeConfig` | `DataGridPageSizeConfig` | `{ label: 'Rows', options: [50,100,250,500] }` | Page size select config |
| `selectionPanelConfig` | `DataGridSelectionPanelConfig \| undefined` | `undefined` | Enables the selection panel |

## Column Values For Copy And Sums

By default, the selection panel copies and sums `row.getValue(column.id)`.
The default copy format is `html`, which writes a `<table>` to the clipboard with a TSV plain-text fallback.
Use `selectionPanelConfig.copyFormat: 'text'` to keep plain TSV copying by default.

For computed or formatted columns, define custom value resolvers:

```ts
const columns: DataGridColumn<OrderRow>[] = [
  {
    id: 'remainingWeight',
    accessorKey: 'remainingWeight',
    header: 'Remaining weight',
    sumValue: ({ row }) => row.original.weightKg * row.original.qtyLeft,
    clipboardValue: ({ row }) => row.original.weightKg * row.original.qtyLeft,
    clipboardFormat: (value) => `${value} kg`,
  },
]
```

## Column Helpers

The package exports small helpers for app-level column factories:

```ts
import { createDataGridSelectFilterConfig } from 'vue-tanstack-datagrid'

const selectFilter = createDataGridSelectFilterConfig<OrderRow>(statusOptions, {
  includeEmpty: true,
})
```

## Presets

Use presets to keep repeated grid setup out of feature views:

```ts
import { createDataGridPreset } from 'vue-tanstack-datagrid'

const ordersGridPreset = createDataGridPreset({
  locale: 'pl',
  height: 'fill',
  pageSizeConfig: { label: 'Wierszy na stronę', options: [25, 50, 100, 200] },
  initialState: {
    pagination: { pageIndex: 0, pageSize: 50 },
  },
})
```

```tsx
<DataGrid columns={columns} fetchPage={fetchOrders} preset={ordersGridPreset} />
```

## Inline Mutation Helper

For editable grids, `useDataGridInlineMutation` stores per-row/per-field pending and error states:

```ts
import { useDataGridInlineMutation } from 'vue-tanstack-datagrid'

const inlineMutation = useDataGridInlineMutation<OrderRow>()
inlineMutation.setStatus(row, 'status', 'pending')
inlineMutation.setStatus(row, 'status', null)
```

## Saved Views

Saved views can be persisted in two ways:

- `viewStorageKey` for `localStorage`
- `savedViewsPersistence` for backend / database storage

The package also exports helper utilities:

```ts
import {
  deserializeDataGridSavedViews,
  serializeDataGridSavedViews,
  type DataGridSavedViewsPersistence,
} from 'vue-tanstack-datagrid'
```

## Package Exports

The package exports:

```ts
export { DataGrid }
export { DataGridColumnPickerDialog }
export { DataGridDialog }
export { DataGridDropdownMenu }
export { DataGridFooter }
export { DataGridFilterDialog }
export { DataGridHeaderCell }
export { DataGridInlineSelectEditor }
export { DataGridSaveViewDialog }
export { DataGridSelectionPanel }
export { DataGridToolbar }
export { DataGridValidatedNumberInput }
export { deserializeDataGridSavedViews }
export { serializeDataGridSavedViews }
export * from './types'
```

In most cases, public usage is limited to:

- `DataGrid`
- exported types from `./types`

## Notes And Limitations

1. Sorting requires `serverField`.
2. Filtering is manual. The backend must understand `params.filters` and `params.search`.
3. Stable `id` values are strongly recommended.
4. Quick filters with a missing `id` will not appear in the toolbar.
5. Large column definition changes may require saved view migrations.
6. The selection panel works on currently loaded rows only.
7. Virtualization assumes a sensible `rowHeight`.

## `height="fill"`

`height="fill"` makes the grid fill the available height of its parent instead of using a fixed pixel value.

Use it when the grid lives inside a flex or full-height layout:

```tsx
<div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
  <DataGrid columns={columns} fetchPage={fetchUsers} height="fill" />
</div>
```

Requirements:

- the parent chain must provide a real height
- flex parents should usually have `min-height: 0`
- after upgrading the package in a Vite app, restart the dev server if optimizer cache is stale

## Examples

The most complete working example is available in:

- `frontend/src/views/TablePage.tsx`

## License

This project is distributed under the `MPL-2.0` license.
