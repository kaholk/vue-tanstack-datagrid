import {
  defineComponent,
  ref,
} from 'vue'

import MainLayout from '@/layouts/MainLayout'
import {
  DataGrid,
  DataGridInlineSelectEditor,
  deserializeDataGridSavedViews,
  serializeDataGridSavedViews,
} from 'vue-tanstack-datagrid'
import type {
  DataGridColumn,
  DataGridFetchParams,
  DataGridFetchResult,
  DataGridFilterConfig,
  DataGridMetaConfig,
  DataGridPageSizeConfig,
  DataGridQuickFilterConfig,
  DataGridSavedViewsPersistence,
  DataGridSelectionPanelConfig,
} from 'vue-tanstack-datagrid'

const statusValues = [
  'active',
  'active1',
  'active2',
  'active3',
  'active4',
  'inactive',
  'pending',
  'new',
  'qualified',
  'proposal',
] as const

type CustomerStatus = (typeof statusValues)[number]
const segmentValues = ['vip', 'trial', 'renewal', 'upsell', 'risk', 'enterprise'] as const
type CustomerSegment = (typeof segmentValues)[number]

type CustomerRow = {
  id: number
  customerCode: string
  firstName: string
  lastName: string
  email: string
  company: string
  city: string
  country: string
  department: string
  plan: string
  status: CustomerStatus
  segments: CustomerSegment[]
  visits: number
  progress: number
  score: number
  balance: number
  createdAt: string
} & Record<`extraCol${string}`, string>

type EditableCustomerField = 'company' | 'status' | 'segments' | 'visits'
type CustomerRowPatch = Partial<Pick<CustomerRow, EditableCustomerField>>
type ActiveEditCell = {
  rowId: number
  field: EditableCustomerField
}

const backendBaseUrl = import.meta.env.VITE_GRID_API_URL ?? 'http://127.0.0.1:8000'
const savedViewsApiUrl = `${backendBaseUrl}/index.php?resource=saved-views`
const statusFilterOptions = statusValues.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}))
const segmentFilterOptions = segmentValues.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}))
const toolbarFilters: DataGridFilterConfig[] = [
  {
    id: 'datasetTag',
    label: 'Dataset Tag',
    group: 'Dodatkowe filtry',
    placeholder: 'Wpisz tag danych',
  },
]
const quickFilters: DataGridQuickFilterConfig[] = [
  { id: 'status', width: 170 },
  { id: 'plan', width: 150 },
  { id: 'country', width: 180 },
  { id: 'datasetTag', width: 220 },
]
const metaItems: DataGridMetaConfig[] = [{ key: 'rows', label: 'Znaleziono' }]
const pageSizeConfig: DataGridPageSizeConfig = {
  label: 'Wierszy na strone:',
  options: [25, 50, 100, 200, 500, 1000],
}
const selectionPanelConfig: DataGridSelectionPanelConfig = {
  position: 'bottom-right',
  sumColumns: [
    { columnId: 'visits', label: 'Suma visits' },
    { columnId: 'score', label: 'Suma score' },
    {
      columnId: 'balance',
      label: 'Suma balance',
      formatValue: (value) => `${value.toFixed(2)} PLN`,
    },
  ],
  copyWithHeadersLabel: 'Kopiuj z naglowkami',
  copyWithoutHeadersLabel: 'Kopiuj bez naglowkow',
}
const savedViewsPersistence: DataGridSavedViewsPersistence = {
  serialize: serializeDataGridSavedViews,
  deserialize: deserializeDataGridSavedViews,
  load: async () => {
    const response = await fetch(savedViewsApiUrl)

    if (!response.ok) {
      throw new Error(`Nie udalo sie pobrac widokow z backendu: ${response.status}`)
    }

    const payload = (await response.json()) as { serializedViews?: string | null }
    return payload.serializedViews ?? ''
  },
  save: async (payload) => {
    const response = await fetch(savedViewsApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serializedViews: typeof payload === 'string' ? payload : JSON.stringify(payload),
      }),
    })

    if (!response.ok) {
      throw new Error(`Nie udalo sie zapisac widokow w backendzie: ${response.status}`)
    }
  },
}

