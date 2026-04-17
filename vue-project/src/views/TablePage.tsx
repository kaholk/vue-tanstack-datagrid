import { defineComponent } from 'vue'

import MainLayout from '@/layouts/MainLayout'
import DataGrid from '@/components/data-grid/DataGrid'
import type { DataGridColumn, DataGridFetchParams, DataGridFetchResult } from '@/types/data-grid'

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
  status: string
  visits: number
  progress: number
  score: number
  balance: number
  createdAt: string
} & Record<`extraCol${string}`, string>

const backendBaseUrl = import.meta.env.VITE_GRID_API_URL ?? 'http://127.0.0.1:8000'

const extraColumns: DataGridColumn<CustomerRow>[] = Array.from({ length: 30 }, (_, index) => {
  const columnId = `extraCol${String(index + 1).padStart(2, '0')}` as const

  return {
    id: columnId,
    accessorKey: columnId,
    header: `Extra ${String(index + 1).padStart(2, '0')}`,
    size: 140,
    serverField: columnId,
  }
})

const columns: DataGridColumn<CustomerRow>[] = [
  {
    id: 'select',
    header: ({ table }) => (
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
        disabled={!row.getCanSelect()}
        onChange={row.getToggleSelectedHandler()}
      />
    ),
    size: 56,
    align: 'center',
    headerMode: 'custom',
    showFilter: false,
    pickerLabel: 'Select',
    enableHiding: false,
    enablePinning: true,
  },
  {
    id: 'id',
    accessorKey: 'id',
    header: 'ID',
    size: 120,
    align: 'end',
    enableHiding: false,
    enablePinning: true,
    serverField: 'id',
  },
  {
    id: 'customerCode',
    accessorKey: 'customerCode',
    header: 'Code',
    size: 120,
    enablePinning: true,
    serverField: 'customerCode',
  },
  {
    id: 'firstName',
    accessorKey: 'firstName',
    header: 'First Name',
    size: 150,
    enablePinning: true,
    serverField: 'firstName',
  },
  {
    id: 'lastName',
    accessorKey: 'lastName',
    header: 'Last Name',
    size: 150,
    serverField: 'lastName',
  },
  {
    id: 'email',
    accessorKey: 'email',
    header: 'Email',
    size: 260,
    serverField: 'email',
  },
  {
    id: 'company',
    accessorKey: 'company',
    header: 'Company',
    size: 180,
    serverField: 'company',
  },
  {
    id: 'city',
    accessorKey: 'city',
    header: 'City',
    size: 150,
    serverField: 'city',
  },
  {
    id: 'country',
    accessorKey: 'country',
    header: 'Country',
    size: 140,
    serverField: 'country',
  },
  {
    id: 'department',
    accessorKey: 'department',
    header: 'Department',
    size: 150,
    serverField: 'department',
  },
  {
    id: 'plan',
    accessorKey: 'plan',
    header: 'Plan',
    size: 120,
    serverField: 'plan',
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    size: 120,
    align: 'center',
    serverField: 'status',
    cell: ({ getValue }) => <span class="data-grid__badge">{String(getValue())}</span>,
  },
  {
    id: 'visits',
    accessorKey: 'visits',
    header: 'Visits',
    size: 110,
    align: 'end',
    serverField: 'visits',
  },
  {
    id: 'progress',
    accessorKey: 'progress',
    header: 'Progress',
    size: 120,
    align: 'end',
    serverField: 'progress',
    cell: ({ getValue }) => `${getValue<number>()}%`,
  },
  {
    id: 'score',
    accessorKey: 'score',
    header: 'Score',
    size: 110,
    align: 'end',
    serverField: 'score',
  },
  {
    id: 'balance',
    accessorKey: 'balance',
    header: 'Balance',
    size: 130,
    align: 'end',
    serverField: 'balance',
    cell: ({ getValue }) => `${Number(getValue<number>()).toFixed(2)} PLN`,
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: 'Created',
    size: 140,
    serverField: 'createdAt',
  },
  ...extraColumns,
  {
    id: 'scoreBand',
    header: 'Score Band',
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
    enableHiding: false,
    enablePinning: true,
    requiredServerFields: ['customerCode', 'email'],
    cell: ({ row }) => (
      <div class="data-grid__actions">
        <button type="button" onClick={() => window.alert(`Preview ${row.original.customerCode}`)}>
          Preview
        </button>
        <button type="button" onClick={() => window.alert(`Open ${row.original.email}`)}>
          Open
        </button>
      </div>
    ),
  },
]

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

export default defineComponent({
  name: 'TablePage',
  setup() {
    return () => (
      <MainLayout
        intro={{
          eyebrow: 'TanStack Data Grid',
          title: 'Server-side grid z virtualizacja wierszy i kolumn',
          description:
            'Demo pokazuje server-side pagination, sorting, filtering, ukrywanie kolumn, sticky header oraz pinned kolumny left/right.',
        }}
      >
        <section aria-labelledby="table-demo">
          <h3 id="table-demo">Demo gridu</h3>
          <p>
            Backend demo oczekuje pod <code>{backendBaseUrl}</code>. Uruchom PHP server z folderu{' '}
            <code>backend</code>.
          </p>
          <DataGrid
            columns={columns}
            fetchPage={fetchCustomers}
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
