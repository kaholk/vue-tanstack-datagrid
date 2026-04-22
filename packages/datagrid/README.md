# @testproject/datagrid

`DataGrid` to gotowy, server-side grid dla Vue 3 oparty o:

- `@tanstack/vue-table`
- `@tanstack/vue-virtual`
- JSX/TSX

Obsługuje:

- server-side pagination
- server-side sorting
- server-side filtering
- global search
- wirtualizację wierszy i kolumn
- pinning kolumn left/right
- zmianę kolejności, szerokości i widoczności kolumn
- zapisywane widoki w `localStorage` albo przez backend / baze danych
- quick filtry w toolbarze
- panel zaznaczenia z kopiowaniem i sumami

## Instalacja

W workspace użycie wygląda tak:

```ts
import { DataGrid } from '@testproject/datagrid'
import '@testproject/datagrid/styles.css'
```

Build paczki:

```sh
npm run build
```

Artefakty trafiają do `dist/`:

- `dist/index.js`
- `dist/index.cjs`
- `dist/index.d.ts`
- `dist/styles.css`

## Szybki start

Najmniejsza sensowna integracja wymaga:

1. kolumn
2. `fetchPage`
3. importu stylów

```tsx
import { defineComponent } from 'vue'
import { DataGrid, type DataGridColumn, type DataGridFetchParams, type DataGridFetchResult } from '@testproject/datagrid'
import '@testproject/datagrid/styles.css'

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

## Jak działa grid

Grid jest w pełni manualny po stronie danych:

- paginacja jest liczona przez backend
- sortowanie jest wykonywane przez backend
- filtrowanie jest wykonywane przez backend
- global search jest wykonywany przez backend

Frontend wysyła do `fetchPage` stan gridu i oczekuje gotowego wyniku dla aktualnej strony.

Przy zmianie:

- strony
- rozmiaru strony
- sortowania
- filtrów
- globalnego searcha
- zestawu widocznych kolumn serwerowych

grid ponownie wywołuje `fetchPage`.

## Kontrakt `fetchPage`

### Wejście

Typ:

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

Znaczenie pól:

- `pageIndex`: indeks strony od `0`
- `pageSize`: liczba wierszy na stronę
- `sorting`: sortowanie TanStack, np. `[{ id: 'email', desc: false }]`
- `filters`: aktywne filtry kolumn, np. `[{ id: 'status', value: ['active', 'pending'] }]`
- `search`: globalny search z dialogu filtrów
- `include_columns`: lista pól, które backend ma zwrócić

### Ważne: `include_columns`

`include_columns` nie jest listą wszystkich zdefiniowanych kolumn.

Grid buduje ją dynamicznie z:

- aktualnie widocznych kolumn, które mają `serverField`
- `requiredServerFields` z kolumn lokalnych
- zawsze pola `id`

To pozwala backendowi zwracać tylko potrzebne pola.

Przykład:

```ts
const columns: DataGridColumn<UserRow>[] = [
  {
    id: 'fullName',
    header: 'Full name',
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    localKind: 'computed',
    requiredServerFields: ['first_name', 'last_name'],
  },
]
```

Jeśli `fullName` jest widoczna, grid doda do `include_columns`:

```ts
['id', 'first_name', 'last_name']
```

### Wyjście

Typ:

```ts
type DataGridFetchResult<TData> = {
  rows: TData[]
  totalRows: number
  pageCount: number
  meta?: Record<string, unknown>
}
```

Znaczenie pól:

- `rows`: dane dla bieżącej strony
- `totalRows`: pełna liczba rekordów po filtracji
- `pageCount`: liczba stron
- `meta`: opcjonalne dodatkowe metadane do stopki

Minimalny przykład odpowiedzi:

```json
{
  "rows": [
    {
      "id": 1,
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Smith"
    }
  ],
  "totalRows": 1240,
  "pageCount": 25
}
```

Przykład z metadanymi:

```json
{
  "rows": [],
  "totalRows": 1240,
  "pageCount": 25,
  "meta": {
    "datasetSize": "18.2 MB"
  }
}
```

## API komponentu `DataGrid`

### Props

| Prop | Typ | Domyślnie | Opis |
| --- | --- | --- | --- |
| `columns` | `DataGridColumn<T>[]` | wymagane | Definicje kolumn |
| `fetchPage` | `(params, signal?) => Promise<DataGridFetchResult<T>>` | wymagane | Funkcja pobierająca dane |
| `toolbarFilters` | `DataGridFilterConfig[]` | `[]` | Dodatkowe filtry niezwiązane 1:1 z kolumną |
| `quickFilters` | `DataGridQuickFilterConfig[]` | `[]` | Skróty filtrów pokazywane w toolbarze |
| `initialState` | `DataGridInitialState` | `{}` | Początkowy stan gridu |
| `rowHeight` | `number` | `42` | Szacowana wysokość wiersza do wirtualizacji |
| `overscanRows` | `number` | `10` | Bufor wirtualizacji wierszy |
| `overscanColumns` | `number` | `3` | Bufor wirtualizacji kolumn |
| `height` | `number` | `560` | Wysokość viewportu gridu w px |
| `viewStorageKey` | `string` | `''` | Klucz `localStorage` dla zapisanych widokow |
| `savedViewsPersistence` | `DataGridSavedViewsPersistence \| undefined` | `undefined` | Wlasna persystencja widokow, np. backend albo baza danych |
| `metaItems` | `DataGridMetaConfig[]` | `rows`, `fetched`, `datasetSize` | Co pokazać w stopce |
| `pageSizeConfig` | `DataGridPageSizeConfig` | `{ label: 'Rows', options: [50,100,250,500] }` | Konfiguracja selecta page size |
| `selectionPanelConfig` | `DataGridSelectionPanelConfig \| undefined` | `undefined` | Włącza panel zaznaczenia |

### `initialState`

Typ:

```ts
type DataGridInitialState = {
  pagination?: PaginationState
  sorting?: ColumnSort[]
  columnOrder?: ColumnOrderState
  columnSizing?: ColumnSizingState
  columnVisibility?: Record<string, boolean>
  columnPinning?: ColumnPinningState
  columnFilters?: ColumnFiltersState
  globalFilter?: string
}
```

Przykład:

```tsx
<DataGrid
  columns={columns}
  fetchPage={fetchUsers}
  initialState={{
    pagination: {
      pageIndex: 0,
      pageSize: 100,
    },
    sorting: [
      {
        id: 'id',
        desc: false,
      },
    ],
    columnPinning: {
      left: ['id', 'email'],
      right: ['actions'],
    },
    columnVisibility: {
      internalNote: false,
    },
  }}
