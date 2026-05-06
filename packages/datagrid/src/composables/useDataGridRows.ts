import { computed, watch, type ShallowRef } from 'vue'

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
  let indexedRows: TData[] | null = null
  let cachedRowIndexByKey = new Map<string, number>()

  function getRowKey(row: TData, index: number): string {
    const customId = options.rowId?.()?.(row, index)
    return String(customId ?? (row as { id?: DataGridRowId }).id ?? index)
  }

  function buildRowIndexByKey(rows: TData[]) {
    const nextIndexByKey = new Map<string, number>()
    rows.forEach((row, index) => {
      nextIndexByKey.set(getRowKey(row, index), index)
    })
    indexedRows = rows
    cachedRowIndexByKey = nextIndexByKey
    return nextIndexByKey
  }

  const rowIndexByKey = computed(() => {
    const rows = options.requestState.value.rows
    return rows === indexedRows ? cachedRowIndexByKey : buildRowIndexByKey(rows)
  })

  watch(
    () => options.requestState.value.rows,
    (rows) => {
      if (rows !== indexedRows) {
        buildRowIndexByKey(rows)
      }
    },
    { immediate: true },
  )

  function updateRow(rowId: DataGridRowId, updater: (row: TData) => TData): TData | null {
    const targetRowId = String(rowId)
    const rowIndex = rowIndexByKey.value.get(targetRowId) ?? -1

    if (rowIndex === -1) {
      return null
    }

    const currentRow = options.requestState.value.rows[rowIndex]
    if (!currentRow) {
      return null
    }

    const nextRows = [...options.requestState.value.rows]
    const nextRow = updater(currentRow)
    nextRows[rowIndex] = nextRow
    options.requestState.value = {
      ...options.requestState.value,
      rows: nextRows,
    }
    return nextRow
  }

  function patchRow(rowId: DataGridRowId, patch: Partial<TData>): TData | null {
    return updateRow(rowId, (currentRow) => ({ ...currentRow, ...patch }))
  }

  function patchRows(patches: Array<{ rowId: DataGridRowId; patch: Partial<TData> }>): TData[] {
    if (patches.length === 0) {
      return []
    }

    const nextRows = [...options.requestState.value.rows]
    const updatedRows: TData[] = []
    let changed = false

    for (const { rowId, patch } of patches) {
      const rowIndex = rowIndexByKey.value.get(String(rowId)) ?? -1
      const currentRow = nextRows[rowIndex]

      if (rowIndex === -1 || !currentRow) {
        continue
      }

      const nextRow = { ...currentRow, ...patch }
      nextRows[rowIndex] = nextRow
      updatedRows.push(nextRow)
      changed = true
    }

    if (changed) {
      options.requestState.value = {
        ...options.requestState.value,
        rows: nextRows,
      }
    }

    return updatedRows
  }

  function replaceRow(rowId: DataGridRowId, row: TData): TData | null {
    return updateRow(rowId, () => row)
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
