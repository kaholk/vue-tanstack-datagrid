import { shallowRef } from 'vue'
import type { RowData } from '@tanstack/vue-table'

export type DataGridInlineMutationStatus = 'pending' | 'error'

export type DataGridInlineMutationState = {
  status: DataGridInlineMutationStatus
  message?: string
}

export function useDataGridInlineMutation<TData extends RowData & { id: string | number }>() {
  const statuses = shallowRef<Record<string, DataGridInlineMutationState>>({})

  const getKey = (row: TData, field: string) => `${row.id}:${field}`

  const setStatus = (
    row: TData,
    field: string,
    status: DataGridInlineMutationStatus | null,
    message?: string,
  ) => {
    const key = getKey(row, field)
    const nextStatuses = { ...statuses.value }

    if (status === null) {
      delete nextStatuses[key]
    } else {
      nextStatuses[key] = message ? { status, message } : { status }
    }

    statuses.value = nextStatuses
  }

  const getStatus = (row: TData, field: string) => statuses.value[getKey(row, field)] ?? null

  return {
    statuses,
    getKey,
    getStatus,
    setStatus,
  }
}