/>
```

### `savedViewsPersistence`

Jesli nie chcesz trzymac widokow w `localStorage`, mozesz podlaczyc wlasna persystencje.

```ts
type DataGridSavedViewsPersistence = {
  load: () => Promise<unknown>
  save: (payload: unknown, views: DataGridSavedView[]) => Promise<void>
  serialize?: (views: DataGridSavedView[]) => unknown
  deserialize?: (payload: unknown) => DataGridSavedView[]
}
```

Zachowanie:

- jesli ustawisz tylko `viewStorageKey`, grid zapisuje widoki w `localStorage`
- jesli ustawisz `savedViewsPersistence`, grid laduje i zapisuje widoki przez ten adapter
- `serialize` i `deserialize` pozwalaja zapisac stan jako string, blob JSON albo wlasny format pod backend / baze

## API typu `DataGridColumn`

`DataGridColumn<TData>` rozszerza `ColumnDef<TData, unknown>` z TanStack.

### Najważniejsze pola

| Pole | Typ | Opis |
| --- | --- | --- |
| `id` | `string` | Wymagane, stabilny identyfikator kolumny |
| `accessorKey` | `string` | Standardowy accessor TanStack |
| `accessorFn` | `(row) => unknown` | Accessor wyliczany |
| `header` | `string \| render fn` | Nagłówek |
| `cell` | render fn | Renderer komórki |
| `size` | `number` | Szerokość kolumny |
| `minSize` | `number` | Minimalna szerokość |
| `enableHiding` | `boolean` | Czy można ukryć kolumnę |
| `enablePinning` | `boolean` | Czy można przypiąć kolumnę |
| `serverField` | `string` | Nazwa pola backendowego dla sort/filter/include |
| `localKind` | `'computed' \| 'action'` | Typ kolumny lokalnej |
| `requiredServerFields` | `string[]` | Dodatkowe pola wymagane z backendu |
| `align` | `'start' \| 'center' \| 'end'` | Wyrównanie nagłówka i komórek |
| `headerMode` | `'default' \| 'custom'` | Tryb nagłówka |
| `showFilter` | `boolean` | Czy pokazać filtr nawet bez `serverField` |
| `pickerLabel` | `string` | Etykieta w pickerze kolumn |
| `headerControl` | `(context) => unknown` | Dodatkowa kontrolka w headerze |
| `filterVariant` | `'text' \| 'select'` | Typ kontrolki filtra |
| `filterGroup` | `string` | Grupa w dialogu filtrów |
| `filterOptions` | `{ label, value }[]` | Opcje dla filtra `select` |
| `filterIncludeEmptyOption` | `boolean` | Dodaje opcję `null` |
| `filterEmptyOptionLabel` | `string` | Label dla pustych wartości |
| `filterPlaceholder` | `string` | Placeholder filtra |

### Zasady praktyczne

- Jeśli kolumna ma być sortowalna przez backend, ustaw `serverField`.
- Jeśli kolumna ma mieć filtr oparty o backend, ustaw `serverField`.
- Jeśli kolumna jest lokalna i wyliczana z kilku pól, użyj `localKind: 'computed'` i `requiredServerFields`.
- Jeśli kolumna zawiera przyciski akcji, użyj `localKind: 'action'`.

### Przykład kolumn podstawowych

```ts
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
    filterGroup: 'Kontakt',
  },
]
```

### Przykład kolumny wyliczanej

```ts
{
  id: 'fullName',
  header: 'Full name',
  accessorFn: (row) => `${row.firstName} ${row.lastName}`,
  size: 220,
  localKind: 'computed',
  requiredServerFields: ['first_name', 'last_name'],
}
```

### Przykład kolumny akcji

```tsx
{
  id: 'actions',
  header: 'Actions',
  size: 180,
  localKind: 'action',
  enablePinning: true,
  requiredServerFields: ['id', 'email'],
  cell: ({ row }) => (
    <div class="data-grid__actions">
      <button type="button" onClick={() => openPreview(row.original.id)}>
        Preview
      </button>
      <button type="button" onClick={() => sendEmail(row.original.email)}>
        Send email
      </button>
    </div>
  ),
}
```

### Przykład checkbox kolumny zaznaczenia

```tsx
{
  id: 'select',
  header: 'Select',
  size: 90,
  align: 'center',
  pickerLabel: 'Select',
  showFilter: false,
  enablePinning: true,
  headerControl: ({ table }) => (
    <input
      type="checkbox"
      checked={table.getIsAllPageRowsSelected()}
      indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
      onChange={table.getToggleAllPageRowsSelectedHandler()}
    />
  ),
  cell: ({ row }) => (
    <input
      type="checkbox"
      checked={row.getIsSelected()}
      onChange={row.getToggleSelectedHandler()}
    />
  ),
}
```

## API komponentu `DataGridInlineSelectEditor`

To gotowy editor do inline edycji wartosci `select` i `multi-select` wewnatrz komorek grida.

### Props

| Prop | Typ | Opis |
| --- | --- | --- |
| `modelValue` | `string \| number \| null \| Array<string \| number \| null>` | Aktualna wartosc |
| `options` | `DataGridFilterOption[]` | Dostepne opcje |
| `multiple` | `boolean` | Tryb multi-select |
| `emptyLabel` | `string` | Label dla pustej wartosci |
| `searchPlaceholder` | `string` | Placeholder inputa wyszukiwania |
| `selectAllLabel` | `string` | Label przycisku zaznaczania wszystkiego |
| `clearLabel` | `string` | Label przycisku czyszczenia |
| `minMenuWidth` | `number` | Minimalna szerokosc dropdownu |
| `zIndex` | `number` | `z-index` dropdownu |
| `onUpdateModelValue` | `(value) => void` | Callback zmiany wartosci |
| `onClose` | `() => void` | Callback zamkniecia |

### Przyklad single select

```tsx
<DataGridInlineSelectEditor
  modelValue={row.status}
  options={[
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ]}
  onUpdateModelValue={(value) => updateStatus(value as string)}
  onClose={() => closeEditor()}
