import { computed, type ShallowRef } from 'vue'

import type { DataGridRowId, DataGridRowIdResolver } from '../types'

type AnyRow = Record<string, unknown>

export type DataGridRequestState<TData extends AnyRow> = {
  rows: TData[]
  totalRows: number
  pageCount: number
  meta?: Record<string, unknown>
}

type UseDataGridRowsOptions<TData extends AnyRow> = {
  requestState: ShallowRef<DataGridRequestState<TData>>
  rowId?: () => DataGridRowIdResolver<TData> | undefined
}

export function useDataGridRows<TData extends AnyRow>(options: UseDataGridRowsOptions<TData>) {
  function getRowKey(row: TData, index: number): string {
    const customId = options.rowId?.()?.(row, index)
    return String(customId ?? (row as { id?: DataGridRowId }).id ?? index)
  }

  const rowIndexByKey = computed(() => {
    const indexByKey = new Map<string, number>()
    options.requestState.value.rows.forEach((row, index) => {
      indexByKey.set(getRowKey(row, index), index)
    })
    return indexByKey
  })

  function updateRow(rowId: DataGridRowId, updater: (row: TData) => TData) {
    const targetRowId = String(rowId)
    const rowIndex = rowIndexByKey.value.get(targetRowId) ?? -1

    if (rowIndex === -1) {
      return
    }

    const currentRow = options.requestState.value.rows[rowIndex]
    if (!currentRow) {
      return
    }

    const nextRows = [...options.requestState.value.rows]
    nextRows[rowIndex] = updater(currentRow)
    options.requestState.value = {
      ...options.requestState.value,
      rows: nextRows,
    }
  }

  function patchRow(rowId: DataGridRowId, patch: Partial<TData>) {
    updateRow(rowId, (currentRow) => ({ ...currentRow, ...patch }))
  }

  function patchRows(patches: Array<{ rowId: DataGridRowId; patch: Partial<TData> }>) {
    if (patches.length === 0) {
      return
    }

    const nextRows = [...options.requestState.value.rows]
    let changed = false

    for (const { rowId, patch } of patches) {
      const rowIndex = rowIndexByKey.value.get(String(rowId)) ?? -1
      const currentRow = nextRows[rowIndex]

      if (rowIndex === -1 || !currentRow) {
        continue
      }

      nextRows[rowIndex] = { ...currentRow, ...patch }
      changed = true
    }

    if (changed) {
      options.requestState.value = {
        ...options.requestState.value,
        rows: nextRows,
      }
    }
  }

  function replaceRow(rowId: DataGridRowId, row: TData) {
    updateRow(rowId, () => row)
  }

  function getRow(rowId: DataGridRowId) {
    const rowIndex = rowIndexByKey.value.get(String(rowId)) ?? -1
    return options.requestState.value.rows[rowIndex] ?? null
  }

  function getVisibleRows() {
    return [...options.requestState.value.rows]
  }

  return {
    getRowKey,
    rowIndexByKey,
    patchRow,
    patchRows,
    updateRow,
    replaceRow,
    getRow,
    getVisibleRows,
  }
}