const extraColumns: DataGridColumn<CustomerRow>[] = Array.from({ length: 30 }, (_, index) => {
  const columnId = `extraCol${String(index + 1).padStart(2, '0')}` as const

  return {
    id: columnId,
    accessorKey: columnId,
    header: `Extra ${String(index + 1).padStart(2, '0')}`,
    size: 140,
    serverField: columnId,
    filterGroup: 'Pola dodatkowe',
  }
})

function buildColumns(options: {
  getDraftValue: <TKey extends EditableCustomerField>(row: CustomerRow, key: TKey) => CustomerRow[TKey]
  updateDraftValue: <TKey extends EditableCustomerField>(
    row: CustomerRow,
    key: TKey,
    value: CustomerRow[TKey],
  ) => void
  submitRowUpdate: (rowId: number) => void
  isRowDirty: (rowId: number) => boolean
  isRowUpdating: (rowId: number) => boolean
  isEditingCell: (rowId: number, field: EditableCustomerField) => boolean
  startEditingCell: (rowId: number, field: EditableCustomerField) => void
  stopEditingCell: () => void
}) {
  return [
  {
    id: 'select',
    header: 'Select',
    headerControl: ({ table }) => (
      <label class="data-grid__header-checkbox">
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      </label>
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
    size: 120,
    align: 'center',
    showFilter: false,
    pickerLabel: 'Select',
    enableHiding: true,
    enablePinning: true,
  },
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    size: 120,
    align: 'end',
    enableHiding: true,
    enablePinning: true,
    serverField: 'id',
    filterGroup: 'Klient',
  },
  {
    id: 'customerCode',
    accessorKey: 'customerCode',
    header: 'Code',
    size: 120,
    enablePinning: true,
    serverField: 'customerCode',
    filterGroup: 'Klient',
  },
  {
    id: 'firstName',
    accessorKey: 'firstName',
    header: 'First Name',
    size: 150,
    enablePinning: true,
    serverField: 'firstName',
    filterGroup: 'Klient',
  },
  {
    id: 'lastName',
    accessorKey: 'lastName',
    header: 'Last Name',
    size: 150,
    serverField: 'lastName',
    filterGroup: 'Klient',
  },
  {
    id: 'email',
    accessorKey: 'email',
    header: 'Email',
    size: 260,
    serverField: 'email',
    filterGroup: 'Kontakt i firma',
  },
  {
    id: 'company',
    accessorKey: 'company',
    header: 'Company / edit',
    size: 180,
    serverField: 'company',
    filterGroup: 'Kontakt i firma',
    cell: ({ row }) =>
      options.isEditingCell(row.original.id, 'company') ? (
        <input
          type="text"
          class="data-grid__dialog-input"
          value={options.getDraftValue(row.original, 'company')}
          autofocus
          onClick={(event) => event.stopPropagation()}
          onBlur={() => options.stopEditingCell()}
          onKeydown={(event) => {
            if (event.key === 'Enter' || event.key === 'Escape') {
              options.stopEditingCell()
            }
          }}
          onInput={(event) =>
            options.updateDraftValue(
              row.original,
              'company',
              (event.target as HTMLInputElement).value,
            )
          }
        />
      ) : (
        <button
          type="button"
          class="data-grid__sort-button"
          onClick={(event) => {
            event.stopPropagation()
            options.startEditingCell(row.original.id, 'company')
          }}
        >
          <span class="data-grid__header-label">{options.getDraftValue(row.original, 'company')}</span>
        </button>
      ),
  },
  {
    id: 'city',
    accessorKey: 'city',
    header: 'City',
    size: 150,
    serverField: 'city',
    filterGroup: 'Lokalizacja',
  },
  {
    id: 'country',
    accessorKey: 'country',
    header: 'Country',
    size: 140,
    serverField: 'country',
    filterGroup: 'Lokalizacja',
  },
  {
    id: 'department',
    accessorKey: 'department',
    header: 'Department',
    size: 150,
    serverField: 'department',
    filterGroup: 'Kontakt i firma',
  },
  {
    id: 'plan',
    accessorKey: 'plan',
    header: 'Plan',
    size: 120,
    serverField: 'plan',
    filterGroup: 'Status i plan',
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status / edit',
    size: 150,
    align: 'center',
    serverField: 'status',
    filterGroup: 'Status i plan',
    filterVariant: 'select',
    filterOptions: statusFilterOptions,
    filterIncludeEmptyOption: true,
    filterEmptyOptionLabel: 'Pokaz puste',
    cell: ({ row }) =>
      options.isEditingCell(row.original.id, 'status') ? (
        <DataGridInlineSelectEditor
          modelValue={options.getDraftValue(row.original, 'status')}
          options={statusFilterOptions}
          onUpdateModelValue={(value) =>
            options.updateDraftValue(row.original, 'status', value as CustomerStatus)
          }
          onClose={options.stopEditingCell}
        />
      ) : (
        <button
          type="button"
          class="data-grid__sort-button"
          onClick={(event) => {
            event.stopPropagation()
            options.startEditingCell(row.original.id, 'status')
          }}
        >
          <span class="data-grid__badge">{options.getDraftValue(row.original, 'status')}</span>
        </button>
      ),
  },
  {
    id: 'segments',
    accessorKey: 'segments',
    header: 'Segments / multi',
    size: 190,
    align: 'center',
    localKind: 'computed',
    requiredServerFields: ['status', 'plan', 'country'],
    cell: ({ row }) =>
      options.isEditingCell(row.original.id, 'segments') ? (
        <DataGridInlineSelectEditor
          modelValue={options.getDraftValue(row.original, 'segments')}
          options={segmentFilterOptions}
          multiple
          emptyLabel="Wybierz"
          onUpdateModelValue={(value) =>
            options.updateDraftValue(row.original, 'segments', value as CustomerSegment[])
          }
          onClose={options.stopEditingCell}
        />
      ) : (
        <button
          type="button"
          class="data-grid__sort-button"
          onClick={(event) => {
            event.stopPropagation()
            options.startEditingCell(row.original.id, 'segments')
          }}
        >
          <span class="data-grid__actions">
            {options.getDraftValue(row.original, 'segments').length > 0 ? (
              options.getDraftValue(row.original, 'segments').map((segment) => (
                <span key={segment} class="data-grid__badge">
                  {segment}
                </span>
              ))
            ) : (
              <span class="data-grid__header-label">Brak</span>
            )}
          </span>
        </button>
      ),
  },
  {
    id: 'visits',
    accessorKey: 'visits',
    header: 'Visits / edit',
    size: 110,
    align: 'end',
    serverField: 'visits',
    filterGroup: 'Metryki',
    cell: ({ row }) =>
      options.isEditingCell(row.original.id, 'visits') ? (
        <input
          type="number"
          class="data-grid__dialog-input"
          value={String(options.getDraftValue(row.original, 'visits'))}
          autofocus
          onClick={(event) => event.stopPropagation()}
          onBlur={() => options.stopEditingCell()}
          onKeydown={(event) => {
            if (event.key === 'Enter' || event.key === 'Escape') {
              options.stopEditingCell()
            }
          }}
          onInput={(event) =>
            options.updateDraftValue(
              row.original,
              'visits',
              Number((event.target as HTMLInputElement).value || 0),
            )
          }
        />
      ) : (
        <button
          type="button"
          class="data-grid__sort-button"
          onClick={(event) => {
            event.stopPropagation()
            options.startEditingCell(row.original.id, 'visits')
          }}
        >
          <span class="data-grid__header-label">
            {String(options.getDraftValue(row.original, 'visits'))}
          </span>
        </button>
      ),
  },
  {
    id: 'progress',
    accessorKey: 'progress',
    header: 'Progress',
    size: 120,
    align: 'end',
    serverField: 'progress',
    filterGroup: 'Metryki',
    cell: ({ getValue }) => `${getValue<number>()}%`,
  },
  {
    id: 'score',
    accessorKey: 'score',
    header: 'Score',
    size: 110,
    align: 'end',
    serverField: 'score',
    filterGroup: 'Metryki',
  },
  {
    id: 'balance',
    accessorKey: 'balance',
    header: 'Balance',
    size: 130,
    align: 'end',
    serverField: 'balance',
    filterGroup: 'Metryki',
    cell: ({ getValue }) => `${Number(getValue<number>()).toFixed(2)} PLN`,
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: 'Created',
    size: 140,
    serverField: 'createdAt',
    filterGroup: 'Status i plan',
  },
  ...extraColumns,
  {
    id: 'scoreBand',
    header: 'Score Band long text',
    accessorFn: (row) => {
      if (row.score >= 80) return 'A'
      if (row.score >= 60) return 'B'
      if (row.score >= 40) return 'C'
      return 'D'
    },
    size: 110,
    align: 'center',
    localKind: 'computed',
    enablePinning: true,
    requiredServerFields: ['score'],
    cell: ({ getValue }) => <strong>{String(getValue())}</strong>,
  },
  {
    id: 'actions',
    header: 'Actions',
    size: 220,
    localKind: 'action',
    enableHiding: true,
    enablePinning: true,
    requiredServerFields: ['customerCode', 'email'],
    cell: ({ row }) => (
      <div class="data-grid__actions">
        <button type="button" onClick={() => window.alert(`Preview ${row.original.customerCode}`)}>
          Preview
        </button>
        <button
          type="button"
          disabled={!options.isRowDirty(row.original.id) || options.isRowUpdating(row.original.id)}
          onClick={() => options.submitRowUpdate(row.original.id)}
        >
          {options.isRowUpdating(row.original.id) ? 'Zapisywanie...' : 'Aktualizuj'}
        </button>
      </div>
    ),
  },
  ] satisfies DataGridColumn<CustomerRow>[]
}