/>
```

### Przyklad multi select

```tsx
<DataGridInlineSelectEditor
  modelValue={row.segments}
  options={[
    { value: 'vip', label: 'VIP' },
    { value: 'trial', label: 'Trial' },
    { value: 'renewal', label: 'Renewal' },
  ]}
  multiple
  emptyLabel="Wybierz segmenty"
  onUpdateModelValue={(value) => updateSegments(value as string[])}
  onClose={() => closeEditor()}
/>
```

## Filtrowanie

Grid ma dwa poziomy filtrów:

- filtry kolumn
- dodatkowe filtry toolbarowe

Do tego dochodzi:

- globalny search

### Filtry kolumn

Kolumna z `serverField` domyślnie trafia do systemu filtrów.

Przykład tekstowy:

```ts
{
  id: 'email',
  accessorKey: 'email',
  header: 'Email',
  serverField: 'email',
  filterGroup: 'Kontakt',
  filterPlaceholder: 'Szukaj po emailu',
}
```

Przykład `select`:

```ts
const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
]

{
  id: 'status',
  accessorKey: 'status',
  header: 'Status',
  serverField: 'status',
  filterGroup: 'Status',
  filterVariant: 'select',
  filterOptions: statusOptions,
  filterIncludeEmptyOption: true,
  filterEmptyOptionLabel: 'Puste',
}
```

### Dodatkowe filtry toolbarowe

To filtry niezwiązane bezpośrednio z kolumną. Nadal trafiają do `params.filters`.

```ts
const toolbarFilters: DataGridFilterConfig[] = [
  {
    id: 'datasetTag',
    label: 'Dataset tag',
    group: 'Dodatkowe',
    placeholder: 'Wpisz tag',
  },
  {
    id: 'environment',
    label: 'Environment',
    group: 'Dodatkowe',
    variant: 'select',
    options: [
      { value: 'prod', label: 'Production' },
      { value: 'stage', label: 'Staging' },
      { value: 'dev', label: 'Development' },
    ],
  },
]
```

### Quick filters

Quick filter pokazuje wybrane filtry od razu na toolbarze.

Ważne:

- `quickFilters[].id` musi wskazywać na istniejący filtr
- może to być `id` kolumny albo `id` z `toolbarFilters`

```ts
const quickFilters = [
  { id: 'status', width: 180 },
  { id: 'country', width: 180 },
  { id: 'datasetTag', width: 220 },
]
```

### Jak wyglądają wartości filtrów

Filtr tekstowy:

```ts
[{ id: 'email', value: 'john' }]
```

Filtr typu `select`:

```ts
[{ id: 'status', value: ['active', 'pending'] }]
```

Filtr z opcją pustej wartości:

```ts
[{ id: 'status', value: [null] }]
```

## Sortowanie

Sortowanie działa tylko dla kolumn z `serverField`.

Przykład:

```ts
{
  id: 'createdAt',
  accessorKey: 'createdAt',
  header: 'Created',
  serverField: 'created_at',
}
```

Backend dostanie np.:

```ts
sorting: [
  {
    id: 'createdAt',
    desc: true,
  },
]
```

`id` odnosi się do kolumny gridu. Jeśli backend oczekuje innej nazwy pola, mapuj ją po `id` albo użyj własnej tabeli mapującej razem z `serverField`.

## Zapisane widoki

Widoki sa opcjonalne. Masz dwa tryby:

- `viewStorageKey` dla `localStorage`
- `savedViewsPersistence` dla backendu / bazy danych

### Tryb localStorage

```tsx
<DataGrid
  columns={columns}
  fetchPage={fetchUsers}
  viewStorageKey="users-grid-views"
