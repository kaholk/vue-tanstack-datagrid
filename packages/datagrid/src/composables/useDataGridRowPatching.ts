import type { Ref } from 'vue'
import type { RowData } from '@tanstack/vue-table'
import type { DataGridInstance, DataGridRowId, DataGridRowPatchOptions } from '../types'
import { mergeDataGridRowPatch } from '../utils/rowPatch'

export type DataGridRowPatchingOptions<TData extends RowData> = {
  dataGridRef: Ref<DataGridInstance<TData> | null>
  getRowId?: (row: TData) => DataGridRowId
}

export function useDataGridRowPatching<TData extends RowData & { id?: DataGridRowId }>(
  options: DataGridRowPatchingOptions<TData>,
) {
  const getRowId = options.getRowId ?? ((row: TData) => row.id as DataGridRowId)

  function patchVisibleRow(
    row: TData,
    patch: Partial<TData>,
    patchOptions?: DataGridRowPatchOptions<TData>,
  ): TData {
    return (
      options.dataGridRef.value?.patchRow(getRowId(row), patch, patchOptions) ??
      mergeDataGridRowPatch(row, patch, patchOptions)
    )
  }

  async function refreshData() {
    options.dataGridRef.value?.refreshData()
  }

  return {
    patchVisibleRow,
    refreshData,
  }
}
