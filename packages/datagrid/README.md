# vue-tanstack-datagrid

`DataGrid` to gotowy, server-side grid dla Vue 3 oparty o:

- `@tanstack/vue-table`
- `@tanstack/vue-virtual`
- JSX/TSX

Obsluguje:

- server-side pagination
- server-side sorting
- server-side filtering
- global search
- wirtualizacje wierszy i kolumn
- pinning kolumn left/right
- zmiane kolejnosci, szerokosci i widocznosci kolumn
- zapisywane widoki w `localStorage` albo przez backend / baze danych
- quick filtry w toolbarze
- panel zaznaczenia z kopiowaniem i sumami

## Instalacja

Instalacja przez npm:

```sh
npm install vue vue-tanstack-datagrid @tanstack/vue-table @tanstack/vue-virtual
```

Instalacja przez bun:

```sh
bun add vue vue-tanstack-datagrid @tanstack/vue-table @tanstack/vue-virtual
```

Minimalne uzycie:

```ts
import { DataGrid } from 'vue-tanstack-datagrid'
import 'vue-tanstack-datagrid/styles.css'
```

## Build paczki

```sh
bun run build
```

Artefakty trafiaja do `dist/`:

- `dist/index.js`
- `dist/index.cjs`
- `dist/index.d.ts`
- `dist/styles.css`

## Szybki start

Najmniejsza sensowna integracja wymaga:

1. kolumn
2. `fetchPage`
3. importu stylow

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

## Jak dziala grid

Grid jest w pelni manualny po stronie danych:

- paginacja jest liczona przez backend
- sortowanie jest wykonywane przez backend
- filtrowanie jest wykonywane przez backend
- global search jest wykonywany przez backend

Frontend wysyla do `fetchPage` stan gridu i oczekuje gotowego wyniku dla aktualnej strony.

Przy zmianie:

- strony
- rozmiaru strony
- sortowania
- filtrow
- globalnego searcha
- zestawu widocznych kolumn serwerowych

grid ponownie wywoluje `fetchPage`.

## Kontrakt `fetchPage`

### Wejscie

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

Znaczenie pol:

- `pageIndex`: indeks strony od `0`
- `pageSize`: liczba wierszy na strone
- `sorting`: sortowanie TanStack, np. `[{ id: 'email', desc: false }]`
- `filters`: aktywne filtry kolumn, np. `[{ id: 'status', value: ['active', 'pending'] }]`
- `search`: globalny search z dialogu filtrow
- `include_columns`: lista pol, ktore backend ma zwrocic

### `include_columns`

`include_columns` nie jest lista wszystkich zdefiniowanych kolumn.

Grid buduje ja dynamicznie z:

- aktualnie widocznych kolumn, ktore maja `serverField`
- `requiredServerFields` z kolumn lokalnych
- zawsze pola `id`

To pozwala backendowi zwracac tylko potrzebne pola.

### Wyjscie

```ts
type DataGridFetchResult<TData> = {
  rows: TData[]
  totalRows: number
  pageCount: number
  meta?: Record<string, unknown>
}
```

## API komponentu `DataGrid`

### Props

| Prop | Typ | Domyslnie | Opis |
| --- | --- | --- | --- |
| `columns` | `DataGridColumn<T>[]` | wymagane | Definicje kolumn |
| `fetchPage` | `(params, signal?) => Promise<DataGridFetchResult<T>>` | wymagane | Funkcja pobierajaca dane |
| `toolbarFilters` | `DataGridFilterConfig[]` | `[]` | Dodatkowe filtry niezwiązane 1:1 z kolumna |
| `quickFilters` | `DataGridQuickFilterConfig[]` | `[]` | Skroty filtrow pokazywane w toolbarze |
| `initialState` | `DataGridInitialState` | `{}` | Poczatkowy stan gridu |
| `rowHeight` | `number` | `42` | Szacowana wysokosc wiersza do wirtualizacji |
| `overscanRows` | `number` | `10` | Bufor wirtualizacji wierszy |
| `overscanColumns` | `number` | `3` | Bufor wirtualizacji kolumn |
| `height` | `number` | `560` | Wysokosc viewportu gridu w px |
| `viewStorageKey` | `string` | `''` | Klucz `localStorage` dla zapisanych widokow |
| `savedViewsPersistence` | `DataGridSavedViewsPersistence \| undefined` | `undefined` | Wlasna persystencja widokow |
| `metaItems` | `DataGridMetaConfig[]` | `rows`, `fetched`, `datasetSize` | Co pokazac w stopce |
| `pageSizeConfig` | `DataGridPageSizeConfig` | `{ label: 'Rows', options: [50,100,250,500] }` | Konfiguracja selecta page size |
| `selectionPanelConfig` | `DataGridSelectionPanelConfig \| undefined` | `undefined` | Wlacza panel zaznaczenia |

## Zapisane widoki

Masz dwa tryby:

- `viewStorageKey` dla `localStorage`
- `savedViewsPersistence` dla backendu / bazy danych

Paczka eksportuje helpery:

```ts
import {
  deserializeDataGridSavedViews,
  serializeDataGridSavedViews,
  type DataGridSavedViewsPersistence,
} from 'vue-tanstack-datagrid'
```

## Eksporty z paczki

Paczka eksportuje:

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

W praktyce publiczne uzycie najczesciej ogranicza sie do:

- `DataGrid`
- typow z `./types`

## Ograniczenia i wazne uwagi

1. Sortowanie wymaga `serverField`.
2. Filtrowanie jest manualne. Backend musi rozumiec `params.filters` i `params.search`.
3. Najlepiej zawsze zwracac stabilne `id`.
4. Quick filters bez istniejacego `id` nie pojawia sie w toolbarze.
5. Duza zmiana definicji kolumn moze wymagac migracji zapisanych widokow.
6. Panel zaznaczenia dziala na aktualnie zaladowanych wierszach.
7. Wirtualizacja zaklada sensowny `rowHeight`.

## Skad brac przyklady

Najpelniejszy dzialajacy przyklad uzycia jest w:

- `frontend/src/views/TablePage.tsx`

## Publish

Checklist przed publikacja:

1. Zmien `version` w `package.json`.
2. Uruchom type-check i build.
3. Sprawdz paczke przez `bun pm pack --dry-run`.
4. Zaloguj sie do rejestru przez `bun publish --dry-run` albo `bun pm whoami`.
5. Opublikuj paczke z katalogu `packages/datagrid`.

Komendy:

```sh
bun run type-check
bun run build
bun pm pack --dry-run
bun publish
```

`publishConfig.access` jest ustawione na `public`, wiec nie trzeba dodawac `--access public`.

## License

Projekt i paczka sa udostepnione na licencji `MPL-2.0`.