/>
```

Co zapisuje widok:

- kolejność kolumn
- szerokości kolumn
- widoczność kolumn
- pinning
- filtry kolumn
- global filter

Czego nie zapisuje:

- bieżąca strona
- zaznaczenie wierszy

Widoki sa wtedy trzymane w `window.localStorage`.

### Tryb backend / baza danych

Paczka eksportuje helpery:

```ts
import {
  deserializeDataGridSavedViews,
  serializeDataGridSavedViews,
  type DataGridSavedViewsPersistence,
} from '@testproject/datagrid'
```

Przyklad persystencji przez backend:

```ts
const savedViewsPersistence: DataGridSavedViewsPersistence = {
  serialize: serializeDataGridSavedViews,
  deserialize: deserializeDataGridSavedViews,
  load: async () => {
    const response = await fetch('/api/grid-views/users')
    const payload = await response.json()
    return payload.serializedViews ?? ''
  },
  save: async (payload) => {
    await fetch('/api/grid-views/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serializedViews: payload,
      }),
    })
  },
}
```

```tsx
<DataGrid
  columns={columns}
  fetchPage={fetchUsers}
  savedViewsPersistence={savedViewsPersistence}
/>
```

To podejscie pasuje do:

- backendu HTTP
- bazy danych
- storage per user / tenant
- synchronizacji widokow miedzy urzadzeniami

## Panel zaznaczenia

Aby włączyć panel zaznaczenia:

1. dodaj kolumnę zaznaczenia
2. przekaż `selectionPanelConfig`

```ts
const selectionPanelConfig = {
  position: 'bottom-right',
  sumColumns: [
    { columnId: 'amount', label: 'Suma amount' },
    {
      columnId: 'balance',
      label: 'Suma balance',
      formatValue: (value: number) => `${value.toFixed(2)} PLN`,
    },
  ],
  copyColumnIds: ['id', 'email', 'balance'],
  selectedRowsLabel: 'Zaznaczone wiersze',
  copyWithHeadersLabel: 'Kopiuj z naglowkami',
  copyWithoutHeadersLabel: 'Kopiuj bez naglowkow',
} satisfies DataGridSelectionPanelConfig
```

```tsx
<DataGrid
  columns={columns}
  fetchPage={fetchUsers}
  selectionPanelConfig={selectionPanelConfig}