async function fetchCustomers(
  params: DataGridFetchParams,
  signal?: AbortSignal,
): Promise<DataGridFetchResult<CustomerRow>> {
  const response = await fetch(`${backendBaseUrl}/index.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status}`)
  }

  return response.json()
}

function buildDefaultSegments(row: Pick<CustomerRow, 'status' | 'plan' | 'country'>): CustomerSegment[] {
  const segments: CustomerSegment[] = []

  if (row.plan.toLocaleLowerCase().includes('enterprise')) {
    segments.push('enterprise')
  }
  if (row.status === 'new' || row.status === 'pending') {
    segments.push('trial')
  }
  if (row.status === 'qualified' || row.status === 'proposal') {
    segments.push('upsell')
  }
  if (row.status === 'inactive') {
    segments.push('risk')
  }
  if (row.status.startsWith('active')) {
    segments.push('renewal')
  }
  if (row.country.toLocaleLowerCase().includes('united') || row.country.toLocaleLowerCase().includes('germany')) {
    segments.push('vip')
  }

  return segments
}

export default defineComponent({
  name: 'TablePage',
  setup() {
    const savedEdits = ref<Record<number, CustomerRowPatch>>({})
    const draftEdits = ref<Record<number, CustomerRowPatch>>({})
    const updatingRowId = ref<number | null>(null)
    const lastUpdatedMessage = ref('')
    const activeEditCell = ref<ActiveEditCell | null>(null)

    function getDraftValue<TKey extends EditableCustomerField>(
      row: CustomerRow,
      key: TKey,
    ): CustomerRow[TKey] {
      const draftValue = draftEdits.value[row.id]?.[key]
      if (draftValue !== undefined) {
        return draftValue as CustomerRow[TKey]
      }

      const savedValue = savedEdits.value[row.id]?.[key]
      if (savedValue !== undefined) {
        return savedValue as CustomerRow[TKey]
      }

      return row[key]
    }

    function updateDraftValue<TKey extends EditableCustomerField>(
      row: CustomerRow,
      key: TKey,
      value: CustomerRow[TKey],
    ) {
      draftEdits.value = {
        ...draftEdits.value,
        [row.id]: {
          ...(draftEdits.value[row.id] ?? {}),
          [key]: value,
        },
      }
    }

    function isRowDirty(rowId: number) {
      return Object.keys(draftEdits.value[rowId] ?? {}).length > 0
    }

    function isRowUpdating(rowId: number) {
      return updatingRowId.value === rowId
    }

    function isEditingCell(rowId: number, field: EditableCustomerField) {
      return activeEditCell.value?.rowId === rowId && activeEditCell.value?.field === field
    }

    function startEditingCell(rowId: number, field: EditableCustomerField) {
      activeEditCell.value = { rowId, field }
    }

    function stopEditingCell() {
      activeEditCell.value = null
    }

    function clearDraft(rowId: number) {
      const nextDrafts = { ...draftEdits.value }
      delete nextDrafts[rowId]
      draftEdits.value = nextDrafts
    }

    async function submitRowUpdate(rowId: number) {
      const patch = draftEdits.value[rowId]
      if (!patch || Object.keys(patch).length === 0) {
        return
      }

      updatingRowId.value = rowId

      try {
        await new Promise((resolve) => window.setTimeout(resolve, 300))
        savedEdits.value = {
          ...savedEdits.value,
          [rowId]: {
            ...(savedEdits.value[rowId] ?? {}),
            ...patch,
          },
        }
        clearDraft(rowId)
        stopEditingCell()
        lastUpdatedMessage.value = `Zaktualizowano wiersz ID ${rowId}.`
      } finally {
        updatingRowId.value = null
      }
    }

    const columns = buildColumns({
      getDraftValue,
      updateDraftValue,
      submitRowUpdate: (rowId) => {
        void submitRowUpdate(rowId)
      },
      isRowDirty,
      isRowUpdating,
      isEditingCell,
      startEditingCell,
      stopEditingCell,
    })

    async function fetchCustomersPage(
      params: DataGridFetchParams,
      signal?: AbortSignal,
    ): Promise<DataGridFetchResult<CustomerRow>> {
      const result = await fetchCustomers(params, signal)

      return {
        ...result,
        rows: result.rows.map((row) => ({
          ...row,
          segments: buildDefaultSegments(row),
          ...(savedEdits.value[row.id] ?? {}),
          ...(draftEdits.value[row.id] ?? {}),
        })),
      }
    }

    return () => (
      <MainLayout
        intro={{
          eyebrow: 'TanStack Data Grid',
          title: 'Server-side grid z virtualizacja wierszy i kolumn',
          description:
            'Demo pokazuje server-side pagination, sorting, filtering, ukrywanie kolumn, sticky header, pinned kolumny left/right, inline edycje komorek oraz zapis widokow gridu serializowanych do backendu.',
        }}
      >
        <section aria-labelledby="table-demo">
          <h3 id="table-demo">Demo gridu</h3>
          <p>
            Backend demo oczekuje pod <code>{backendBaseUrl}</code>. Uruchom PHP server z folderu{' '}
            <code>backend</code>.
          </p>
          <p>
            Zapisane widoki gridu sa serializowane do JSON i przechowywane po stronie backendu w
            pliku demo zamiast w <code>localStorage</code>.
          </p>
          <p>
            Kliknij komorke <code>Company / edit</code>, <code>Status / edit</code> albo{' '}
            <code>Segments / multi</code> albo <code>Visits / edit</code>, edytuj wartosc, potem
            kliknij <code>Aktualizuj</code> w tym samym wierszu.
            {lastUpdatedMessage.value ? ` ${lastUpdatedMessage.value}` : ''}
          </p>
          <DataGrid
            columns={columns}
            toolbarFilters={toolbarFilters}
            quickFilters={quickFilters}
            metaItems={metaItems}
            pageSizeConfig={pageSizeConfig}
            selectionPanelConfig={selectionPanelConfig}
            fetchPage={fetchCustomersPage}
            savedViewsPersistence={savedViewsPersistence}
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
                left: ['select', 'id', 'customerCode'],
                right: ['actions'],
              },
            }}
          />
        </section>
      </MainLayout>
    )
  },
})