/>
```

### Zachowanie panelu

- pokazuje się tylko, gdy `selectionPanelConfig` jest ustawione
- pokazuje się tylko, gdy na bieżącej stronie są zaznaczone wiersze
- kopiuje dane do schowka jako TSV
- jeśli `copyColumnIds` nie jest ustawione, kopiuje wszystkie widoczne kolumny poza:
  - `select`
  - kolumnami `localKind: 'action'`

### Sumy

Sumowane są tylko wartości liczbowe. Jeśli komórka ma string liczbowy, grid spróbuje zrobić `Number(value)`.

## Stopka i metadane

Domyślne metadane:

```ts
[
  { key: 'rows', label: 'Rows' },
  { key: 'fetched', label: 'Fetched' },
  { key: 'datasetSize', label: 'Dataset' },
]
```

Dostępne klucze:

- `rows`
- `fetched`
- `datasetSize`

Przykład własnej konfiguracji:

```ts
const metaItems = [
  { key: 'rows', label: 'Znaleziono' },
  { key: 'datasetSize', label: 'Rozmiar danych' },
] satisfies DataGridMetaConfig[]
```

Żeby `datasetSize` się wyświetlił, backend musi zwrócić:

```json
{
  "meta": {
    "datasetSize": "18.2 MB"
  }
}
```

## Page size

```ts
const pageSizeConfig = {
  label: 'Wierszy na strone:',
  options: [25, 50, 100, 200, 500],
} satisfies DataGridPageSizeConfig
```

```tsx
<DataGrid
  columns={columns}
  fetchPage={fetchUsers}
  pageSizeConfig={pageSizeConfig}
/>
```

## Przykład kompletny

Poniżej pełniejsza konfiguracja z:

- quick filtrami
- zapisanymi widokami
- pinningiem
- kolumną lokalną
- panelem zaznaczenia

```tsx
import { defineComponent } from 'vue'
import {
  DataGrid,
  type DataGridColumn,
  type DataGridFetchParams,
  type DataGridFetchResult,
  type DataGridFilterConfig,
  type DataGridQuickFilterConfig,
  type DataGridSelectionPanelConfig,
} from '@testproject/datagrid'
import '@testproject/datagrid/styles.css'

type CustomerRow = {
  id: number
  firstName: string
  lastName: string
  email: string
  country: string
  status: 'active' | 'inactive' | 'pending'
  balance: number
}

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
]

const columns: DataGridColumn<CustomerRow>[] = [
  {
    id: 'select',
    header: 'Select',
    size: 90,
    align: 'center',
    pickerLabel: 'Select',
    showFilter: false,
    enablePinning: true,
    headerControl: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
  },
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    size: 90,
    align: 'end',
    serverField: 'id',
    filterGroup: 'Klient',
  },
  {
    id: 'email',
    accessorKey: 'email',
    header: 'Email',
    size: 260,
    serverField: 'email',
    filterGroup: 'Kontakt',
  },
  {
    id: 'country',
    accessorKey: 'country',
    header: 'Country',
    size: 160,
    serverField: 'country',
    filterGroup: 'Lokalizacja',
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    size: 140,
    align: 'center',
    serverField: 'status',
    filterGroup: 'Status',
    filterVariant: 'select',
    filterOptions: statusOptions,
  },
  {
    id: 'balance',
    accessorKey: 'balance',
    header: 'Balance',
    size: 140,
    align: 'end',
    serverField: 'balance',
    filterGroup: 'Metryki',
    cell: ({ getValue }) => `${Number(getValue<number>()).toFixed(2)} PLN`,
  },
  {
    id: 'fullName',
    header: 'Full name',
    size: 220,
    localKind: 'computed',
    requiredServerFields: ['first_name', 'last_name'],
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
  },
]

const toolbarFilters: DataGridFilterConfig[] = [
  {
    id: 'datasetTag',
    label: 'Dataset tag',
    group: 'Dodatkowe',
    placeholder: 'Wpisz tag',
  },
]

const quickFilters: DataGridQuickFilterConfig[] = [
  { id: 'status', width: 180 },
  { id: 'country', width: 180 },
  { id: 'datasetTag', width: 220 },
]

const selectionPanelConfig: DataGridSelectionPanelConfig = {
  position: 'bottom-right',
  sumColumns: [
    {
      columnId: 'balance',
      label: 'Suma balance',
      formatValue: (value) => `${value.toFixed(2)} PLN`,
    },
  ],
  copyColumnIds: ['id', 'email', 'status', 'balance'],
}

async function fetchCustomers(
  params: DataGridFetchParams,
  signal?: AbortSignal,
): Promise<DataGridFetchResult<CustomerRow>> {
  const response = await fetch('/api/customers/grid', {
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
  name: 'CustomersPage',
  setup() {
    return () => (
      <DataGrid
        columns={columns}
        toolbarFilters={toolbarFilters}
        quickFilters={quickFilters}
        selectionPanelConfig={selectionPanelConfig}
        fetchPage={fetchCustomers}
        viewStorageKey="customers-grid-views"
        rowHeight={46}
        overscanRows={12}
        overscanColumns={4}
        initialState={{
          pagination: {
            pageIndex: 0,
            pageSize: 100,
          },
          sorting: [
            {
              id: 'id',
              desc: false,
            },
          ],
          columnPinning: {
            left: ['select', 'id'],
          },
        }}
      />
    )
  },
})
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

W praktyce publiczne użycie najczęściej ogranicza się do:

- `DataGrid`
- typów z `./types`

Pozostałe komponenty są głównie elementami składowymi.

## Ograniczenia i ważne uwagi

### 1. Sortowanie wymaga `serverField`

Bez `serverField` menu sortowania dla kolumny nie zadziała jako backendowe sortowanie.

### 2. Filtrowanie jest manualne

Grid nie filtruje danych lokalnie. Backend musi rozumieć `params.filters` i `params.search`.

### 3. Row id

Grid bierze `row.id`, a jeśli go nie ma, używa indeksu wiersza.

Najlepiej zawsze zwracać stabilne `id`.

### 4. Quick filters bez istniejącego `id` znikną

Jeśli `quickFilters` wskazuje na nieistniejący filtr, nie pojawi się w toolbarze.

### 5. Zapisane widoki zależą od wybranego storage

Przy `viewStorageKey`:

- widoki sa lokalne dla przegladarki
- nie synchronizuja sie miedzy uzytkownikami
- nie synchronizuja sie miedzy przegladarkami

Przy `savedViewsPersistence`:

- odpowiadasz za format zapisu i migracje
- mozesz trzymac widoki w backendzie albo bazie
- mozesz synchronizowac widoki miedzy urzadzeniami

W obu przypadkach duza zmiana definicji kolumn moze wymagac migracji zapisanych widokow.

### 6. Panel zaznaczenia działa na bieżącym modelu wierszy

To znaczy:

- zaznaczenie dotyczy aktualnie załadowanych wierszy
- kopiowanie i sumy dotyczą aktualnie zaznaczonych wierszy z bieżącego widoku

### 7. Wirtualizacja zakłada sensowny `rowHeight`

Jeśli realna wysokość wierszy mocno odbiega od `rowHeight`, scroll może wyglądać gorzej.

## Typy pomocnicze

### `DataGridFilterConfig`

```ts
type DataGridFilterConfig = {
  id: string
  label: string
  group?: string
  variant?: 'text' | 'select'
  options?: Array<{
    label: string
    value: string | number | null
  }>
  includeEmptyOption?: boolean
  emptyOptionLabel?: string
  placeholder?: string
}
```

### `DataGridQuickFilterConfig`

```ts
type DataGridQuickFilterConfig = {
  id: string
  width?: number | string
}
```

### `DataGridMetaConfig`

```ts
type DataGridMetaConfig = {
  key: 'rows' | 'fetched' | 'datasetSize'
  label?: string
}
```

### `DataGridPageSizeConfig`

```ts
type DataGridPageSizeConfig = {
  label?: string
  options?: number[]
}
```

### `DataGridSelectionPanelConfig`

```ts
type DataGridSelectionPanelConfig = {
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  sumColumns?: Array<{
    columnId: string
    label?: string
    formatValue?: (value: number) => string
  }>
  copyColumnIds?: string[]
  selectedRowsLabel?: string
  copyWithHeadersLabel?: string
  copyWithoutHeadersLabel?: string
}
```

### `DataGridSavedViewsPersistence`

```ts
type DataGridSavedViewsPersistence = {
  load: () => Promise<unknown>
  save: (payload: unknown, views: DataGridSavedView[]) => Promise<void>
  serialize?: (views: DataGridSavedView[]) => unknown
  deserialize?: (payload: unknown) => DataGridSavedView[]
}
```

## Skąd brać przykłady

Najpełniejszy działający przykład użycia jest w:

- `frontend/src/views/TablePage.tsx`

Tam są pokazane:

- kolumny tekstowe
- kolumny `select`
- kolumny lokalne `computed`
- kolumna akcji
- zaznaczanie wierszy
- panel sum i kopiowania
- zapisane widoki
- inline edycja komórek
